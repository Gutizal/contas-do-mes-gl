import { shiftMonthKey } from "./months";

// ---------- valores de uma conta ----------

const filled = (v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v));
const toCents = (v) => Math.round(Number(v) * 100);

// Faixa possível da conta, em centavos.
// Fixa: min = max = valor. Variável: mín/máx (se só um dos dois foi
// preenchido, vale ele). Sem nada preenchido: 0.
export function billRangeCents(bill) {
  if (filled(bill.value)) {
    const c = toCents(bill.value);
    return { min: c, max: c };
  }
  const lo = filled(bill.valueMin) ? toCents(bill.valueMin) : null;
  const hi = filled(bill.valueMax) ? toCents(bill.valueMax) : null;
  if (lo !== null && hi !== null) return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
  const only = lo ?? hi;
  return only === null ? { min: 0, max: 0 } : { min: only, max: only };
}

// Valor considerado nos totais: o fixo, ou a média da faixa, em centavos.
export const effectiveCents = (bill) => {
  const { min, max } = billRangeCents(bill);
  return Math.round((min + max) / 2);
};

// Mesmo valor em reais.
export const effectiveValue = (bill) => effectiveCents(bill) / 100;

export const isVariable = (bill) => !filled(bill.value) && (filled(bill.valueMin) || filled(bill.valueMax));
export const hasNoValue = (bill) => !filled(bill.value) && !filled(bill.valueMin) && !filled(bill.valueMax);
export const isPaid = (bill) => bill.status === "pago";

const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);

// ---------- resumo de um conjunto de contas (um mês de uma aba, ou mais) ----------

export function summarize(bills) {
  const total = sum(bills, effectiveCents);
  const paidBills = bills.filter(isPaid);
  const paid = sum(paidBills, effectiveCents);
  const pendingBills = bills.filter((b) => !isPaid(b));
  const biggest = bills.reduce((best, b) => (best === null || effectiveCents(b) > effectiveCents(best) ? b : best), null);
  const variable = bills.filter(isVariable);

  return {
    count: bills.length,
    total: total / 100,
    min: sum(bills, (b) => billRangeCents(b).min) / 100,
    max: sum(bills, (b) => billRangeCents(b).max) / 100,
    paid: paid / 100,
    pending: (total - paid) / 100,
    paidCount: paidBills.length,
    pendingCount: pendingBills.length,
    pctPaid: total > 0 ? (paid / total) * 100 : bills.length && paidBills.length === bills.length ? 100 : 0,
    average: bills.length ? total / bills.length / 100 : 0,
    biggest,
    variableCount: variable.length,
    hasRange: variable.some((b) => billRangeCents(b).min !== billRangeCents(b).max),
    noValueCount: bills.filter(hasNoValue).length,
    noTagCount: bills.filter((b) => !b.tagId).length,
  };
}

// ---------- por categoria (quem paga) ----------

export function totalsByTag(bills, tags) {
  const grand = sum(bills, effectiveCents);
  const rows = tags.map((tag) => {
    const mine = bills.filter((b) => b.tagId === tag.id);
    const total = sum(mine, effectiveCents);
    const paid = sum(mine.filter(isPaid), effectiveCents);
    return { tag, count: mine.length, total: total / 100, paid: paid / 100, pending: (total - paid) / 100, share: grand ? (total / grand) * 100 : 0 };
  });
  const known = new Set(tags.map((t) => t.id));
  const orphans = bills.filter((b) => !b.tagId || !known.has(b.tagId));
  if (orphans.length) {
    const total = sum(orphans, effectiveCents);
    const paid = sum(orphans.filter(isPaid), effectiveCents);
    rows.push({ tag: null, count: orphans.length, total: total / 100, paid: paid / 100, pending: (total - paid) / 100, share: grand ? (total / grand) * 100 : 0 });
  }
  return rows;
}

// ---------- comparação entre meses ----------

export function compare(current, previous) {
  if (previous === null || previous === undefined) return null;
  const delta = Math.round((current - previous) * 100) / 100;
  const pct = previous !== 0 ? (delta / previous) * 100 : null;
  return { delta, pct, previous };
}

// ---------- parcelas ----------

// "Parcelas restantes" conta a deste mês: 1 = última parcela.
// Devolve, por mês a partir de `monthKey`, quanto ainda vai ser cobrado das
// contas parceladas (assumindo o mesmo valor), e um resumo.
export function installmentsOutlook(bills, monthKey) {
  const list = bills.filter((b) => filled(b.installmentsLeft) && Number(b.installmentsLeft) > 0);
  const horizon = list.reduce((m, b) => Math.max(m, Number(b.installmentsLeft)), 0);
  const months = [];
  for (let i = 0; i < horizon; i++) {
    const active = list.filter((b) => Number(b.installmentsLeft) > i);
    months.push({ monthKey: shiftMonthKey(monthKey, i), total: sum(active, effectiveCents) / 100, count: active.length });
  }
  return {
    count: list.length,
    months,
    thisMonth: months[0]?.total ?? 0,
    afterThisMonth: months.slice(1).reduce((s, m) => s + Math.round(m.total * 100), 0) / 100,
    lastMonthKey: horizon ? shiftMonthKey(monthKey, horizon - 1) : null,
  };
}

// ---------- histórico ----------

export function monthlyTotals(data, monthKeys) {
  return monthKeys.map((key) => {
    const p = summarize(data.pessoal.months[key] || []);
    const e = summarize(data.empresa.months[key] || []);
    return { key, pessoal: p.total, empresa: e.total, total: Math.round((p.total + e.total) * 100) / 100, paid: p.paid + e.paid };
  });
}

// Estatísticas sobre meses que de fato têm contas.
export function historyStats(totals, field = "total") {
  const filledMonths = totals.filter((m) => m[field] > 0);
  if (!filledMonths.length) return null;
  const values = filledMonths.map((m) => Math.round(m[field] * 100));
  const avg = values.reduce((a, b) => a + b, 0) / values.length / 100;
  const max = filledMonths.reduce((a, b) => (b[field] > a[field] ? b : a));
  const min = filledMonths.reduce((a, b) => (b[field] < a[field] ? b : a));
  return { average: avg, max, min, months: filledMonths.length };
}
