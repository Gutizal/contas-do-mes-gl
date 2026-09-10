import { useEffect, useMemo, useRef, useState } from "react";
import BillsTable from "./components/BillsTable";
import SummaryCards from "./components/SummaryCards";
import TagManager from "./components/TagManager";
import AnalyticsTab from "./components/AnalyticsTab";
import MonthSwitcher from "./components/MonthSwitcher";
import MonthSetupPrompt from "./components/MonthSetupPrompt";
import OwlMark from "./components/OwlMark";
import { emptyMonthsData, makeEmptyBill } from "./data/initialData";
import { exportCSV, exportPDF } from "./export";
import { useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";
import UserManager from "./auth/UserManager";
import { currentMonthKey, monthKeyLabel, sortMonthKeys, monthKeyShort, shiftMonthKey, findPreviousExistingMonth } from "./monthUtils";
import { effectiveValue } from "./utils";

const STORAGE_KEY = "contas-do-mes-v4";
const LEGACY_KEYS = ["contas-do-mes-v3", "contas-do-mes-v2"];

function migrateLegacy() {
  for (const legacyKey of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) continue;
      const old = JSON.parse(raw);
      const addStatus = (bills) => bills.map((b) => ({ status: "pendente", ...b }));
      if (old.pessoal?.months || old.empresa?.months) {
        // v3: já tinha meses, só falta o campo status
        const fix = (tab) => ({ tags: tab?.tags || emptyMonthsData().tags, months: Object.fromEntries(Object.entries(tab?.months || {}).map(([k, v]) => [k, addStatus(v)])) });
        return { pessoal: fix(old.pessoal), empresa: fix(old.empresa) };
      }
      // v2: uma lista única de contas, joga tudo no mês atual
      const key = currentMonthKey();
      const build = (tab) => ({
        tags: tab?.tags?.length ? tab.tags : emptyMonthsData().tags,
        months: tab?.bills?.length ? { [key]: addStatus(tab.bills) } : {},
      });
      return { pessoal: build(old.pessoal), empresa: build(old.empresa) };
    } catch (e) {
      console.warn("Não foi possível migrar dados antigos:", e);
    }
  }
  return null;
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Não foi possível ler dados salvos:", e);
  }
  return migrateLegacy() || { pessoal: emptyMonthsData(), empresa: emptyMonthsData() };
}

function AppShell() {
  const { currentUser, logout } = useAuth();
  const [data, setData] = useState(loadInitial);
  const [tab, setTab] = useState("pessoal");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const initial = loadInitial();
    const keys = sortMonthKeys([...new Set([...Object.keys(initial.pessoal.months), ...Object.keys(initial.empresa.months)])]);
    return keys.length ? keys[keys.length - 1] : currentMonthKey();
  });
  const [showTagManager, setShowTagManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const isAnalytics = tab === "analises";
  const activeTab = tab === "empresa" ? "empresa" : "pessoal";

  const allMonthKeys = sortMonthKeys([...new Set([...Object.keys(data.pessoal.months), ...Object.keys(data.empresa.months)])]);
  const monthExists = Boolean(data[activeTab].months[selectedMonth]);
  const currentBills = data[activeTab].months[selectedMonth] || [];
  const currentTags = data[activeTab].tags;

  const setMonthBills = (tabKey, key, bills) =>
    setData((d) => ({ ...d, [tabKey]: { ...d[tabKey], months: { ...d[tabKey].months, [key]: bills } } }));

  const updateBills = (nextBills) => setMonthBills(activeTab, selectedMonth, nextBills);
  const updateTags = (nextTags) => setData((d) => ({ ...d, [activeTab]: { ...d[activeTab], tags: nextTags } }));

  const handleUpdate = (id, fields) => updateBills(currentBills.map((b) => (b.id === id ? { ...b, ...fields } : b)));
  const handleRemove = (id) => updateBills(currentBills.filter((b) => b.id !== id));
  const handleAdd = () => updateBills([...currentBills, makeEmptyBill()]);

  const handleStartBlank = () => setMonthBills(activeTab, selectedMonth, []);

  const handleCopyFrom = (fromKey) => {
    const source = data[activeTab].months[fromKey] || [];
    const clone = source.map((b) => ({ ...b, status: "pendente", id: `${b.id}-cp-${Math.random().toString(36).slice(2, 7)}` }));
    setMonthBills(activeTab, selectedMonth, clone);
  };

  const handlePostpone = (billId) => {
    const bill = currentBills.find((b) => b.id === billId);
    if (!bill) return;
    const nextKey = shiftMonthKey(selectedMonth, 1);
    const nextBills = data[activeTab].months[nextKey] || [];
    const moved = { ...bill, status: "pendente", id: `${bill.id}-mv-${Math.random().toString(36).slice(2, 7)}` };
    setData((d) => ({
      ...d,
      [activeTab]: {
        ...d[activeTab],
        months: {
          ...d[activeTab].months,
          [selectedMonth]: currentBills.filter((b) => b.id !== billId),
          [nextKey]: [...nextBills, moved],
        },
      },
    }));
    showToast(`"${bill.description || "Conta sem nome"}" foi movida para ${monthKeyLabel(nextKey)}.`);
  };

  const handleDeleteMonth = (key) => {
    setData((d) => {
      const stripPessoal = { ...d.pessoal.months };
      const stripEmpresa = { ...d.empresa.months };
      delete stripPessoal[key];
      delete stripEmpresa[key];
      return { ...d, pessoal: { ...d.pessoal, months: stripPessoal }, empresa: { ...d.empresa, months: stripEmpresa } };
    });
    if (selectedMonth === key) {
      const remaining = allMonthKeys.filter((k) => k !== key);
      setSelectedMonth(remaining[remaining.length - 1] || currentMonthKey());
    }
  };

  const tabs = useMemo(
    () => [
      { key: "pessoal", label: "Pessoal" },
      { key: "empresa", label: "Empresa" },
      { key: "analises", label: "Análises" },
    ],
    []
  );

  const sections = [
    { label: "Pessoal", bills: data.pessoal.months[selectedMonth] || [], tags: data.pessoal.tags },
    { label: "Empresa", bills: data.empresa.months[selectedMonth] || [], tags: data.empresa.tags },
  ];

  const monthlyTotals = allMonthKeys.map((k) => ({
    label: monthKeyShort(k),
    pessoal: (data.pessoal.months[k] || []).reduce((s, b) => s + effectiveValue(b), 0),
    empresa: (data.empresa.months[k] || []).reduce((s, b) => s + effectiveValue(b), 0),
  }));

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <OwlMark size={80} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-mist-50">Contas do mês</h1>
              <p className="text-sm text-mist-300">
                Tudo o que precisa ser pago, mês a mês, pessoal e empresa lado a lado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-mist-300 hidden sm:inline">
              {currentUser?.name} ({currentUser?.role === "admin" ? "admin" : "membro"})
            </span>
            {currentUser?.role === "admin" && (
              <button
                onClick={() => setShowUserManager((v) => !v)}
                className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
              >
                Usuários
              </button>
            )}
            <button
              onClick={logout}
              className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {showUserManager && <UserManager onClose={() => setShowUserManager(false)} />}

        <nav className="flex items-center gap-2 border-b border-ink-600">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors",
                tab === t.key
                  ? "border-signal-blue text-mist-50"
                  : "border-transparent text-mist-300 hover:text-mist-100",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {isAnalytics ? (
          <AnalyticsTab datasets={data} selectedMonth={selectedMonth} />
        ) : (
          <>
            <MonthSwitcher
              existingMonths={allMonthKeys}
              selected={selectedMonth}
              onSelect={setSelectedMonth}
              onDelete={handleDeleteMonth}
            />

            {!monthExists ? (
              <MonthSetupPrompt
                monthKey={selectedMonth}
                suggestedFromKey={findPreviousExistingMonth(Object.keys(data[activeTab].months), selectedMonth)}
                existingMonths={Object.keys(data[activeTab].months)}
                onStartBlank={handleStartBlank}
                onCopyFrom={handleCopyFrom}
              />
            ) : (
              <>
                <SummaryCards bills={currentBills} tags={currentTags} />

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowTagManager((v) => !v)}
                    className="text-xs text-signal-blue hover:underline"
                  >
                    {showTagManager ? "Ocultar categorias" : "Categorias (quem paga)"}
                  </button>
                </div>
                {showTagManager && <TagManager tags={currentTags} onChange={updateTags} onClose={() => setShowTagManager(false)} />}

                <BillsTable
                  bills={currentBills}
                  tags={currentTags}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onPostpone={handlePostpone}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
                  >
                    + Adicionar conta
                  </button>

                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => exportCSV("contas-do-mes.csv", sections, monthlyTotals)}
                      className="rounded-lg border border-ink-500 px-4 py-2 text-sm text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
                    >
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => exportPDF("contas-do-mes.pdf", "Contas do mês", selectedMonth, sections, monthlyTotals)}
                      className="rounded-lg border border-ink-500 px-4 py-2 text-sm text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
                    >
                      Exportar PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <footer className="text-xs text-mist-300/60 pt-4">
          Os dados ficam salvos apenas neste navegador (localStorage), neste dispositivo.
        </footer>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-ink-700 border border-ink-500 px-4 py-2.5 text-sm text-mist-100 shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { currentUser } = useAuth();
  return currentUser ? <AppShell /> : <LoginScreen />;
}
