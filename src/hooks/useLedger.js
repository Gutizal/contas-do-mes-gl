import { useCallback, useEffect, useRef, useState } from "react";
import * as cloud from "../data/cloudStore";
import { cloneBillsForMonth, makeEmptyBill, makeTag } from "../data/factories";
import { sortMonthKeys, shiftMonthKey } from "../lib/months";
import { getSyncState } from "../data/syncStatus";

const TABS = ["pessoal", "empresa"];
const REFRESH_AFTER_MS = 60_000;

// Estado dos dados (contas, categorias, meses) + todas as ações que mexem neles.
// Cada ação atualiza a tela na hora (otimista) e grava no Supabase em seguida.
export function useLedger(ownerId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const lastLoad = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setError(null);
    try {
      const loaded = await cloud.loadAll(ownerId);
      lastLoad.current = Date.now();
      setData(loaded);
    } catch (err) {
      console.error(err);
      if (!silent) {
        setError(
          err instanceof cloud.MigrationMissingError
            ? "O banco ainda não recebeu a migração 004 (dados por usuário). Rode os arquivos de supabase/migrations no SQL Editor, na ordem, e recarregue."
            : "Não foi possível carregar os dados. Confira a conexão e tente de novo."
        );
      }
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Ao voltar para a aba/app (ex.: usou no celular e abriu no computador),
  // recarrega se estiver ocioso, para não trabalhar em cima de dados velhos.
  // Ao sair, envia o que ainda estava esperando para ser salvo.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cloud.flushPending();
      else if (Date.now() - lastLoad.current > REFRESH_AFTER_MS && getSyncState().pending === 0) load({ silent: true });
    };
    const onBeforeUnload = (e) => {
      cloud.flushPending();
      if (getSyncState().pending > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", cloud.flushPending);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cloud.flushPending);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [load]);

  const patchTab = (tab, fn) => setData((d) => ({ ...d, [tab]: fn(d[tab]) }));
  const patchMonth = (tab, key, fn) =>
    patchTab(tab, (t) => ({ ...t, months: { ...t.months, [key]: fn(t.months[key] || []) } }));

  // ----- contas -----

  const updateBill = (tab, key, id, fields) => {
    patchMonth(tab, key, (bills) => bills.map((b) => (b.id === id ? { ...b, ...fields } : b)));
    cloud.scheduleBillUpdate(id, fields);
  };

  const markPaid = (tab, key, id) => {
    patchMonth(tab, key, (bills) => bills.map((b) => (b.id === id ? { ...b, status: "pago" } : b)));
    cloud.updateBillNow(id, { status: "pago" });
  };

  const removeBill = (tab, key, id) => {
    patchMonth(tab, key, (bills) => bills.filter((b) => b.id !== id));
    cloud.deleteBill(id);
  };

  const addBill = (tab, key) => {
    const bill = makeEmptyBill(tab, key, ownerId);
    patchMonth(tab, key, (bills) => [...bills, bill]);
    cloud.insertBill(bill);
    return bill.id;
  };

  // Move a conta para o mês seguinte (de verdade, no banco).
  const postponeBill = (tab, key, id) => {
    const nextKey = shiftMonthKey(key, 1);
    patchTab(tab, (t) => {
      const bill = (t.months[key] || []).find((b) => b.id === id);
      if (!bill) return t;
      return {
        ...t,
        months: {
          ...t.months,
          [key]: t.months[key].filter((b) => b.id !== id),
          [nextKey]: [...(t.months[nextKey] || []), { ...bill, status: "pendente", monthKey: nextKey }],
        },
      };
    });
    cloud.markMonthStarted(ownerId, tab, nextKey).then(() => cloud.updateBillNow(id, { monthKey: nextKey, status: "pendente" }));
    return nextKey;
  };

  // ----- meses -----

  const startMonthBlank = (tab, key) => {
    patchMonth(tab, key, () => []);
    cloud.markMonthStarted(ownerId, tab, key);
  };

  const copyMonth = (tab, toKey, fromKey) => {
    const source = data[tab].months[fromKey] || [];
    const { bills, finished } = cloneBillsForMonth(source, tab, fromKey, toKey, ownerId);
    patchMonth(tab, toKey, () => bills);
    cloud.markMonthStarted(ownerId, tab, toKey).then(() => cloud.insertBills(bills));
    return { copied: bills.length, finished };
  };

  // Exclui o mês nas duas abas.
  const deleteMonth = (key) => {
    setData((d) => {
      const next = { ...d };
      TABS.forEach((t) => {
        const months = { ...d[t].months };
        delete months[key];
        next[t] = { ...d[t], months };
      });
      return next;
    });
    TABS.forEach((t) => {
      cloud.deleteBillsForMonth(ownerId, t, key);
      cloud.deleteMonthMarker(ownerId, t, key);
    });
  };

  // Desfaz a escolha de copiar/começar em branco, só nesta aba.
  const resetMonth = (tab, key) => {
    patchTab(tab, (t) => {
      const months = { ...t.months };
      delete months[key];
      return { ...t, months };
    });
    cloud.deleteBillsForMonth(ownerId, tab, key);
    cloud.deleteMonthMarker(ownerId, tab, key);
  };

  // ----- categorias -----

  const addTag = (tab, name, color) => {
    const tag = makeTag(tab, name, color, ownerId);
    patchTab(tab, (t) => ({ ...t, tags: [...t.tags, tag] }));
    cloud.insertTag(tag);
  };

  const updateTag = (tab, id, fields) => {
    patchTab(tab, (t) => ({ ...t, tags: t.tags.map((x) => (x.id === id ? { ...x, ...fields } : x)) }));
    cloud.scheduleTagUpdate(id, fields);
  };

  // O banco já zera tag_id das contas; aqui espelhamos isso na tela.
  const removeTag = (tab, id) => {
    patchTab(tab, (t) => ({
      ...t,
      tags: t.tags.filter((x) => x.id !== id),
      months: Object.fromEntries(
        Object.entries(t.months).map(([k, bills]) => [k, bills.map((b) => (b.tagId === id ? { ...b, tagId: null } : b))])
      ),
    }));
    cloud.deleteTag(id);
  };

  const monthKeys = data ? sortMonthKeys([...new Set(TABS.flatMap((t) => Object.keys(data[t].months)))]) : [];

  return {
    data,
    error,
    reload: load,
    monthKeys,
    actions: { updateBill, markPaid, removeBill, addBill, postponeBill, startMonthBlank, copyMonth, deleteMonth, resetMonth, addTag, updateTag, removeTag },
  };
}
