// O app começa vazio de propósito: cada pessoa preenche suas próprias contas.
// value: número fixo em reais | null quando o valor é variável (usar range)
// installmentsLeft: número de parcelas restantes | null se não há parcelamento
// tagId: referência a uma categoria em "payerTags" (quem paga) | null

let uid = 0;
const id = () => `bill-${++uid}-${Date.now().toString(36)}`;

export const seedPessoal = [];
export const seedEmpresa = [];

// Categorias de "quem paga": totalmente editáveis pelo usuário (nome e cor).
// Estes três nomes são só um ponto de partida, não são dados financeiros reais.
export const defaultPayerTags = [
  { id: "tag-1", name: "Pessoa 1", color: "blue" },
  { id: "tag-2", name: "Pessoa 2", color: "rose" },
  { id: "tag-3", name: "Compartilhado", color: "violet" },
];

export const makeEmptyBill = () => ({
  id: id(),
  description: "",
  value: null,
  valueMin: null,
  valueMax: null,
  installmentsLeft: null,
  tagId: null,
  status: "pendente", // "pendente" | "pago"
  notes: "",
});

export const makeTag = (name, color) => ({
  id: `tag-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
  name,
  color,
});

export const emptyMonthsData = () => ({ tags: defaultPayerTags.map((t) => ({ ...t })), months: {} });
