const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// key no formato "AAAA-MM", ex: "2026-01"
export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthKeyLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
};

export const monthKeyShort = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)}/${String(y).slice(2)}`;
};

export const sortMonthKeys = (keys) => [...keys].sort();

export const shiftMonthKey = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Entre as chaves existentes, acha a mais recente que vem antes de `key`
// (não precisa ser o mês imediatamente anterior no calendário).
export const findPreviousExistingMonth = (existingKeys, key) => {
  const before = sortMonthKeys(existingKeys).filter((k) => k < key);
  return before.length ? before[before.length - 1] : null;
};
