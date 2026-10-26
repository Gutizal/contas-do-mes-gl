// value: número fixo em reais | null quando o valor é variável (usar faixa mín/máx)
// installmentsLeft: parcelas restantes, contando a deste mês (1 = última) | null se não parcelada
// tagId: referência a uma categoria em "tags" (quem paga) | null

import { monthDiff } from "../lib/months";

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

export const makeEmptyBill = (tab, monthKey, ownerId) => ({
  id: newId(),
  ownerId,
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

export const makeTag = (tab, name, color, ownerId) => ({ id: newId(), ownerId, tab, name, color });

// Copia as contas de um mês para outro. Contas parceladas avançam: a cada mês
// que passa, uma parcela a menos; quem já quitou todas não é copiado.
export function cloneBillsForMonth(source, tab, fromKey, toKey, ownerId) {
  const elapsed = Math.max(monthDiff(fromKey, toKey), 0);
  const bills = [];
  let finished = 0;
  source.forEach((b) => {
    let installmentsLeft = b.installmentsLeft;
    if (installmentsLeft !== null && installmentsLeft !== undefined) {
      installmentsLeft -= elapsed;
      if (installmentsLeft < 1) {
        finished += 1;
        return;
      }
    }
    bills.push({
      ...makeEmptyBill(tab, toKey, ownerId),
      description: b.description,
      value: b.value,
      valueMin: b.valueMin,
      valueMax: b.valueMax,
      installmentsLeft,
      tagId: b.tagId,
      notes: b.notes,
      status: "pendente",
    });
  });
  return { bills, finished };
}
