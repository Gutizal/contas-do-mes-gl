export const fmtBRL = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "não definido";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// "R$ 1,2 mil" — para eixos de gráfico, onde o valor cheio não cabe.
export const fmtCompactBRL = (n) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export const fmtPct = (n, digits = 0) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
