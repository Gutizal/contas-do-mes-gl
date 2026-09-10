// value: número fixo em reais | null quando o valor é variável (usar range)
// installmentsLeft: número de parcelas restantes | null se não há parcelamento
// tagId: referência a uma categoria em "tags" (quem paga) | null

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

export const makeEmptyBill = (tab, monthKey) => ({
  id: newId(),
  tab,
  monthKey,
  description: "",
  value: null,
  valueMin: null,
  valueMax: null,
  installmentsLeft: null,
  tagId: null,
  status: "pendente", // "pendente" | "pago"
  notes: "",
});

export const makeTag = (tab, name, color) => ({
  id: newId(),
  tab,
  name,
  color,
});

export const emptyMonthsData = () => ({ tags: [], months: {} });
