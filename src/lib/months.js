const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Chaves de mês no formato "AAAA-MM", ex: "2026-01".
const pad = (n) => String(n).padStart(2, "0");

export const monthKeyOf = (year, monthIndex) => `${year}-${pad(monthIndex + 1)}`;

export const currentMonthKey = (now = new Date()) => monthKeyOf(now.getFullYear(), now.getMonth());

export const parseMonthKey = (key) => {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m }; // month: 1..12
};

export const monthName = (m) => MONTH_NAMES[m - 1];

export const monthKeyLabel = (key) => {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
};

export const monthKeyShort = (key) => {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1].slice(0, 3)}/${String(year).slice(2)}`;
};

export const sortMonthKeys = (keys) => [...keys].sort();

export const shiftMonthKey = (key, delta) => {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKeyOf(d.getFullYear(), d.getMonth());
};

// Distância em meses entre duas chaves (to - from).
export const monthDiff = (fromKey, toKey) => {
  const a = parseMonthKey(fromKey);
  const b = parseMonthKey(toKey);
  return (b.year - a.year) * 12 + (b.month - a.month);
};

// Entre as chaves existentes, a mais recente que vem antes de `key`
// (não precisa ser o mês imediatamente anterior no calendário).
export const findPreviousExistingMonth = (existingKeys, key) => {
  const before = sortMonthKeys(existingKeys).filter((k) => k < key);
  return before.length ? before[before.length - 1] : null;
};
