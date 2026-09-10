export const fmtBRL = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "não definido";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Valor considerado para totais: valor fixo, ou média da faixa variável, ou 0.
export const effectiveValue = (bill) => {
  if (bill.value !== null && bill.value !== undefined && bill.value !== "") return Number(bill.value);
  if (bill.valueMin !== null && bill.valueMax !== null && bill.valueMin !== "" && bill.valueMax !== "") {
    return (Number(bill.valueMin) + Number(bill.valueMax)) / 2;
  }
  if (bill.valueMin !== null && bill.valueMin !== "") return Number(bill.valueMin);
  return 0;
};

export const isVariable = (bill) => (bill.value === null || bill.value === undefined || bill.value === "");

export const tagLabel = (tags, tagId) => {
  const tag = tags.find((t) => t.id === tagId);
  return tag ? tag.name : "sem responsável definido";
};

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
