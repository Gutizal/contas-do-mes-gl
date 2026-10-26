// Teste das migrações 003+004+005: dados por usuário, espaços compartilhados, acesso do admin e validações do banco.
// Roda num Postgres embutido (PGlite) com um "auth" simulado: npm run test:sql
import { PGlite } from "@electric-sql/pglite"; import fs from "node:fs";
const R = new URL("../", import.meta.url).pathname;
const db = new PGlite();
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
 create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
 grant usage on schema auth, public to authenticated, anon;`);
await db.exec(fs.readFileSync(R + "schema.sql", "utf8")); await db.exec(fs.readFileSync(R + "schema_part2.sql", "utf8"));
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
const A = "00000000-0000-0000-0000-00000000000a", M = "00000000-0000-0000-0000-00000000000b", N = "00000000-0000-0000-0000-00000000000c", X = "00000000-0000-0000-0000-00000000000d";
const TA = "11111111-1111-1111-1111-111111111111", TM = "22222222-2222-2222-2222-222222222222", TX = "44444444-4444-4444-4444-444444444444";
// dados ANTIGOS (antes de existir dono): o app era compartilhado por 2 pessoas
await db.exec(`insert into auth.users (id,email) values ('${A}','a@x.com'),('${M}','m@x.com');`);
await db.exec(`insert into public.tags (id,tab,name,color) values ('${TA}','pessoal','Gustavo','blue');
 insert into public.bills (tab,month_key,description,value,tag_id) values ('pessoal','2026-10','Aluguel',1800,'${TA}'),('empresa','2026-10','Contador',600,null);
 insert into public.months (tab,month_key) values ('pessoal','2026-10'),('empresa','2026-10');`);
// cenário real do projeto: nenhum admin marcado ainda -> a 004 deve recusar com mensagem clara
await db.exec(`update public.profiles set role='membro'`);
const m003 = fs.readFileSync(R + "migrations/003_seguranca_e_aprovacao.sql", "utf8"), m004 = fs.readFileSync(R + "migrations/004_dados_por_usuario.sql", "utf8"), m005 = fs.readFileSync(R + "migrations/005_validacao_de_dados.sql", "utf8");
await db.exec(m003);
let msg = ""; try { await db.exec(m004); } catch (e) { msg = e.message; }
ok(/Nenhum administrador encontrado/.test(msg), "sem admin: a 004 recusa com mensagem clara");
ok((await db.query(`select count(*)::int n from information_schema.columns where table_name='bills' and column_name='owner_id'`)).rows[0].n === 0, "…e não altera nada (falha antes de mexer nas tabelas)");
await db.exec(`update public.profiles set role='admin' where id='${A}'`);
await db.exec(m004); await db.exec(m004); await db.exec(m005); await db.exec(m005);
ok(true, "004 e 005 aplicadas 2x cada, sem erro (idempotentes)");
const q = async (s) => (await db.query(s)).rows;
const as = async (uid, fn) => { await db.exec(`set role authenticated; select set_config('request.uid','${uid}',false);`); try { return await fn(); } finally { await db.exec(`reset role;`); } };
const t = async (s) => { try { return { rows: (await db.query(s)).rows }; } catch (e) { return { err: e.message }; } };

// ---- migração dos dados ----
ok((await q(`select count(*)::int n from public.bills where owner_id='${A}'`))[0].n === 2, "dados antigos: 2 contas passaram a ser do admin (nenhuma perdida)");
ok((await q(`select count(*)::int n from public.tags where owner_id='${A}'`))[0].n === 1 && (await q(`select count(*)::int n from public.months where owner_id='${A}'`))[0].n === 2, "categorias e meses antigos também são do admin");
ok((await q(`select count(*)::int n from public.space_members where owner_id='${A}' and member_id='${M}'`))[0].n === 1, "quem já usava o app (esposa) ganhou acesso ao espaço do admin na migração");

// ---- espaço compartilhado: M tem acesso ao espaço de A ----
ok((await as(M, () => t("select * from public.bills"))).rows.length === 2, "membro com acesso compartilhado vê as contas do admin (como antes)");
ok((await as(M, () => t("select * from public.tags"))).rows.length === 1 && (await as(M, () => t("select * from public.months"))).rows.length === 2, "…e as categorias e meses");
ok(!(await as(M, () => t(`insert into public.bills (owner_id,tab,month_key,description,value,tag_id) values ('${A}','pessoal','2026-10','Internet',120,'${TA}')`))).err, "membro cria conta no espaço compartilhado (dono = admin)");
ok(!(await as(M, () => t(`update public.bills set value=125 where description='Internet'`))).err && (await q(`select value from public.bills where description='Internet'`))[0].value == 125, "membro edita conta do espaço compartilhado");
ok(!(await as(M, () => t(`insert into public.months (owner_id,tab,month_key) values ('${A}','pessoal','2026-11')`))).err, "membro abre mês no espaço compartilhado");
ok(!(await as(M, () => t(`delete from public.bills where description='Internet'`))).err && (await q(`select count(*)::int n from public.bills where description='Internet'`))[0].n === 0, "membro apaga conta do espaço compartilhado");
// espaço PRÓPRIO do membro continua separado
ok(!(await as(M, () => t(`insert into public.tags (id,tab,name,color) values ('${TM}','pessoal','Amanda','rose')`))).err, "membro cria categoria no próprio espaço (padrão: dono = ele)");
ok(!(await as(M, () => t(`insert into public.bills (tab,month_key,description,value,tag_id) values ('pessoal','2026-10','Academia',130,'${TM}')`))).err, "membro cria conta no próprio espaço");
ok((await as(M, () => t(`select * from public.bills where owner_id='${M}'`))).rows.length === 1, "o espaço próprio do membro tem só a conta dele");
ok(!!(await as(M, () => t(`insert into public.bills (owner_id,tab,month_key,tag_id) values ('${A}','pessoal','2026-10','${TM}')`))).err, "conta de um espaço não pode usar categoria de outro (trigger)");
ok((await as(M, () => t("select id from public.profiles"))).rows.length === 2, "membro vê o próprio perfil e o de quem compartilhou com ele");

// ---- gestão dos acessos: só admin ----
await db.exec(`insert into auth.users (id,email) values ('${X}','x@x.com');`); await db.exec(`update public.profiles set approved=true where id='${X}'`);
ok(!!(await as(M, () => t(`insert into public.space_members (owner_id, member_id) values ('${M}','${X}')`))).err, "membro NÃO consegue compartilhar espaço (só admin)");
ok(!!(await as(X, () => t(`insert into public.space_members (owner_id, member_id) values ('${A}','${X}')`))).err, "usuário comum NÃO consegue se dar acesso ao espaço do admin");
// X: aprovado, sem compartilhamento -> isolado
ok((await as(X, () => t("select * from public.bills"))).rows.length === 0, "usuário aprovado SEM compartilhamento NÃO vê o espaço do admin");
ok(!!(await as(X, () => t(`insert into public.bills (owner_id,tab,month_key) values ('${A}','pessoal','2026-10')`))).err, "…nem grava nele");
ok((await as(X, () => t("select id from public.profiles"))).rows.length === 1, "…e só vê o próprio perfil");
ok((await as(X, () => t(`select * from public.space_members`))).rows.length === 0, "…e não vê compartilhamentos alheios");
// admin concede e remove
ok(!(await as(A, () => t(`insert into public.space_members (owner_id, member_id) values ('${A}','${X}')`))).err, "admin compartilha o espaço com X");
ok((await as(X, () => t("select * from public.bills"))).rows.length === 2, "X passa a ver o espaço do admin");
ok(!(await as(A, () => t(`delete from public.space_members where member_id='${X}'`))).err && (await as(X, () => t("select * from public.bills"))).rows.length === 0, "admin remove o acesso e X deixa de ver na hora");
// reexecutar a 004 NÃO recria um acesso removido
await db.exec(`delete from public.space_members where member_id='${M}'`); await db.exec(m004);
ok((await q(`select count(*)::int n from public.space_members where member_id='${M}'`))[0].n === 0, "rodar a 004 de novo NÃO devolve um acesso que o admin removeu");
ok((await as(M, () => t(`select * from public.bills where owner_id='${A}'`))).rows.length === 0, "sem o acesso, o membro não vê mais o espaço do admin");
await db.exec(`insert into public.space_members (owner_id, member_id) values ('${A}','${M}')`);

// ---- pendente ----
await db.exec(`insert into auth.users (id,email) values ('${N}','n@x.com');`);
await db.exec(`insert into public.space_members (owner_id, member_id) values ('${A}','${N}')`);
ok((await as(N, () => t("select * from public.bills"))).rows.length === 0, "usuário PENDENTE não vê nada, mesmo com compartilhamento");
ok(!!(await as(N, () => t(`insert into public.bills (tab,month_key) values ('pessoal','2026-10')`))).err, "usuário pendente não grava nem no próprio espaço");

// ---- admin: acesso total ----
ok((await as(A, () => t("select * from public.bills"))).rows.length === 3, "admin vê as contas de todos (2 dele + 1 da esposa)");
ok(!(await as(A, () => t(`insert into public.bills (owner_id,tab,month_key,description) values ('${X}','pessoal','2026-11','Criada pelo admin')`))).err, "admin cria conta no espaço de outra pessoa");
ok(!(await as(A, () => t(`update public.bills set value=99 where owner_id='${M}' and description='Academia'`))).err && (await q(`select value from public.bills where description='Academia'`))[0].value == 99, "admin edita contas de outra pessoa");
ok(!(await as(A, () => t(`delete from public.bills where owner_id='${X}'`))).err, "admin apaga contas de outra pessoa");
await as(A, () => t(`delete from public.bills where owner_id='${M}' and tab='pessoal' and month_key='2026-10'`));
ok((await q(`select count(*)::int n from public.bills where owner_id='${A}'`))[0].n === 2, "excluir o mês de uma pessoa (filtrado por dono) não toca nos dados do admin");

// ---- validações ----
const ins = (cols, vals) => as(A, () => t(`insert into public.bills (tab,month_key,${cols}) values ('pessoal','2026-10',${vals})`));
ok(!!(await as(A, () => t(`insert into public.bills (tab,month_key) values ('pessoal','abc')`))).err, "mês com formato inválido é rejeitado");
ok(!!(await as(A, () => t(`insert into public.bills (tab,month_key) values ('pessoal','2026-13')`))).err, "mês 13 é rejeitado");
ok(!!(await ins("description", `'${"x".repeat(201)}'`)).err && !(await ins("description", `'${"x".repeat(200)}'`)).err, "descrição: 201 caracteres rejeita, 200 aceita");
ok(!!(await ins("value", "1000000000000")).err && !(await ins("value", "-50.25")).err, "valor absurdo rejeitado; estorno pequeno aceito");
ok(!!(await ins("installments_left", "9999")).err && !(await ins("installments_left", "12")).err, "parcelas: fora da faixa rejeita, válidas aceitam");
ok(!!(await as(A, () => t(`insert into public.tags (tab,name,color) values ('pessoal','x','red')`))).err, "cor fora da paleta é rejeitada");
ok(!(await as(A, () => t(`insert into public.tags (tab,name,color) values ('pessoal','','pink')`))).err, "nome de categoria vazio (durante a digitação) é aceito");
ok(!!(await as(A, () => t(`insert into public.tags (tab,name,color) values ('pessoal','${"y".repeat(41)}','pink')`))).err, "nome de categoria com 41 caracteres é rejeitado");

// ---- funções e cascata ----
ok((await q(`select has_function_privilege('anon','public.admin_set_role(uuid,text)','execute') a, has_function_privilege('anon','public.can_access_space(uuid)','execute') b`))[0].a === false && (await q(`select has_function_privilege('anon','public.can_access_space(uuid)','execute') b`))[0].b === false, "anon NÃO executa funções de admin nem de acesso");
await db.exec(`grant select on public.space_members to anon; set role anon;`);
ok((await t("select * from public.space_members")).rows?.length === 0, "visitante sem login não vê compartilhamentos"); await db.exec("reset role");
const antes = (await q(`select count(*)::int n from public.bills where owner_id='${A}'`))[0].n;
await as(A, () => t(`select public.admin_remove_member('${M}')`));
ok((await q(`select count(*)::int n from public.bills where owner_id='${M}'`))[0].n === 0 && (await q(`select count(*)::int n from public.space_members where member_id='${M}'`))[0].n === 0, "remover usuário apaga os dados DELE e os compartilhamentos dele");
ok((await q(`select count(*)::int n from public.bills where owner_id='${A}'`))[0].n === antes, `…e preserva os dados do admin (${antes} contas)`);
console.log(fails ? `\n${fails} FALHAS` : "\nSQL OK");
process.exit(fails ? 1 : 0);
