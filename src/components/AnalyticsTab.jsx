import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { effectiveValue, fmtBRL, isVariable } from "../utils";
import { sortMonthKeys, monthKeyShort } from "../monthUtils";

const HEX = { blue: "#3E7BFA", rose: "#E85D75", violet: "#8C7CF0", teal: "#22B8A6", amber: "#E8A33D" };

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4 flex flex-col gap-1 min-w-[150px] flex-1">
      <span className="text-xs text-mist-300">{label}</span>
      <span className="text-xl font-mono font-semibold text-mist-50">{value}</span>
      {sub && <span className="text-xs text-mist-300/80">{sub}</span>}
    </div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "#111A2E",
  border: "1px solid #2A3655",
  borderRadius: 8,
  color: "#DDE3F2",
  fontSize: 12,
};

export default function AnalyticsTab({ datasets, selectedMonth }) {
  const [scope, setScope] = useState("ambos"); // pessoal | empresa | ambos

  const billsFor = (tabKey, monthKey) => datasets[tabKey].months[monthKey] || [];

  const bills = useMemo(() => {
    if (scope === "pessoal") return billsFor("pessoal", selectedMonth);
    if (scope === "empresa") return billsFor("empresa", selectedMonth);
    return [...billsFor("pessoal", selectedMonth), ...billsFor("empresa", selectedMonth)];
  }, [scope, datasets, selectedMonth]);

  const tags = useMemo(() => {
    const map = new Map();
    [...datasets.pessoal.tags, ...datasets.empresa.tags].forEach((t) => map.set(t.id, t));
    return [...map.values()];
  }, [datasets]);

  const total = bills.reduce((sum, b) => sum + effectiveValue(b), 0);
  const media = bills.length ? total / bills.length : 0;
  const maior = bills.reduce((max, b) => (effectiveValue(b) > effectiveValue(max || {}) ? b : max), null);
  const variaveis = bills.filter(isVariable).length;

  const byTag = tags
    .map((t) => ({ name: t.name, value: bills.filter((b) => b.tagId === t.id).reduce((s, b) => s + effectiveValue(b), 0), color: HEX[t.color] || HEX.blue }))
    .filter((t) => t.value > 0);

  const byBill = [...bills]
    .map((b) => ({ name: b.description || "sem nome", valor: effectiveValue(b) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const allMonthKeys = sortMonthKeys([...new Set([...Object.keys(datasets.pessoal.months), ...Object.keys(datasets.empresa.months)])]);
  const historyChart = allMonthKeys.map((k) => ({
    label: monthKeyShort(k),
    pessoal: (datasets.pessoal.months[k] || []).reduce((s, b) => s + effectiveValue(b), 0),
    empresa: (datasets.empresa.months[k] || []).reduce((s, b) => s + effectiveValue(b), 0),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-ink-800 border border-ink-600 p-1">
          {[
            { key: "ambos", label: "Pessoal + Empresa" },
            { key: "pessoal", label: "Pessoal" },
            { key: "empresa", label: "Empresa" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={[
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                scope === s.key ? "bg-signal-blue text-ink-950" : "text-mist-300 hover:text-mist-100",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-mist-300">Mostrando o mês selecionado nas abas Pessoal e Empresa</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Total considerado" value={fmtBRL(total)} sub={`${bills.length} conta${bills.length === 1 ? "" : "s"}`} />
        <StatCard label="Média por conta" value={fmtBRL(media)} />
        <StatCard label="Maior conta" value={maior ? fmtBRL(effectiveValue(maior)) : "não definido"} sub={maior?.description || ""} />
        <StatCard label="Contas com valor variável" value={String(variaveis)} sub={`de ${bills.length} no total`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4">
          <h3 className="text-sm font-medium text-mist-100 mb-3">Por responsável</h3>
          {byTag.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={byTag} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {byTag.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#111A2E" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#B4BDD6" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-mist-300/70 py-10 text-center">Sem categorias com valor ainda.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4">
          <h3 className="text-sm font-medium text-mist-100 mb-3">Maiores contas</h3>
          {byBill.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={byBill} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="#182238" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8B96B3", fontSize: 11 }} tickFormatter={(v) => fmtBRL(v)} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#B4BDD6", fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtBRL(v)} />
                <Bar dataKey="valor" fill="#3E7BFA" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-mist-300/70 py-10 text-center">Adicione contas para ver o gráfico.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4">
        <h3 className="text-sm font-medium text-mist-100 mb-3">Comparação entre os meses criados</h3>
        {historyChart.length > 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={historyChart}>
              <CartesianGrid stroke="#182238" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8B96B3", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8B96B3", fontSize: 11 }} tickFormatter={(v) => fmtBRL(v)} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#B4BDD6" }} />
              <Line type="monotone" dataKey="pessoal" name="Pessoal" stroke="#3E7BFA" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="empresa" name="Empresa" stroke="#22B8A6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-mist-300/70 py-10 text-center">
            Crie mais de um mês nas abas Pessoal ou Empresa (botão "+ Novo mês") para comparar a evolução entre eles.
          </p>
        )}
      </div>
    </div>
  );
}
