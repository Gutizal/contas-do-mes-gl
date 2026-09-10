-- Marca quais meses já foram "abertos" em cada aba, mesmo sem nenhuma conta ainda.
create table if not exists public.months (
  tab text not null check (tab in ('pessoal', 'empresa')),
  month_key text not null,
  created_at timestamptz not null default now(),
  primary key (tab, month_key)
);

alter table public.months enable row level security;

create policy "months: authenticated full access" on public.months
  for all to authenticated using (true) with check (true);

-- Permite que um admin promova/altere o papel de qualquer usuário
-- (a policy anterior só deixava cada um editar o próprio perfil).
create policy "profiles: admin can update any" on public.profiles
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
