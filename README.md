# Contas do mês

App para controlar as contas fixas e variáveis de cada mês, com abas **Pessoal** e **Empresa**, categorias de "quem paga" editáveis, navegação por mês, status pago/pendente, postergar conta para o mês seguinte, **Análises** com gráficos, exportação em CSV/PDF e login real (Supabase) que funciona no celular e no computador.

**Stack:** Vite + React + Tailwind · Supabase (Postgres + Auth) · Vercel · recharts · jsPDF.

## Como funciona o acesso

- Quem cria conta fica **pendente** até um admin aprovar (*menu da conta › Usuários*).
- **Cada pessoa tem o próprio espaço**: contas, categorias e meses são só dela. Ninguém vê ou altera os dados de outra pessoa.
- O **admin** tem acesso total: no topo aparece "Dados de ▾" para ver e editar o espaço de qualquer pessoa. Remover um usuário apaga também os dados dele.
- O admin pode **compartilhar o próprio espaço** com quem quiser (casal, sócios): em *menu da conta › Usuários › Compartilhar meu espaço*. Quem recebe o acesso vê e edita as mesmas contas que o admin, e continua com o próprio espaço separado. A escolha "Dados de ▾" fica lembrada.
- Na migração 004, quem já usava o app ganha acesso ao espaço do admin (como era antes) e todos os dados existentes ficam com o primeiro admin.
- O primeiro usuário do projeto vira admin automaticamente.

## Configurar o Supabase

1. Crie o projeto em supabase.com.
2. No **SQL Editor**, rode **nesta ordem**, um arquivo por vez (cole e clique em Run):
   1. `supabase/schema.sql`
   2. `supabase/schema_part2.sql`
   3. `supabase/migrations/003_seguranca_e_aprovacao.sql`
   4. `supabase/migrations/004_dados_por_usuario.sql`
   5. `supabase/migrations/005_validacao_de_dados.sql`
3. Em **Authentication › URL Configuration**: *Site URL* = endereço do app na Vercel; *Redirect URLs* = esse endereço com `/**` (e `http://localhost:5173/**` só se for desenvolver localmente). Evite `*` solto ou domínios que não são seus.
4. Em **Authentication › Policies/Providers**: defina o tamanho mínimo de senha para 8 ou mais (o app já exige 8, mas o servidor aceita 6 por padrão).
5. Copie a Project URL e a chave publishable/anon e crie o `.env.local` (modelo em `.env.example`). Cadastre as mesmas variáveis na Vercel (**Settings › Environment Variables**, valendo para Production e Preview) e faça um redeploy.

### Se você já tem o app no ar

Rode as migrações **003, 004 e 005, nessa ordem, antes de publicar esta versão** (a 004 precisa que exista um admin; veja abaixo). Nenhuma apaga ou altera contas, categorias ou meses: tudo o que existe fica com o primeiro admin. Se publicar o app antes da 004, ele mostra "O banco ainda não recebeu a migração 004".

Se a 004 parar com **"Nenhum administrador encontrado"**, nenhum usuário está marcado como admin (acontece quando as contas foram criadas antes do trigger). Nada foi alterado. Marque você (troque o e-mail) e rode a 004 de novo:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');
```

Para conferir depois:

```sql
select name, role, approved from public.profiles;                 -- você: admin / true
select owner_id, count(*) from public.bills group by owner_id;   -- tudo com o seu id
select * from public.space_members;                             -- você -> quem já usava o app
```

O que as migrações corrigem:
- **003:** qualquer pessoa com o link podia criar conta e ler/editar todas as contas; um usuário comum podia se promover a admin com uma chamada direta ao banco.
- **004:** os dados passam a ter dono (acesso por pessoa), o admin enxerga tudo e pode compartilhar o próprio espaço.
- **005:** o banco passa a validar tamanho de texto, faixa de valores, formato do mês e cores.

### Login com Google (opcional)

1. Google Cloud Console › *APIs e serviços › Credenciais* › criar **ID do cliente OAuth** (*Aplicativo da Web*). Em *URIs de redirecionamento autorizados*: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
2. Supabase › *Authentication › Providers › Google*: ative e cole o Client ID e o Client Secret.
3. Defina `VITE_ENABLE_GOOGLE_LOGIN=true` (local e na Vercel) e faça o redeploy.

Quem entra com Google também passa pela aprovação do admin.

> O e-mail embutido do Supabase tem limite baixo de envios por hora. Se usar muito "esqueci minha senha", configure um SMTP próprio em *Authentication › SMTP*. Se só pessoas de confiança usam o app, também dá para desligar *Allow new users to sign up*.

## CAPTCHA gratuito (Cloudflare Turnstile)

Protege login, cadastro e "esqueci minha senha" contra robôs. É opcional: sem a chave do site o app funciona normalmente. **A ordem importa** (para não travar o login):

1. **Cloudflare** (conta gratuita, não precisa mudar o DNS): *Turnstile › Add widget*. Nome livre; em *Hostname Management* adicione o endereço do app (ex.: `contas-do-mes-gl.vercel.app`) e, se for testar, o endereço do preview da Vercel e `localhost`; modo **Managed**. Guarde a **Site Key** (pública) e a **Secret Key** (privada).
2. **Vercel** › *Settings › Environment Variables*: `VITE_TURNSTILE_SITE_KEY` = a **Site Key** (Production e Preview). Faça o deploy desta versão e confirme que a caixa de verificação aparece na tela de login. Neste ponto o Supabase ainda não exige nada.
3. **Só depois**, no **Supabase** › *Authentication › Attack Protection* (em painéis antigos: *Authentication › Settings › Bot and Abuse Protection*): ative **Enable CAPTCHA protection**, escolha **Cloudflare Turnstile** e cole a **Secret Key**. Salve.
4. Teste o login, o cadastro e o "esqueci minha senha" no endereço oficial.

Se algo travar o acesso: no Supabase, desligue o CAPTCHA (passo 3). O login com Google não é afetado. Nunca ative o CAPTCHA no Supabase antes de publicar esta versão: o app antigo não envia o token e o login falharia.

## Segurança

- A CSP libera `challenges.cloudflare.com` (script, iframe e conexão) só para o Turnstile.
- `vercel.json` aplica `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy` e `X-Robots-Tag` (o app é privado: não deve ser indexado).
- A **CSP está em modo report-only** (`Content-Security-Policy-Report-Only`). Depois de publicar, abra o app e confira o console do navegador: se não houver avisos de CSP no login, nas abas, em Análises e ao gerar PDF, troque a chave do header por `Content-Security-Policy` em `vercel.json` para passar a bloquear.
- A chave `anon`/publishable é pública por desenho; quem protege os dados é o RLS do banco. **Nunca** coloque a `service_role` no front-end nem na Vercel como `VITE_*`.
- Sem backups diários no plano gratuito do Supabase: exporte o CSV do mês com frequência.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # cálculos, meses, mensagens de login, dados por usuário
npm run test:sql   # regras de acesso do banco (Postgres embutido): aprovação, dono, admin, validações
npm run build      # versão de produção em dist/
```

## Publicar

Cada `git push` na branch principal gera um deploy automático na Vercel. Pull requests geram um endereço de pré-visualização para testar antes.

## Estrutura

```
supabase/
  schema.sql, schema_part2.sql      tabelas, trigger de perfil e RLS originais
  migrations/003…005                aprovação de usuários, dados por usuário, validações
  tests/                            testes das regras de acesso (npm run test:sql)
public/                             logo, ícones, manifest, robots.txt
vercel.json                         headers de segurança
src/
  App.jsx                           moldura (cabeçalho, admin) e área de trabalho
  hooks/useLedger.js                estado dos dados + ações (otimista + Supabase)
  data/cloudStore.js                leitura/escrita no Supabase (retry, fila, status, dono)
  data/factories.js                 contas/categorias novas e cópia de mês
  lib/calc.js                       cálculos (puros e testados)
  lib/months.js, format.js, export.js, tagColors.js, authErrors.js
  auth/                             login (com Turnstile), aprovação, nova senha, usuários
  components/                       Header, SpaceBar, MonthSwitcher, SummaryCards, BillsList, AnalyticsTab…
  test/                             testes (vitest)
```
