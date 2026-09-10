-- Perfis: um por usuário autenticado, guarda nome e papel (admin/membro)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'membro' check (role in ('admin', 'membro')),
  created_at timestamptz not null default now()
);

-- Categorias de "quem paga", por aba (pessoal/empresa)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('pessoal', 'empresa')),
  name text not null,
  color text not null default 'blue',
  created_at timestamptz not null default now()
);

-- Contas, uma linha por conta, por mês, por aba
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('pessoal', 'empresa')),
  month_key text not null,
  description text not null default '',
  value numeric,
  value_min numeric,
  value_max numeric,
  installments_left integer,
  tag_id uuid references public.tags(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_tab_month_idx on public.bills (tab, month_key);

-- Liga automaticamente cada novo login a um perfil.
-- O primeiro usuário criado vira admin; os demais entram como membro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'membro' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: só quem está logado enxerga e edita os dados.
-- Como é um app familiar/pequena equipe (não multi-empresa), qualquer
-- usuário autenticado pode ver e editar tudo, igual um Google Sheets
-- compartilhado.
alter table public.profiles enable row level security;
alter table public.tags enable row level security;
alter table public.bills enable row level security;

create policy "profiles: authenticated can view" on public.profiles
  for select to authenticated using (true);
create policy "profiles: user can update own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "tags: authenticated full access" on public.tags
  for all to authenticated using (true) with check (true);

create policy "bills: authenticated full access" on public.bills
  for all to authenticated using (true) with check (true);
