# Contas do mês

App para controlar as contas fixas e variáveis de cada mês, com abas separadas para Pessoal e Empresa, categorias de "quem paga" totalmente editáveis, uma aba de Análises com gráficos, login com administrador, e exportação em CSV e PDF.

Os dados ficam salvos no navegador (localStorage), neste dispositivo. Não há backend nem banco de dados.

## O que tem

- **Pessoal e Empresa**: abas separadas, cada uma com suas próprias contas e categorias.
- **Categorias editáveis**: em vez de G/A fixos, você cria, renomeia e colore as categorias de quem paga como quiser (nome de pessoa, apelido, o que fizer sentido).
- **Linhas editáveis**: descrição, valor fixo ou uma faixa (mínimo e máximo) para contas variáveis, parcelas restantes e observações.
- **Meses/páginas**: cada aba (Pessoal e Empresa) é organizada por mês. Navegue com as setas ou o menu suspenso no topo. Ao entrar num mês que ainda não tem contas, o app pergunta se você quer copiar do último mês preenchido ou começar em branco. As categorias de quem paga continuam as mesmas entre os meses; só as contas mudam.
- **Status por conta**: cada linha pode ser marcada como Pago ou Pendente, e tem um botão para "postergar" ela para o mês seguinte (a conta sai deste mês e aparece no próximo, já como pendente).
- **Análises**: total considerado, média por conta, maior conta, gráfico por responsável, gráfico das maiores contas do mês selecionado, e um gráfico comparando a evolução entre todos os meses que você já criou (automático, sem precisar registrar nada manualmente).
- **Exportação**: CSV e PDF, incluindo o resumo e o histórico mensal.
- **Login local**: no primeiro acesso, você cria o usuário administrador. Depois disso o admin pode cadastrar outros usuários (aba "Usuários", visível só para admins).

### Importante sobre o login

Esse login é um controle de acesso simples, guardado neste navegador, sem servidor por trás. Ele serve para impedir que alguém abra o app sem senha neste dispositivo, mas:

- Não sincroniza dados entre dispositivos diferentes. Se você e outra pessoa usarem o app em aparelhos separados, cada um terá seu próprio conjunto de dados salvos localmente.
- A senha fica salva em texto simples no navegador, o que é aceitável para um controle de acesso caseiro, mas não é segurança de verdade.

Se no futuro vocês quiserem contas de verdade, compartilhadas entre dispositivos, com dados sincronizados, o caminho é adicionar um backend com banco de dados e autenticação real (por exemplo Supabase ou Firebase). Isso é uma etapa maior, fora do escopo deste app estático, e posso ajudar a montar quando fizer sentido.

## Rodar localmente (para testar antes de publicar)

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

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

1. Suba esta pasta para um repositório no GitHub (crie um repositório novo em github.com/new e siga as instruções da própria página do GitHub).
2. Acesse vercel.com e crie uma conta (dá para entrar direto com o GitHub).
3. Clique em Add New, depois Project.
4. Selecione o repositório que você acabou de criar.
5. A Vercel detecta sozinha que é um projeto Vite. Os campos ficam assim, sem precisar mudar nada:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Clique em Deploy. Em cerca de um minuto o app estará no ar.

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
public/
  logo.png                a logo da coruja, usada como favicon e no cabeçalho
src/
  App.jsx                  tela principal, abas Pessoal, Empresa e Análises
  export.js                 geração de CSV e PDF
  utils.js                  formatação de moeda e cálculos
  tagColors.js               paleta de cores das categorias
  data/initialData.js        estrutura inicial (o app começa sem contas preenchidas)
  auth/
    AuthContext.jsx           login local, criação de admin e usuários
    LoginScreen.jsx            tela de login e configuração inicial
    UserManager.jsx             painel de usuários, visível só para admins
  components/
    BillsTable.jsx             tabela editável de contas
    PayerSelector.jsx           seletor das categorias de quem paga
    TagManager.jsx               painel para criar/editar/remover categorias
    SummaryCards.jsx              cartões de totais no topo de cada aba
    AnalyticsTab.jsx               gráficos e histórico mensal
    OwlMark.jsx                     logo animada (o olho acompanha o mouse e pulsa)
```

## Sobre os dados iniciais

O app começa vazio de propósito, tanto em Pessoal quanto em Empresa. As três categorias padrão de quem paga ("Pessoa 1", "Pessoa 2", "Compartilhado") são só um ponto de partida de nome, totalmente editável na aba Categorias.
