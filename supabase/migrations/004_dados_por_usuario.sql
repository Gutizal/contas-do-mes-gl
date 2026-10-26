-- =====================================================================
-- Migração 004 — dados por usuário, espaços compartilhados e admin com acesso total
--
-- Rode DEPOIS da 003, no SQL Editor do Supabase (cole tudo e clique em Run).
-- É idempotente. NÃO apaga dados: tudo o que já existe passa a pertencer ao
-- primeiro administrador, e os usuários que já usavam o app continuam
-- enxergando esses dados (espaço compartilhado com eles).
--
-- Regras depois desta migração:
--  * cada pessoa tem o próprio espaço (contas, categorias e meses);
--  * o admin enxerga e edita o espaço de qualquer pessoa;
--  * o admin pode COMPARTILHAR o próprio espaço com outras pessoas (casal,
--    sócios): quem recebe o acesso vê e edita o espaço dele, e continua com o
--    próprio espaço separado.
-- =====================================================================

-- 1) Coluna de dono em contas, categorias e meses. O que já existe fica com o 1º admin.
--    Na primeira execução, quem já usava o app ganha acesso ao espaço do admin (como era antes).
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from public.profiles where role = 'admin' order by created_at limit 1;
  if admin_id is null then
    raise exception 'Nenhum administrador encontrado em public.profiles. Marque um admin antes (veja o README).';
  end if;

  alter table public.tags   add column if not exists owner_id uuid references auth.users(id) on delete cascade;
  alter table public.bills  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
  alter table public.months add column if not exists owner_id uuid references auth.users(id) on delete cascade;

  update public.tags   set owner_id = admin_id where owner_id is null;
  update public.bills  set owner_id = admin_id where owner_id is null;
  update public.months set owner_id = admin_id where owner_id is null;

  -- Compartilhamentos: criados só na 1ª vez, para não "desfazer" um acesso que o admin removeu depois.
  if to_regclass('public.space_members') is null then
    create table public.space_members (
      owner_id uuid not null references auth.users(id) on delete cascade,
      member_id uuid not null references auth.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (owner_id, member_id),
      check (owner_id <> member_id)
    );
    insert into public.space_members (owner_id, member_id)
      select admin_id, p.id from public.profiles p where p.approved and p.id <> admin_id
      on conflict do nothing;
  end if;
end $$;

alter table public.tags   alter column owner_id set not null;
alter table public.bills  alter column owner_id set not null;
alter table public.months alter column owner_id set not null;

-- Quem não informa o dono grava no próprio nome (compatível com a versão antiga do app).
alter table public.tags   alter column owner_id set default auth.uid();
alter table public.bills  alter column owner_id set default auth.uid();
alter table public.months alter column owner_id set default auth.uid();

-- 2) "months" passa a ter chave por dono (duas pessoas podem abrir o mesmo mês)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.months'::regclass and c.contype = 'p' and a.attname = 'owner_id'
  ) then
    alter table public.months drop constraint months_pkey;
    alter table public.months add primary key (owner_id, tab, month_key);
  end if;
end $$;

create index if not exists bills_owner_tab_month_idx on public.bills (owner_id, tab, month_key);
create index if not exists tags_owner_idx on public.tags (owner_id);
create index if not exists space_members_member_idx on public.space_members (member_id);

-- 3) Uma conta só pode usar categoria do MESMO dono
create or replace function public.check_bill_tag_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tag_id is not null and not exists (
    select 1 from public.tags t where t.id = new.tag_id and t.owner_id = new.owner_id
  ) then
    raise exception 'A categoria pertence a outro usuário.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists bills_check_tag_owner on public.bills;
create trigger bills_check_tag_owner
  before insert or update of tag_id, owner_id on public.bills
  for each row execute function public.check_bill_tag_owner();

-- 4) Quem pode acessar um espaço: o dono (aprovado), quem recebeu acesso (aprovado) e o admin
create or replace function public.can_access_space(space_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or (
        public.is_approved()
        and (
          space_owner = auth.uid()
          or exists (select 1 from public.space_members sm where sm.owner_id = space_owner and sm.member_id = auth.uid())
        )
      );
$$;

revoke all on function public.can_access_space(uuid) from public, anon;
grant execute on function public.can_access_space(uuid) to authenticated;

-- 5) Regras de acesso aos dados
drop policy if exists "tags: approved full access" on public.tags;
drop policy if exists "tags: owner or admin" on public.tags;
drop policy if exists "tags: space access" on public.tags;
create policy "tags: space access" on public.tags
  for all to authenticated
  using (public.can_access_space(owner_id))
  with check (public.can_access_space(owner_id));

drop policy if exists "bills: approved full access" on public.bills;
drop policy if exists "bills: owner or admin" on public.bills;
drop policy if exists "bills: space access" on public.bills;
create policy "bills: space access" on public.bills
  for all to authenticated
  using (public.can_access_space(owner_id))
  with check (public.can_access_space(owner_id));

drop policy if exists "months: approved full access" on public.months;
drop policy if exists "months: owner or admin" on public.months;
drop policy if exists "months: space access" on public.months;
create policy "months: space access" on public.months
  for all to authenticated
  using (public.can_access_space(owner_id))
  with check (public.can_access_space(owner_id));

-- Perfis: cada um vê o próprio; vê também quem compartilhou espaço com ele; o admin vê todos
drop policy if exists "profiles: view own or approved" on public.profiles;
drop policy if exists "profiles: view own or admin" on public.profiles;
drop policy if exists "profiles: view own or shared" on public.profiles;
create policy "profiles: view own or shared" on public.profiles
  for select to authenticated using (id = auth.uid() or public.can_access_space(id));

-- Compartilhamentos: cada pessoa envolvida enxerga o seu; só o admin cria e remove
alter table public.space_members enable row level security;
revoke all on public.space_members from anon;
grant select, insert, update, delete on public.space_members to authenticated;

drop policy if exists "space_members: involved can view" on public.space_members;
create policy "space_members: involved can view" on public.space_members
  for select to authenticated using (owner_id = auth.uid() or member_id = auth.uid() or public.is_admin());

drop policy if exists "space_members: admin manage" on public.space_members;
create policy "space_members: admin manage" on public.space_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6) Funções de admin: nunca executáveis por visitante sem login
revoke execute on function public.is_approved() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.admin_set_role(uuid, text) from anon;
revoke execute on function public.admin_set_approved(uuid, boolean) from anon;
revoke execute on function public.admin_remove_member(uuid) from anon;
revoke execute on function public.check_bill_tag_owner() from anon, authenticated;

-- Atenção: remover um usuário (admin_remove_member) apaga também as contas,
-- categorias e meses dele e os compartilhamentos (on delete cascade).

-- Conferência (opcional):
-- select owner_id, count(*) from public.bills group by owner_id;     -- tudo com o id do admin
-- select * from public.space_members;                                -- admin -> cada usuário que já existia
