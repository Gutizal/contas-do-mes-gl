# Contas do mês

App para controlar as contas fixas e variáveis de cada mês, com abas separadas para Pessoal e Empresa, categorias de "quem paga" totalmente editáveis, páginas por mês com histórico, status de pago/pendente/postergado, uma aba de Análises com gráficos, login real com Supabase (funciona em qualquer aparelho), e exportação em CSV e PDF.

## Configurar o Supabase (uma vez só)

1. Crie um projeto em supabase.com (gratuito).
2. No SQL Editor do projeto, rode, nessa ordem, os dois arquivos que estão em `supabase/schema.sql` e `supabase/schema_part2.sql` (cole o conteúdo e clique em Run).
3. Em Project Settings > API Keys, copie a **Project URL** e a chave **anon public**.
4. Crie um arquivo `.env.local` na raiz do projeto (uma cópia de `.env.example`) com:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
```

Esse arquivo não vai para o Git (está no `.gitignore`). Ao publicar na Vercel, adicione essas duas mesmas variáveis em **Project Settings > Environment Variables** lá no painel da Vercel, senão o app não consegue se conectar ao banco em produção.

O primeiro e-mail que criar conta pela tela de login vira administrador automaticamente; os seguintes entram como membro (o admin pode promover depois em "Usuários").

## O que tem

- **Pessoal e Empresa**: abas separadas, cada uma com suas próprias contas e categorias.
- **Categorias editáveis**: crie, renomeie e colora as categorias de quem paga como quiser.
- **Meses/páginas**: navegue com as setas ou o menu suspenso no topo. Ao entrar num mês sem contas, o app pergunta se você quer copiar do último mês preenchido ou começar em branco.
- **Status por conta**: Pago, Pendente, e um botão para postergar a conta pro mês seguinte (ela sai deste mês e aparece no próximo).
- **Análises**: total considerado, média por conta, maior conta, gráfico por responsável, gráfico das maiores contas do mês selecionado, e comparação entre todos os meses criados.
- **Exportação**: CSV e PDF, incluindo o resumo e o histórico mensal.
- **Login real**: conta com e-mail e senha via Supabase, sincronizada entre qualquer aparelho.

## Rodar localmente (para testar antes de publicar)

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente), e o Supabase configurado (passo acima).

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (algo como `http://localhost:5173`) no navegador.

Para gerar a versão de produção localmente e conferir antes de subir:

```bash
npm run build
npm run preview
```

## Publicar na Vercel

### Caminho 1: pelo site da Vercel (recomendado)

1. Suba esta pasta para um repositório no GitHub.
2. Acesse vercel.com e crie uma conta (dá para entrar direto com o GitHub).
3. Clique em Add New, depois Project, e selecione o repositório.
4. A Vercel detecta sozinha que é um projeto Vite (Build Command `npm run build`, Output Directory `dist`).
5. Antes de clicar em Deploy, adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na seção Environment Variables dessa mesma tela (ou depois, em Project Settings > Environment Variables, e faça um redeploy).
6. Clique em Deploy.

Depois disso, qualquer novo `git push` para o repositório gera automaticamente uma nova publicação.

### Caminho 2: pelo terminal (Vercel CLI)

```bash
npm install -g vercel
vercel login
vercel        # publica uma versão de teste
vercel --prod # publica a versão definitiva
```

## Estrutura do projeto

```
supabase/
  schema.sql                 tabelas principais, trigger de perfil e RLS
  schema_part2.sql             tabela de meses e policy de promoção de admin
public/
  logo.png                      a logo da coruja, usada como favicon e no cabeçalho
src/
  App.jsx                        tela principal, abas Pessoal, Empresa e Análises
  supabaseClient.js                conexão com o Supabase
  export.js                         geração de CSV e PDF
  utils.js                           formatação de moeda e cálculos
  monthUtils.js                       formatação e navegação de meses
  tagColors.js                         paleta de cores das categorias
  data/
    initialData.js                     fábricas de conta/categoria vazias
    cloudStore.js                       toda a leitura e escrita no Supabase
  auth/
    AuthContext.jsx                      login, sessão e perfis via Supabase Auth
    LoginScreen.jsx                        tela de login e cadastro
    UserManager.jsx                         painel de usuários, visível só para admins
  components/
    BillsTable.jsx                          tabela editável de contas
    StatusSelector.jsx                        selo de pago/pendente + postergar
    PayerSelector.jsx                          seletor das categorias de quem paga
    TagManager.jsx                              painel para criar/editar/remover categorias
    SummaryCards.jsx                              cartões de totais no topo de cada aba
    AnalyticsTab.jsx                               gráficos e histórico mensal
    MonthSwitcher.jsx                               navegação entre meses
    MonthSetupPrompt.jsx                             tela de "copiar do mês anterior ou começar em branco"
    OwlMark.jsx                                       logo animada (o olho acompanha o mouse e pulsa)
```
