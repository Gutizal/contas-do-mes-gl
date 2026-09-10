import { supabase } from "../supabaseClient";

// ---- mapeamento entre o formato do app (camelCase) e as colunas do banco (snake_case) ----

const FIELD_MAP = {
  tab: "tab",
  monthKey: "month_key",
  description: "description",
  value: "value",
  valueMin: "value_min",
  valueMax: "value_max",
  installmentsLeft: "installments_left",
  tagId: "tag_id",
  status: "status",
  notes: "notes",
};

const pickDbFields = (fields) => {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    if (FIELD_MAP[k]) out[FIELD_MAP[k]] = v;
  });
  return out;
};

const billToDbRow = (b) => ({ id: b.id, ...pickDbFields(b) });

const billFromDb = (r) => ({
  id: r.id,
  tab: r.tab,
  monthKey: r.month_key,
  description: r.description ?? "",
  value: r.value === null ? null : Number(r.value),
  valueMin: r.value_min === null ? null : Number(r.value_min),
  valueMax: r.value_max === null ? null : Number(r.value_max),
  installmentsLeft: r.installments_left,
  tagId: r.tag_id,
  status: r.status ?? "pendente",
  notes: r.notes ?? "",
});

const tagFromDb = (r) => ({ id: r.id, tab: r.tab, name: r.name, color: r.color });

// ---- carga inicial: busca tudo e organiza no formato { pessoal: {tags, months}, empresa: {...} } ----

export async function loadAll() {
  const [{ data: tagRows, error: tagErr }, { data: billRows, error: billErr }, { data: monthRows, error: monthErr }] =
    await Promise.all([
      supabase.from("tags").select("*").order("created_at"),
      supabase.from("bills").select("*").order("created_at"),
      supabase.from("months").select("*"),
    ]);
  if (tagErr || billErr || monthErr) throw tagErr || billErr || monthErr;

  const base = () => ({ tags: [], months: {} });
  const result = { pessoal: base(), empresa: base() };

  (monthRows || []).forEach((m) => {
    result[m.tab].months[m.month_key] = [];
  });
  (tagRows || []).forEach((t) => result[t.tab].tags.push(tagFromDb(t)));
  (billRows || []).forEach((r) => {
    const bill = billFromDb(r);
    if (!result[bill.tab].months[bill.monthKey]) result[bill.tab].months[bill.monthKey] = [];
    result[bill.tab].months[bill.monthKey].push(bill);
  });

  return result;
}

// ---- contas ----

const pending = new Map();

// edições de campo (digitação) entram numa fila e só vão pro banco 600ms
// depois da última tecla, pra não disparar uma chamada de rede por caractere.
export function scheduleBillUpdate(id, fields) {
  const prev = pending.get(id);
  const merged = { ...(prev?.fields || {}), ...fields };
  if (prev) clearTimeout(prev.timer);
  const timer = setTimeout(async () => {
    pending.delete(id);
    const { error } = await supabase.from("bills").update(pickDbFields(merged)).eq("id", id);
    if (error) console.error("Erro ao salvar conta:", error);
  }, 600);
  pending.set(id, { fields: merged, timer });
}

// ações explícitas (não digitação) aplicam na hora, sem esperar o debounce
export async function updateBillNow(id, fields) {
  const prev = pending.get(id);
  const merged = { ...(prev?.fields || {}), ...fields };
  if (prev) {
    clearTimeout(prev.timer);
    pending.delete(id);
  }
  const { error } = await supabase.from("bills").update(pickDbFields(merged)).eq("id", id);
  if (error) console.error("Erro ao atualizar conta:", error);
  return !error;
}

export async function insertBill(bill) {
  const { error } = await supabase.from("bills").insert(billToDbRow(bill));
  if (error) console.error("Erro ao criar conta:", error);
  return !error;
}

export async function insertBills(bills) {
  if (!bills.length) return true;
  const { error } = await supabase.from("bills").insert(bills.map(billToDbRow));
  if (error) console.error("Erro ao copiar contas:", error);
  return !error;
}

export async function deleteBill(id) {
  const prev = pending.get(id);
  if (prev) {
    clearTimeout(prev.timer);
    pending.delete(id);
  }
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) console.error("Erro ao remover conta:", error);
  return !error;
}

export async function deleteBillsForMonth(tab, monthKey) {
  const { error } = await supabase.from("bills").delete().eq("tab", tab).eq("month_key", monthKey);
  if (error) console.error("Erro ao excluir contas do mês:", error);
  return !error;
}

// ---- meses ----

export async function markMonthStarted(tab, monthKey) {
  const { error } = await supabase.from("months").upsert({ tab, month_key: monthKey });
  if (error) console.error("Erro ao iniciar mês:", error);
  return !error;
}

export async function deleteMonthMarker(tab, monthKey) {
  const { error } = await supabase.from("months").delete().eq("tab", tab).eq("month_key", monthKey);
  if (error) console.error("Erro ao excluir mês:", error);
  return !error;
}

// ---- categorias ----

export async function insertTag(tag) {
  const { error } = await supabase.from("tags").insert({ id: tag.id, tab: tag.tab, name: tag.name, color: tag.color });
  if (error) console.error("Erro ao criar categoria:", error);
  return !error;
}

export async function updateTagRemote(id, fields) {
  const { error } = await supabase.from("tags").update(fields).eq("id", id);
  if (error) console.error("Erro ao salvar categoria:", error);
  return !error;
}

export async function deleteTagRemote(id) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) console.error("Erro ao remover categoria:", error);
  return !error;
}
