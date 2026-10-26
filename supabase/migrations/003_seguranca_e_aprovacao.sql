-- =====================================================================
-- Migração 003 — segurança de acesso + aprovação de novos usuários
--
-- Rode UMA vez no SQL Editor do Supabase (cole tudo e clique em Run).
-- É seguro rodar de novo: tudo aqui é idempotente.
-- NÃO apaga nem altera contas, categorias ou meses.
--
-- Corrige dois problemas do desenho original:
--  1) Qualquer pessoa com o link do app podia criar conta e, por causa da
--     política "qualquer autenticado vê tudo", ler e editar TODAS as contas.
--     Agora só usuários APROVADOS por um admin enxergam os dados.
--  2) A política "profiles: user can update own" deixava qualquer usuário
--     mudar o PRÓPRIO papel para 'admin'. Agora o usuário só altera o
--     próprio nome; papel e aprovação mudam só via funções de admin.
-- =====================================================================

-- 1) Coluna "approved". Quem já existe fica aprovado (ninguém é trancado
--    para fora); novos cadastros passam a nascer NÃO aprovados.
alter table public.profiles add column if not exists approved boolean not null default true;
alter table public.profiles alter column approved set default false;

-- 2) Funções auxiliares (security definer evita recursão nas políticas)
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and approved);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and approved and role = 'admin');
$$;

revoke all on function public.is_approved() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- 3) Novo usuário: o primeiro vira admin já aprovado; os demais ficam pendentes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
begin
  select count(*) = 0 into first_user from public.profiles;
  insert into public.profiles (id, name, role, approved)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 120),
    case when first_user then 'admin' else 'membro' end,
    first_user
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4) Dados: só usuários aprovados
drop policy if exists "tags: authenticated full access" on public.tags;
drop policy if exists "tags: approved full access" on public.tags;
create policy "tags: approved full access" on public.tags
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

drop policy if exists "bills: authenticated full access" on public.bills;
drop policy if exists "bills: approved full access" on public.bills;
create policy "bills: approved full access" on public.bills
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

drop policy if exists "months: authenticated full access" on public.months;
drop policy if exists "months: approved full access" on public.months;
create policy "months: approved full access" on public.months
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

-- 5) Perfis: cada um vê o próprio; aprovados veem todos (lista de usuários do admin)
drop policy if exists "profiles: authenticated can view" on public.profiles;
drop policy if exists "profiles: view own or approved" on public.profiles;
create policy "profiles: view own or approved" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_approved());

-- 6) Perfis: o usuário só pode trocar o PRÓPRIO NOME (papel/aprovação ficam bloqueados)
drop policy if exists "profiles: user can update own" on public.profiles;
drop policy if exists "profiles: admin can update any" on public.profiles;
drop policy if exists "profiles: user can update own name" on public.profiles;
create policy "profiles: user can update own name" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

-- 7) Ações de administrador, como funções (verificam se quem chama é admin)
create or replace function public.admin_set_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.' using errcode = '42501'; end if;
  if new_role not in ('admin', 'membro') then raise exception 'Papel inválido.'; end if;
  if target = auth.uid() then raise exception 'Você não pode alterar o próprio papel.'; end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

create or replace function public.admin_set_approved(target uuid, ok boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.' using errcode = '42501'; end if;
  if target = auth.uid() then raise exception 'Você não pode alterar o próprio acesso.'; end if;
  update public.profiles set approved = ok where id = target;
end;
$$;

-- Remove o usuário por completo (conta de login + perfil). Não mexe nas contas financeiras.
create or replace function public.admin_remove_member(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores.' using errcode = '42501'; end if;
  if target = auth.uid() then raise exception 'Você não pode remover a si mesmo.'; end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
revoke all on function public.admin_set_approved(uuid, boolean) from public;
revoke all on function public.admin_remove_member(uuid) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_approved(uuid, boolean) to authenticated;
grant execute on function public.admin_remove_member(uuid) to authenticated;

-- 8) Mantém updated_at das contas em dia (a coluna existia, mas nunca era atualizada)
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bills_touch_updated_at on public.bills;
create trigger bills_touch_updated_at
  before update on public.bills
  for each row execute function public.touch_updated_at();

-- Conferência (opcional): todos os usuários atuais devem aparecer com approved = true
-- select name, role, approved from public.profiles;
