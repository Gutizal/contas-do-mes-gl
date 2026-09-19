import { useEffect, useRef, useState } from "react";
import BillsTable from "./components/BillsTable";
import SummaryCards from "./components/SummaryCards";
import TagManager from "./components/TagManager";
import AnalyticsTab from "./components/AnalyticsTab";
import MonthSwitcher from "./components/MonthSwitcher";
import MonthSetupPrompt from "./components/MonthSetupPrompt";
import OwlMark from "./components/OwlMark";
import { makeEmptyBill } from "./data/initialData";
import { exportCSV, exportPDF } from "./export";
import { useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";
import UserManager from "./auth/UserManager";
import ChangePasswordForm from "./auth/ChangePasswordForm";
import { currentMonthKey, monthKeyLabel, sortMonthKeys, monthKeyShort, shiftMonthKey, findPreviousExistingMonth } from "./monthUtils";
import { effectiveValue } from "./utils";
import * as cloud from "./data/cloudStore";

function AppShell() {
  const { currentUser, signOut } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("pessoal");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [monthInitialized, setMonthInitialized] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    cloud
      .loadAll()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        const keys = sortMonthKeys([...new Set([...Object.keys(loaded.pessoal.months), ...Object.keys(loaded.empresa.months)])]);
        setSelectedMonth(keys.length ? keys[keys.length - 1] : currentMonthKey());
        setMonthInitialized(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoadError("Não foi possível carregar seus dados do Supabase. Confira a conexão e recarregue a página.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const isAnalytics = tab === "analises";
  const activeTab = tab === "empresa" ? "empresa" : "pessoal";

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sm text-signal-rose max-w-sm">{loadError}</p>
      </div>
    );
  }

  if (!data || !monthInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <OwlMark size={64} />
      </div>
    );
  }

  const allMonthKeys = sortMonthKeys([...new Set([...Object.keys(data.pessoal.months), ...Object.keys(data.empresa.months)])]);
  const monthExists = Boolean(data[activeTab].months[selectedMonth]);
  const currentBills = data[activeTab].months[selectedMonth] || [];
  const currentTags = data[activeTab].tags;

  const setMonthBills = (tabKey, key, bills) =>
    setData((d) => ({ ...d, [tabKey]: { ...d[tabKey], months: { ...d[tabKey].months, [key]: bills } } }));

  const updateBills = (nextBills) => setMonthBills(activeTab, selectedMonth, nextBills);

  const updateTags = (nextTags, meta) => {
    setData((d) => ({ ...d, [activeTab]: { ...d[activeTab], tags: nextTags } }));
    if (meta?.created) cloud.insertTag(meta.created);
    else if (meta?.removedId) cloud.deleteTagRemote(meta.removedId);
    else if (meta?.id) cloud.updateTagRemote(meta.id, meta.fields);
  };

  const handleUpdate = (id, fields) => {
    updateBills(currentBills.map((b) => (b.id === id ? { ...b, ...fields } : b)));
    cloud.scheduleBillUpdate(id, fields);
  };

  const handleRemove = (id) => {
    updateBills(currentBills.filter((b) => b.id !== id));
    cloud.deleteBill(id);
  };

  const handleAdd = () => {
    const bill = makeEmptyBill(activeTab, selectedMonth);
    updateBills([...currentBills, bill]);
    cloud.insertBill(bill);
  };

  const handleStartBlank = () => {
    setMonthBills(activeTab, selectedMonth, []);
    cloud.markMonthStarted(activeTab, selectedMonth);
  };

  const handleCopyFrom = (fromKey) => {
    const source = data[activeTab].months[fromKey] || [];
    const clone = source.map((b) => makeEmptyBill(activeTab, selectedMonth)).map((fresh, i) => ({
      ...fresh,
      description: source[i].description,
      value: source[i].value,
      valueMin: source[i].valueMin,
      valueMax: source[i].valueMax,
      installmentsLeft: source[i].installmentsLeft,
      tagId: source[i].tagId,
      notes: source[i].notes,
      status: "pendente",
    }));
    setMonthBills(activeTab, selectedMonth, clone);
    cloud.markMonthStarted(activeTab, selectedMonth).then(() => cloud.insertBills(clone));
  };

  const handlePostpone = (billId) => {
    const bill = currentBills.find((b) => b.id === billId);
    if (!bill) return;
    const nextKey = shiftMonthKey(selectedMonth, 1);
    const nextBills = data[activeTab].months[nextKey] || [];
    const moved = { ...bill, status: "pendente", monthKey: nextKey };
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
    cloud.markMonthStarted(activeTab, nextKey).then(() => cloud.updateBillNow(billId, { monthKey: nextKey, status: "pendente" }));
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
    ["pessoal", "empresa"].forEach((t) => {
      cloud.deleteBillsForMonth(t, key);
      cloud.deleteMonthMarker(t, key);
    });
    if (selectedMonth === key) {
      const remaining = allMonthKeys.filter((k) => k !== key);
      setSelectedMonth(remaining[remaining.length - 1] || currentMonthKey());
    }
  };

  // Desfaz a escolha feita (copiar de um mês / começar em branco) só nesta
  // aba, sem mexer na outra aba nem apagar o mês da outra. Volta pra tela
  // de "copiar ou começar em branco".
  const handleResetMonthTab = () => {
    if (
      !window.confirm(
        `Isso vai apagar todas as contas de ${monthKeyLabel(selectedMonth)} na aba ${activeTab === "pessoal" ? "Pessoal" : "Empresa"} e voltar para o início. Continuar?`
      )
    )
      return;
    setData((d) => {
      const months = { ...d[activeTab].months };
      delete months[selectedMonth];
      return { ...d, [activeTab]: { ...d[activeTab], months } };
    });
    cloud.deleteBillsForMonth(activeTab, selectedMonth);
    cloud.deleteMonthMarker(activeTab, selectedMonth);
  };

  const tabs = [
    { key: "pessoal", label: "Pessoal" },
    { key: "empresa", label: "Empresa" },
    { key: "analises", label: "Análises" },
  ];

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
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10 overflow-x-hidden">
      <div className="mx-auto max-w-5xl min-w-0 flex flex-col gap-6">
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
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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
              onClick={() => setShowChangePassword((v) => !v)}
              className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
            >
              Trocar senha
            </button>
            <button
              onClick={signOut}
              className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {showUserManager && <UserManager onClose={() => setShowUserManager(false)} />}
        {showChangePassword && <ChangePasswordForm onClose={() => setShowChangePassword(false)} />}

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

                <div className="flex justify-between items-center flex-wrap gap-2">
                  <button
                    onClick={handleResetMonthTab}
                    className="text-xs text-mist-300/70 hover:text-signal-rose transition-colors"
                  >
                    Reiniciar este mês (voltar para copiar/começar em branco)
                  </button>
                  <button
                    onClick={() => setShowTagManager((v) => !v)}
                    className="text-xs text-signal-blue hover:underline"
                  >
                    {showTagManager ? "Ocultar categorias" : "Categorias (quem paga)"}
                  </button>
                </div>
                {showTagManager && (
                  <TagManager tab={activeTab} tags={currentTags} onChange={updateTags} onClose={() => setShowTagManager(false)} />
                )}

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
          Dados sincronizados na nuvem (Supabase). Acessíveis de qualquer aparelho com o mesmo login.
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
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <OwlMark size={64} />
      </div>
    );
  }
  return currentUser ? <AppShell /> : <LoginScreen />;
}
