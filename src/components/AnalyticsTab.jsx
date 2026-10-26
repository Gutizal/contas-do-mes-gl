import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, CircleCheck, Clock3, CreditCard, Gauge, Sigma, Trophy, TrendingUp } from "lucide-react";
import StatCard from "./StatCard";
import { Card } from "./ui";
import { effectiveValue, historyStats, installmentsOutlook, monthlyTotals, summarize, totalsByTag } from "../lib/calc";
import { fmtBRL, fmtCompactBRL, fmtPct, plural } from "../lib/format";
import { monthKeyLabel, monthKeyShort } from "../lib/months";
import { NO_TAG_HEX, tagHex } from "../lib/tagColors";

const AXIS = { fill: "#8694AD", fontSize: 11 };
const TOOLTIP = { backgroundColor: "#0F1623", border: "1px solid #2A3853", borderRadius: 10, color: "#DCE4F0", fontSize: 12 };
const SCOPES = [
  ["ambos", "Pessoal + Empresa"],
  ["pessoal", "Pessoal"],
  ["empresa", "Empresa"],
];

const Empty = ({ children }) => <p className="py-10 text-center text-sm text-mist-400">{children}</p>;

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="min-w-0 p-4">
      <h3 className="font-display text-sm font-bold text-mist-50">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-mist-400">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </Card>
  );
}

export default function AnalyticsTab({ data, monthKey, monthKeys }) {
  const [scope, setScope] = useState("ambos");

  const tabs = scope === "ambos" ? ["pessoal", "empresa"] : [scope];
  const bills = useMemo(() => tabs.flatMap((t) => data[t].months[monthKey] || []), [data, monthKey, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const tags = useMemo(() => tabs.flatMap((t) => data[t].tags), [data, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = useMemo(() => summarize(bills), [bills]);
  const parcelas = useMemo(() => installmentsOutlook(bills, monthKey), [bills, monthKey]);

  const byTag = useMemo(
    () => totalsByTag(bills, tags).filter((r) => r.total > 0).map((r) => ({ name: r.tag ? r.tag.name : "Sem responsável", value: r.total, color: r.tag ? tagHex(r.tag.color) : NO_TAG_HEX })),
    [bills, tags]
  );

  const topBills = useMemo(
    () => bills.map((b) => ({ name: b.description || "sem nome", valor: effectiveValue(b) })).sort((a, b) => b.valor - a.valor).slice(0, 8),
    [bills]
  );

  const history = useMemo(() => monthlyTotals(data, monthKeys), [data, monthKeys]);
  const historyChart = history.map((m) => ({ label: monthKeyShort(m.key), Pessoal: m.pessoal, Empresa: m.empresa }));
  const field = scope === "ambos" ? "total" : scope;
  const stats = useMemo(() => historyStats(history, field), [history, field]);
  const thisMonth = history.find((m) => m.key === monthKey);
  const vsAverage = stats && thisMonth && stats.average > 0 ? ((thisMonth[field] - stats.average) / stats.average) * 100 : null;

  const series = [
    { key: "Pessoal", color: "#3DD8F2", show: scope !== "empresa" },
    { key: "Empresa", color: "#9484F2", show: scope !== "pessoal" },
  ].filter((x) => x.show);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-ink-600 bg-ink-800/70 p-1" role="tablist">
          {SCOPES.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={scope === key}
              onClick={() => setScope(key)}
              className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${scope === key ? "bg-owl-400 text-ink-950" : "text-mist-300 hover:text-mist-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-mist-400">Mês selecionado: {monthKeyLabel(monthKey)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard icon={Sigma} label="Total do mês" value={fmtBRL(s.total)} accent="owl" sub={plural(s.count, "conta", "contas")} />
        <StatCard icon={Gauge} label="Andamento" value={fmtPct(s.pctPaid)} sub={`pago ${fmtBRL(s.paid)}`} accent="green" />
        <StatCard icon={Clock3} label="Ainda pendente" value={fmtBRL(s.pending)} accent="amber" sub={plural(s.pendingCount, "conta", "contas")} />
        <StatCard icon={CircleCheck} label="Já pago" value={fmtBRL(s.paid)} accent="green" sub={`${s.paidCount} de ${s.count}`} />
        <StatCard icon={Trophy} label="Maior conta" value={s.biggest ? fmtBRL(effectiveValue(s.biggest)) : "—"} sub={s.biggest?.description || ""} />
        <StatCard icon={Sigma} label="Média por conta" value={fmtBRL(s.average)} sub={`${s.variableCount} com valor variável`} />
        <StatCard
          icon={CreditCard}
          label="Parcelas por vir"
          value={parcelas.count ? fmtBRL(parcelas.afterThisMonth) : "—"}
          sub={parcelas.count ? `${plural(parcelas.count, "conta parcelada", "contas parceladas")} · fim ${monthKeyShort(parcelas.lastMonthKey)}` : "nenhuma parcela"}
        />
        <StatCard
          icon={TrendingUp}
          label="Média dos meses"
          value={stats ? fmtBRL(stats.average) : "—"}
          sub={vsAverage === null ? "precisa de mais de um mês" : `este mês está ${fmtPct(Math.abs(vsAverage), 1)} ${vsAverage >= 0 ? "acima" : "abaixo"}`}
          accent={vsAverage === null ? "default" : vsAverage > 0 ? "rose" : "green"}
        />
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <ChartCard title="Por responsável" subtitle="Quanto cada um paga neste mês">
          {byTag.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byTag} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="#0F1623">
                  {byTag.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#B3BFD3" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty>Sem contas com valor neste mês.</Empty>
          )}
        </ChartCard>

        <ChartCard title="Maiores contas" subtitle="As 8 maiores do mês">
          {topBills.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topBills} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid stroke="#1D2940" horizontal={false} />
                <XAxis type="number" tick={AXIS} tickFormatter={fmtCompactBRL} />
                <YAxis type="category" dataKey="name" width={96} tick={{ ...AXIS, fill: "#B3BFD3" }} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => fmtBRL(v)} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="valor" name="Valor" fill="#3DD8F2" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty>Adicione contas para ver o gráfico.</Empty>
          )}
        </ChartCard>
      </div>

      {parcelas.months.length > 1 && (
        <ChartCard title="Parcelas nos próximos meses" subtitle="O que ainda vai ser cobrado das contas parceladas (mesmo valor em todos os meses)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parcelas.months.map((m) => ({ label: monthKeyShort(m.monthKey), Parcelas: m.total }))}>
              <CartesianGrid stroke="#1D2940" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} tickFormatter={fmtCompactBRL} width={64} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v) => fmtBRL(v)} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="Parcelas" fill="#9484F2" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title="Evolução mês a mês" subtitle="Total considerado em cada mês criado">
        {historyChart.length > 1 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={historyChart}>
                <CartesianGrid stroke="#1D2940" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={fmtCompactBRL} width={64} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#B3BFD3" }} />
                {series.map((x) => (
                  <Line key={x.key} type="monotone" dataKey={x.key} stroke={x.color} strokeWidth={2.5} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {stats && (
              <div className="mt-3 grid grid-cols-1 gap-2 border-t border-ink-600 pt-3 text-xs text-mist-300 sm:grid-cols-3">
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={13} /> Mais caro: <strong className="text-mist-50">{monthKeyShort(stats.max.key)}</strong> · {fmtBRL(stats.max[field])}
                </span>
                <span>
                  Mais barato: <strong className="text-mist-50">{monthKeyShort(stats.min.key)}</strong> · {fmtBRL(stats.min[field])}
                </span>
                <span>
                  Média em {plural(stats.months, "mês", "meses")}: <strong className="text-mist-50">{fmtBRL(stats.average)}</strong>
                </span>
              </div>
            )}
          </>
        ) : (
          <Empty>Crie mais de um mês (setas no topo das abas Pessoal e Empresa) para comparar a evolução.</Empty>
        )}
      </ChartCard>
    </div>
  );
}
