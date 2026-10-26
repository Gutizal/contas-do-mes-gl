import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Download, FileText, Tags } from "lucide-react";
import Header from "./components/Header";
import SpaceBar from "./components/SpaceBar";
import OwlMark from "./components/OwlMark";
import MonthSwitcher from "./components/MonthSwitcher";
import MonthSetupPrompt from "./components/MonthSetupPrompt";
import SummaryCards from "./components/SummaryCards";
import BillsList from "./components/BillsList";
import TagManager from "./components/TagManager";
import { Toast, useToast } from "./components/Toast";
import { Button, Modal, Spinner } from "./components/ui";
import { useConfirm } from "./components/Confirm";
import { useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";
import UserManager from "./auth/UserManager";
import ChangePasswordForm from "./auth/ChangePasswordForm";
import { MissingConfigScreen, PendingApprovalScreen, ProfileMissingScreen, ResetPasswordScreen } from "./auth/StatusScreens";
import { useLedger } from "./hooks/useLedger";
import { flushPending } from "./data/cloudStore";
import { monthlyTotals, summarize } from "./lib/calc";
import { exportCSV, exportPDF } from "./lib/export";
import { currentMonthKey, findPreviousExistingMonth, monthKeyLabel, shiftMonthKey } from "./lib/months";
import { supabaseConfigured } from "./lib/supabaseClient";
import { safeGet, safeSet } from "./lib/storage";
import { plural } from "./lib/format";

// Recharts é grande: só carrega quando a aba Análises é aberta.
const AnalyticsTab = lazy(() => import("./components/AnalyticsTab"));

const TAB_LABEL = { pessoal: "Pessoal", empresa: "Empresa" };
const TABS = [
  ["pessoal", "Pessoal"],
  ["empresa", "Empresa"],
  ["analises", "Análises"],
];

const Splash = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <OwlMark size={72} />
  </div>
);

function Workspace({ ownerId }) {
  const { signOut } = useAuth();
  const { data, error, reload, monthKeys, actions } = useLedger(ownerId);
  const [tab, setTab] = useState("pessoal");
  // Sempre abre no mês atual (o mês escolhido não é "lembrado" entre acessos).
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [dialog, setDialog] = useState(null); // "tags"
  const [focusId, setFocusId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { toast, showToast } = useToast();
  const confirm = useConfirm();

  const activeTab = tab === "empresa" ? "empresa" : "pessoal";
  const tabData = data?.[activeTab];

  const derived = useMemo(() => {
    if (!data) return null;
    const bills = data[activeTab].months[selectedMonth] || [];
    const prevKey = shiftMonthKey(selectedMonth, -1);
    const prevBills = data[activeTab].months[prevKey];
    const parts = ["pessoal", "empresa"].map((t) => ({ label: TAB_LABEL[t], total: summarize(data[t].months[selectedMonth] || []).total }));
    const usage = {};
    Object.values(data[activeTab].months).forEach((list) => list.forEach((b) => b.tagId && (usage[b.tagId] = (usage[b.tagId] || 0) + 1)));
    return {
      bills,
      exists: Boolean(data[activeTab].months[selectedMonth]),
      previous: { key: prevKey, total: prevBills ? summarize(prevBills).total : null },
      combined: { total: Math.round(parts.reduce((s, p) => s + p.total, 0) * 100) / 100, parts },
      usage,
    };
  }, [data, activeTab, selectedMonth]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-sm text-sm text-signal-rose">{error}</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => reload()}>
            Tentar de novo
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    );
  }
  if (!data) return <Splash />;

  const { bills, exists, previous, combined, usage } = derived;
  const a = actions;
  const isAnalytics = tab === "analises";
  const monthsWithData = new Set(monthKeys);

  const handlePostpone = (id) => {
    const bill = bills.find((b) => b.id === id);
    const next = a.postponeBill(activeTab, selectedMonth, id);
    showToast(`“${bill?.description || "Conta sem nome"}” foi movida para ${monthKeyLabel(next)}.`);
  };

  const handleCopy = (fromKey) => {
    const { copied, finished } = a.copyMonth(activeTab, selectedMonth, fromKey);
    const parts = [`${plural(copied, "conta copiada", "contas copiadas")} de ${monthKeyLabel(fromKey)}.`];
    if (finished) parts.push(`${plural(finished, "parcelada já quitada ficou", "parceladas já quitadas ficaram")} de fora.`);
    showToast(parts.join(" "));
  };

  const handleAdd = () => setFocusId(a.addBill(activeTab, selectedMonth));

  const handleDeleteMonth = async () => {
    const n = ["pessoal", "empresa"].reduce((s, t) => s + (data[t].months[selectedMonth]?.length || 0), 0);
    const ok = await confirm({
      title: `Excluir ${monthKeyLabel(selectedMonth)}?`,
      message: `Isso apaga ${plural(n, "conta", "contas")} (Pessoal e Empresa) e não dá para desfazer.`,
      confirmLabel: "Excluir mês",
      danger: true,
    });
    if (ok) a.deleteMonth(selectedMonth);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reiniciar este mês?",
      message: `Apaga todas as contas de ${monthKeyLabel(selectedMonth)} na aba ${TAB_LABEL[activeTab]} e volta para “copiar ou começar em branco”. Não dá para desfazer.`,
      confirmLabel: "Reiniciar",
      danger: true,
    });
    if (ok) a.resetMonth(activeTab, selectedMonth);
  };

  const sections = () => [
    { label: "Pessoal", bills: data.pessoal.months[selectedMonth] || [], tags: data.pessoal.tags },
    { label: "Empresa", bills: data.empresa.months[selectedMonth] || [], tags: data.empresa.tags },
  ];
  const history = () => monthlyTotals(data, monthKeys);
  const fileBase = `contas-${selectedMonth}`;

  const handlePDF = async () => {
    setExporting(true);
    try {
      await exportPDF(`${fileBase}.pdf`, selectedMonth, sections(), history());
    } catch (err) {
      console.error(err);
      showToast("Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <main className="mx-auto flex max-w-6xl min-w-0 flex-col gap-5 px-4 pb-safe pt-5 sm:px-8 sm:pt-7">
        <nav className="grid grid-cols-3 gap-1 rounded-xl border border-ink-600 bg-ink-800/70 p-1 sm:inline-flex sm:self-start" role="tablist" aria-label="Seções">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-9 rounded-lg px-5 text-sm font-medium transition-colors ${tab === key ? "bg-ink-500 text-mist-50 shadow" : "text-mist-300 hover:text-mist-100"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <MonthSwitcher
          selected={selectedMonth}
          monthsWithData={monthsWithData}
          tabLabel={TAB_LABEL[activeTab]}
          canReset={!isAnalytics && exists}
          canDelete={monthsWithData.has(selectedMonth)}
          onSelect={setSelectedMonth}
          onReset={handleReset}
          onDelete={handleDeleteMonth}
        />

        {isAnalytics ? (
          <Suspense
            fallback={
              <div className="flex justify-center py-16 text-mist-300">
                <Spinner className="h-6 w-6" />
              </div>
            }
          >
            <AnalyticsTab data={data} monthKey={selectedMonth} monthKeys={monthKeys} />
          </Suspense>
        ) : !exists ? (
          <MonthSetupPrompt
            monthKey={selectedMonth}
            tabLabel={TAB_LABEL[activeTab]}
            suggestedFromKey={findPreviousExistingMonth(Object.keys(tabData.months), selectedMonth)}
            existingMonths={Object.keys(tabData.months)}
            onStartBlank={() => a.startMonthBlank(activeTab, selectedMonth)}
            onCopyFrom={handleCopy}
          />
        ) : (
          <>
            <SummaryCards bills={bills} tags={tabData.tags} monthKey={selectedMonth} previous={previous} combined={combined} />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-mist-50">
                Contas · {TAB_LABEL[activeTab]} <span className="font-medium text-mist-400">({bills.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setDialog("tags")}>
                  <Tags size={14} /> Categorias
                </Button>
                <Button size="sm" variant="ghost" onClick={() => exportCSV(`${fileBase}.csv`, selectedMonth, sections(), history())} title="Exportar o mês em CSV">
                  <Download size={14} /> CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={handlePDF} disabled={exporting} title="Exportar o mês em PDF">
                  {exporting ? <Spinner /> : <FileText size={14} />} PDF
                </Button>
              </div>
            </div>

            <BillsList
              bills={bills}
              tags={tabData.tags}
              focusId={focusId}
              onAdd={handleAdd}
              onUpdate={(id, fields) => a.updateBill(activeTab, selectedMonth, id, fields)}
              onRemove={(id) => a.removeBill(activeTab, selectedMonth, id)}
              onPostpone={handlePostpone}
              onPay={(id) => a.markPaid(activeTab, selectedMonth, id)}
            />
          </>
        )}
      </main>

      {dialog === "tags" && (
        <Modal title={`Categorias · ${TAB_LABEL[activeTab]}`} onClose={() => setDialog(null)}>
          <TagManager tags={tabData.tags} usage={usage} onAdd={(name, color) => a.addTag(activeTab, name, color)} onUpdate={(id, f) => a.updateTag(activeTab, id, f)} onRemove={(id) => a.removeTag(activeTab, id)} />
        </Modal>
      )}

      <Toast message={toast} />
    </>
  );
}

// Moldura: cabeçalho, escolha de "de quem são os dados" e diálogos da conta.
function AppShell() {
  const { currentUser, signOut, members, refreshMembers, sharedSpaces, spacesReady } = useAuth();
  const [viewingId, setViewingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null); // "users" | "password"
  const isAdmin = currentUser.role === "admin";
  const storageKey = `contas:espaco:${currentUser.id}`;

  useEffect(() => {
    if (isAdmin) refreshMembers();
  }, [isAdmin, refreshMembers]);

  // Espaços que a pessoa pode escolher: admin = todas as pessoas aprovadas; demais = quem compartilhou com ela.
  const spaces = useMemo(
    () => (isAdmin ? members.filter((m) => m.approved !== false && m.id !== currentUser.id).map((m) => ({ id: m.id, name: m.name })) : sharedSpaces),
    [isAdmin, members, sharedSpaces, currentUser.id]
  );

  // Escolha inicial: a última usada (se ainda existir); senão, quem recebeu um espaço compartilhado começa nele; senão, o próprio.
  useEffect(() => {
    if (viewingId || !spacesReady) return;
    const saved = safeGet(storageKey);
    const valid = saved && (saved === currentUser.id || spaces.some((s) => s.id === saved));
    setViewingId(valid ? saved : !isAdmin && spaces.length ? spaces[0].id : currentUser.id);
  }, [viewingId, spacesReady, spaces, isAdmin, currentUser.id, storageKey]);

  const switchSpace = (id) => {
    flushPending(); // grava o que estava na fila antes de trocar de espaço
    safeSet(storageKey, id);
    setViewingId(id);
  };

  if (!viewingId) return <Splash />;

  return (
    <div className="min-h-dvh">
      <Header user={currentUser} onReload={() => setReloadKey((k) => k + 1)} onUsers={() => setDialog("users")} onPassword={() => setDialog("password")} onSignOut={signOut} />
      <SpaceBar me={currentUser} spaces={spaces} viewingId={viewingId} isAdmin={isAdmin} onChange={switchSpace} />
      <Workspace key={`${viewingId}:${reloadKey}`} ownerId={viewingId} />

      {dialog === "users" && (
        <Modal title="Usuários" onClose={() => setDialog(null)} width="max-w-lg">
          <UserManager />
        </Modal>
      )}
      {dialog === "password" && (
        <Modal title="Trocar senha" onClose={() => setDialog(null)}>
          <ChangePasswordForm onDone={() => setDialog(null)} />
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const { loading, currentUser, profileMissing, recovery } = useAuth();

  if (!supabaseConfigured) return <MissingConfigScreen />;
  if (recovery) return <ResetPasswordScreen />;
  if (loading) return <Splash />;
  if (profileMissing) return <ProfileMissingScreen />;
  if (!currentUser) return <LoginScreen />;
  if (!currentUser.approved) return <PendingApprovalScreen />;
  return <AppShell />;
}
