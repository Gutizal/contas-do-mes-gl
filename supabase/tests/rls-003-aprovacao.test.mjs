// Teste de segurança da migração 003: aprovação de usuários, escalonamento de privilégio e funções de admin.
// Roda num Postgres embutido (PGlite) com um "auth" simulado: npm run test:sql
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const R = new URL("../", import.meta.url).pathname;
const db = new PGlite();
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
// simulação mínima do Supabase: roles, schema auth, auth.uid() lido de uma config de sessão
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon; grant usage on schema public to authenticated, anon;
`);
await db.exec(fs.readFileSync(R + "schema.sql", "utf8"));
await db.exec(fs.readFileSync(R + "schema_part2.sql", "utf8"));
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);

// estado "antes da migração": 2 usuários existentes (admin + membro) e dados
const A = "00000000-0000-0000-0000-00000000000a", M = "00000000-0000-0000-0000-00000000000b";
await db.exec(`insert into auth.users (id,email) values ('${A}','a@x.com'),('${M}','m@x.com');`);
const before = (await db.query("select name, role from public.profiles order by created_at, name")).rows;
ok(before.length === 2 && before.filter(r => r.role === "admin").length === 1, "antes: 1º usuário é admin, 2º membro");
await db.exec(`insert into public.tags (id,tab,name) values ('11111111-1111-1111-1111-111111111111','pessoal','G');
  insert into public.bills (tab,month_key,description,value) values ('pessoal','2026-10','Aluguel',1800);`);

// aplica a migração duas vezes (idempotência)
const mig = fs.readFileSync(R + "migrations/003_seguranca_e_aprovacao.sql", "utf8");
await db.exec(mig); await db.exec(mig);
ok(true, "migração 003 aplicou 2x sem erro (idempotente)");
const after = (await db.query("select name, role, approved from public.profiles")).rows;
ok(after.every(r => r.approved === true), "usuários existentes continuam aprovados");
ok((await db.query("select count(*)::int n from public.bills")).rows[0].n === 1, "dados existentes intactos");

// helper: roda como usuário autenticado
const as = async (uid, fn) => { await db.exec(`set role authenticated; select set_config('request.uid','${uid}',false);`); try { return await fn(); } finally { await db.exec(`reset role;`); } };
const tryq = async (q) => { try { return { rows: (await db.query(q)).rows }; } catch (e) { return { err: e.message }; } };

// novo cadastro: nasce pendente
const N = "00000000-0000-0000-0000-00000000000c";
await db.exec(`insert into auth.users (id,email,raw_user_meta_data) values ('${N}','n@x.com','{"full_name":"Novo Google"}');`);
const np = (await db.query(`select name, role, approved from public.profiles where id='${N}'`)).rows[0];
ok(np.approved === false && np.role === "membro", "novo cadastro nasce membro e NÃO aprovado");
ok(np.name === "Novo Google", "nome vem do full_name (login Google)");

// pendente não enxerga dados
ok((await as(N, () => tryq("select * from public.bills"))).rows.length === 0, "usuário pendente NÃO vê contas (RLS)");
ok((await as(N, () => tryq("insert into public.bills (tab,month_key) values ('pessoal','2026-10')"))).err?.includes("row-level security"), "usuário pendente NÃO consegue inserir");
ok((await as(N, () => tryq("select id from public.profiles"))).rows.length === 1, "pendente só vê o próprio perfil");

// aprovado vê
ok((await as(M, () => tryq("select * from public.bills"))).rows.length === 1, "membro aprovado vê as contas");

// escalonamento de privilégio bloqueado
const esc = await as(M, () => tryq(`update public.profiles set role='admin' where id='${M}'`));
ok(!!esc.err, "membro NÃO consegue virar admin por update direto: " + (esc.err || "").slice(0, 50));
const esc2 = await as(N, () => tryq(`update public.profiles set approved=true where id='${N}'`));
ok(!!esc2.err, "pendente NÃO consegue se auto-aprovar: " + (esc2.err || "").slice(0, 50));
ok(!(await as(M, () => tryq(`update public.profiles set name='Novo Nome' where id='${M}'`))).err, "usuário ainda pode trocar o próprio nome");

// funções de admin
ok(!!(await as(M, () => tryq(`select public.admin_set_approved('${N}', true)`))).err, "membro NÃO pode aprovar ninguém");
ok(!(await as(A, () => tryq(`select public.admin_set_approved('${N}', true)`))).err, "admin aprova usuário");
ok((await db.query(`select approved from public.profiles where id='${N}'`)).rows[0].approved === true, "aprovação gravada");
ok((await as(N, () => tryq("select * from public.bills"))).rows.length === 1, "após aprovação o usuário passa a ver as contas");
ok(!(await as(A, () => tryq(`select public.admin_set_role('${N}', 'admin')`))).err, "admin promove usuário");
ok(!!(await as(A, () => tryq(`select public.admin_set_role('${A}', 'membro')`))).err, "admin não pode rebaixar a si mesmo");
ok(!!(await as(A, () => tryq(`select public.admin_set_approved('${A}', false)`))).err, "admin não pode bloquear a si mesmo");
ok(!(await as(A, () => tryq(`select public.admin_remove_member('${M}')`))).err, "admin remove usuário");
ok((await db.query(`select count(*)::int n from public.profiles where id='${M}'`)).rows[0].n === 0, "perfil removido em cascata");
ok((await db.query("select count(*)::int n from public.bills")).rows[0].n === 1, "remover usuário não apaga as contas");

// updated_at
await db.exec(`update public.bills set description='Aluguel 2'`);
const ts = (await db.query("select updated_at > created_at as t from public.bills")).rows[0].t;
ok(ts === true, "trigger atualiza updated_at");
// anon sem acesso
await db.exec(`grant select on public.bills to anon; set role anon;`);
ok((await tryq("select * from public.bills")).rows?.length === 0, "anônimo não vê nada");
await db.exec("reset role");
console.log(fails ? `\n${fails} FALHAS` : "\nSQL OK");
process.exit(fails ? 1 : 0);
