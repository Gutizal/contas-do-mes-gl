import { supabase } from "../lib/supabaseClient";
import { syncStart, syncEnd } from "./syncStatus";

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

const billToDbRow = (b) => ({ id: b.id, owner_id: b.ownerId, ...pickDbFields(b) });

const num = (v) => (v === null || v === undefined ? null : Number(v));

const billFromDb = (r) => ({
  id: r.id,
  tab: r.tab,
  monthKey: r.month_key,
  description: r.description ?? "",
  value: num(r.value),
  valueMin: num(r.value_min),
  valueMax: num(r.value_max),
  installmentsLeft: r.installments_left,
  tagId: r.tag_id,
  status: r.status ?? "pendente",
  notes: r.notes ?? "",
});

const tagFromDb = (r) => ({ id: r.id, tab: r.tab, name: r.name, color: r.color });

// ---- execução de gravações: rastreia status, tenta de novo e avisa se falhar ----

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAYS = [500, 1500];

async function write(label, makeRequest) {
  syncStart();
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const { error } = await makeRequest();
      if (!error) {
        syncEnd();
        return true;
      }
      lastError = error;
      // erro de regra/permissão não adianta repetir
      if (error.code && /^(23|42|PGRST)/.test(error.code)) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt < RETRY_DELAYS.length) await wait(RETRY_DELAYS[attempt]);
  }
  console.error(`Erro ao ${label}:`, lastError);
  syncEnd(`Não foi possível ${label}.`);
  return false;
}

// ---- carga inicial: busca tudo e organiza em { pessoal: {tags, months}, empresa: {...} } ----

// Sempre filtra pelo dono: o admin enxerga as linhas de todo mundo (RLS), então
// sem o filtro os dados de várias pessoas se misturariam na tela.
export class MigrationMissingError extends Error {}

export async function loadAll(ownerId) {
  const [tagRes, billRes, monthRes] = await Promise.all([
    supabase.from("tags").select("*").eq("owner_id", ownerId).order("created_at"),
    supabase.from("bills").select("*").eq("owner_id", ownerId).order("created_at"),
    supabase.from("months").select("*").eq("owner_id", ownerId),
  ]);
  const err = tagRes.error || billRes.error || monthRes.error;
  if (err) {
    // 42703 = coluna inexistente: o banco ainda não recebeu a migração 004
    if (err.code === "42703" || /owner_id/.test(err.message || "")) throw new MigrationMissingError("migração 004 pendente");
    throw err;
  }

  const result = { pessoal: { tags: [], months: {} }, empresa: { tags: [], months: {} } };

  (monthRes.data || []).forEach((m) => {
    if (result[m.tab]) result[m.tab].months[m.month_key] = [];
  });
  (tagRes.data || []).forEach((t) => result[t.tab]?.tags.push(tagFromDb(t)));
  (billRes.data || []).forEach((r) => {
    const bill = billFromDb(r);
    const tab = result[bill.tab];
    if (!tab) return;
    (tab.months[bill.monthKey] ||= []).push(bill);
  });
  return result;
}

// ---- contas ----

// Edições de campo (digitação) entram numa fila e só vão ao banco 600ms depois
// da última tecla, para não disparar uma chamada de rede por caractere.
const pendingBills = new Map(); // id -> { fields, timer }
// Inserções em andamento: uma edição nunca corre na frente do insert da própria conta.
const inserting = new Map(); // id -> Promise

const runBillUpdate = async (id, fields) => {
  await inserting.get(id);
  return write("salvar a conta", () => supabase.from("bills").update(pickDbFields(fields)).eq("id", id));
};

export function scheduleBillUpdate(id, fields) {
  const prev = pendingBills.get(id);
  if (prev) clearTimeout(prev.timer);
  else syncStart();
  const merged = { ...(prev?.fields || {}), ...fields };
  const timer = setTimeout(async () => {
    pendingBills.delete(id);
    await runBillUpdate(id, merged);
    syncEnd();
  }, 600);
  pendingBills.set(id, { fields: merged, timer });
}

// Ações explícitas (não digitação) aplicam na hora, junto com o que estiver na fila.
export async function updateBillNow(id, fields) {
  const prev = pendingBills.get(id);
  if (prev) {
    clearTimeout(prev.timer);
    pendingBills.delete(id);
    syncEnd();
  }
  return runBillUpdate(id, { ...(prev?.fields || {}), ...fields });
}

// Envia tudo o que está esperando o intervalo de digitação (ao sair da página).
export function flushPending() {
  [...pendingBills.entries()].forEach(([id, { fields, timer }]) => {
    clearTimeout(timer);
    pendingBills.delete(id);
    runBillUpdate(id, fields).then(() => syncEnd());
  });
}

export const hasPendingBillEdits = () => pendingBills.size > 0;

export function insertBill(bill) {
  const p = write("criar a conta", () => supabase.from("bills").insert(billToDbRow(bill)));
  inserting.set(bill.id, p);
  p.finally(() => inserting.delete(bill.id));
  return p;
}

export function insertBills(bills) {
  if (!bills.length) return Promise.resolve(true);
  const p = write("copiar as contas", () => supabase.from("bills").insert(bills.map(billToDbRow)));
  bills.forEach((b) => {
    inserting.set(b.id, p);
    p.finally(() => inserting.delete(b.id));
  });
  return p;
}

export async function deleteBill(id) {
  const prev = pendingBills.get(id);
  if (prev) {
    clearTimeout(prev.timer);
    pendingBills.delete(id);
    syncEnd();
  }
  await inserting.get(id);
  return write("remover a conta", () => supabase.from("bills").delete().eq("id", id));
}

export const deleteBillsForMonth = (ownerId, tab, monthKey) =>
  write("excluir as contas do mês", () =>
    supabase.from("bills").delete().eq("owner_id", ownerId).eq("tab", tab).eq("month_key", monthKey)
  );

// ---- meses ----

export const markMonthStarted = (ownerId, tab, monthKey) =>
  write("abrir o mês", () => supabase.from("months").upsert({ owner_id: ownerId, tab, month_key: monthKey }, { onConflict: "owner_id,tab,month_key" }));

export const deleteMonthMarker = (ownerId, tab, monthKey) =>
  write("excluir o mês", () => supabase.from("months").delete().eq("owner_id", ownerId).eq("tab", tab).eq("month_key", monthKey));

// ---- categorias ----

const pendingTags = new Map();
const insertingTags = new Map();

export function insertTag(tag) {
  const p = write("criar a categoria", () => supabase.from("tags").insert({ id: tag.id, owner_id: tag.ownerId, tab: tag.tab, name: tag.name, color: tag.color }));
  insertingTags.set(tag.id, p);
  p.finally(() => insertingTags.delete(tag.id));
  return p;
}

// Renomear digita letra por letra: também espera um intervalo antes de gravar.
export function scheduleTagUpdate(id, fields) {
  const prev = pendingTags.get(id);
  if (prev) clearTimeout(prev.timer);
  else syncStart();
  const merged = { ...(prev?.fields || {}), ...fields };
  const timer = setTimeout(async () => {
    pendingTags.delete(id);
    await insertingTags.get(id);
    await write("salvar a categoria", () => supabase.from("tags").update(merged).eq("id", id));
    syncEnd();
  }, 600);
  pendingTags.set(id, { fields: merged, timer });
}

export async function deleteTag(id) {
  const prev = pendingTags.get(id);
  if (prev) {
    clearTimeout(prev.timer);
    pendingTags.delete(id);
    syncEnd();
  }
  await insertingTags.get(id);
  return write("remover a categoria", () => supabase.from("tags").delete().eq("id", id));
}
