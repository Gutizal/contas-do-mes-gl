-- =====================================================================
-- Migração 005 — validação dos dados no banco
--
-- Rode depois da 004. Idempotente. Rejeita lixo mesmo que alguém chame a API
-- direto (sem passar pela tela): textos enormes, valores absurdos, mês com
-- formato inválido, cor de categoria fora da paleta.
-- As regras são criadas "NOT VALID" (valem para novas gravações) e depois o
-- script tenta validar os dados existentes; se algum dado antigo violar, só
-- avisa (NOTICE) e não quebra nada.
-- =====================================================================

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('bills',  'bills_month_key_fmt',   $c$month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'$c$),
      ('months', 'months_month_key_fmt',  $c$month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'$c$),
      ('bills',  'bills_description_len', $c$char_length(description) <= 200$c$),
      ('bills',  'bills_notes_len',       $c$char_length(notes) <= 1000$c$),
      ('bills',  'bills_value_range',     $c$(value is null or abs(value) <= 1000000000) and (value_min is null or abs(value_min) <= 1000000000) and (value_max is null or abs(value_max) <= 1000000000)$c$),
      ('bills',  'bills_installments_rng',$c$installments_left is null or installments_left between 0 and 600$c$),
      ('tags',   'tags_name_len',         $c$char_length(name) <= 40$c$),
      ('tags',   'tags_color_palette',    $c$color in ('blue','rose','violet','teal','amber','lime','orange','pink')$c$),
      ('profiles','profiles_name_len',    $c$char_length(name) <= 120$c$)
    ) as t(tbl, name, expr)
  loop
    if not exists (select 1 from pg_constraint where conname = c.name) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
    end if;
    begin
      execute format('alter table public.%I validate constraint %I', c.tbl, c.name);
    exception when others then
      raise notice 'Dados antigos violam % (%): corrija e rode "validate constraint" depois.', c.name, sqlerrm;
    end;
  end loop;
end $$;
