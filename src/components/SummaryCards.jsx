import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, CreditCard, Layers, Minus, Trophy, UserRoundX } from "lucide-react";
import StatCard from "./StatCard";
import { Card, ProgressBar } from "./ui";
import { compare, effectiveValue, installmentsOutlook, summarize, totalsByTag } from "../lib/calc";
import { fmtBRL, fmtPct, plural } from "../lib/format";
import { monthKeyLabel, monthKeyShort } from "../lib/months";
import { NO_TAG_HEX, tagHex } from "../lib/tagColors";

function DeltaChip({ cmp, previousKey }) {
  if (!cmp) return <span className="text-xs text-mist-400">Sem dados de {monthKeyLabel(previousKey)} para comparar</span>;
  const same = cmp.delta === 0;
  const up = cmp.delta > 0;
  const Icon = same ? Minus : up ? ArrowUpRight : ArrowDownRight;
  // gasto maior = alerta (rosa); menor = bom (verde)
  const tone = same ? "text-mist-300 bg-ink-600/60" : up ? "text-signal-rose bg-signal-rose/10" : "text-signal-green bg-signal-green/10";
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mist-300">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular ${tone}`}>
        <Icon size={13} />
        {same ? "igual" : `${up ? "+" : "−"}${fmtBRL(Math.abs(cmp.delta))}`}
        {cmp.pct !== null && !same && ` (${up ? "+" : "−"}${fmtPct(Math.abs(cmp.pct), 1)})`}
      </span>
      <span>vs {monthKeyLabel(previousKey)}</span>
    </span>
  );
}

function TagBreakdown({ rows: allRows, average, count }) {
  const rows = allRows.filter((r) => r.count > 0);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-bold text-mist-50">Por responsável</h3>
        <span className="text-xs text-mist-400">
          média {fmtBRL(average)} por conta · {plural(count, "conta", "contas")}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const color = r.tag ? tagHex(r.tag.color) : NO_TAG_HEX;
          return (
            <li key={r.tag?.id ?? "none"} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-mist-100">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="truncate">{r.tag ? r.tag.name : "Sem responsável"}</span>
                  <span className="shrink-0 text-xs text-mist-400">{plural(r.count, "conta", "contas")}</span>
                </span>
                <span className="shrink-0 font-semibold tabular text-mist-50">{fmtBRL(r.total)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-600">
                  <div className="h-full rounded-full" style={{ width: `${r.share}%`, background: color }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular text-mist-300">{fmtPct(r.share)}</span>
              </div>
              {r.total > 0 && (
                <p className="text-[11px] text-mist-400">
                  pago {fmtBRL(r.paid)} · falta {fmtBRL(r.pending)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// bills: contas do mês na aba atual. previous: { key, total|null } do mês anterior (mesma aba).
// combined: { total, parts:[{label,total}] } somando Pessoal + Empresa no mês.
export default function SummaryCards({ bills, tags, monthKey, previous, combined }) {
  const [more, setMore] = useState(false);
  const s = useMemo(() => summarize(bills), [bills]);
  const parcelas = useMemo(() => installmentsOutlook(bills, monthKey), [bills, monthKey]);
  const byTag = useMemo(() => totalsByTag(bills, tags), [bills, tags]);
  const cmp = compare(s.total, previous.total);
  const alerts = [
    s.noValueCount > 0 && { icon: AlertTriangle, text: `${plural(s.noValueCount, "conta sem valor", "contas sem valor")} (entram como R$ 0,00)` },
    s.noTagCount > 0 && { icon: UserRoundX, text: `${plural(s.noTagCount, "conta sem responsável", "contas sem responsável")}` },
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-3" aria-label="Resumo do mês">
      <Card className="flex flex-col gap-3.5 p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <span className="font-display text-3xl font-extrabold tabular text-mist-50 sm:text-4xl">{fmtBRL(s.total)}</span>
          <DeltaChip cmp={cmp} previousKey={previous.key} />
          {s.hasRange && (
            <span className="text-xs text-mist-400">
              Entre {fmtBRL(s.min)} e {fmtBRL(s.max)} (variáveis entram pela média da faixa)
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <ProgressBar value={s.pctPaid} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <span className="text-signal-green">
              Pago {fmtBRL(s.paid)} <span className="text-mist-400">({s.paidCount})</span>
            </span>
            <span className="font-semibold text-mist-200">{fmtPct(s.pctPaid)}</span>
            <span className="text-signal-amber">
              Falta {fmtBRL(s.pending)} <span className="text-mist-400">({s.pendingCount})</span>
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <StatCard icon={Trophy} label="Maior conta" value={s.biggest ? fmtBRL(effectiveValue(s.biggest)) : "—"} sub={s.biggest?.description || (s.biggest ? "sem nome" : "")} />
        <StatCard
          icon={CreditCard}
          label="Parcelas por vir"
          value={parcelas.count ? fmtBRL(parcelas.afterThisMonth) : "—"}
          sub={parcelas.count ? `${plural(parcelas.count, "conta", "contas")} · fim ${monthKeyShort(parcelas.lastMonthKey)}` : "nenhuma conta parcelada"}
        />
        <StatCard icon={Layers} label="Pessoal + Empresa" value={fmtBRL(combined.total)} accent="owl" sub={combined.parts.map((p) => `${p.label} ${fmtBRL(p.total)}`).join(" · ")} />
      </div>

      {alerts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {alerts.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5 rounded-full border border-signal-amber/30 bg-signal-amber/10 px-3 py-1 text-xs text-signal-amber">
              <Icon size={13} /> {text}
            </li>
          ))}
        </ul>
      )}

      {s.count > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="inline-flex items-center gap-1 self-start text-sm text-owl-400 hover:underline"
          >
            <ChevronDown size={15} className={`transition-transform ${more ? "rotate-180" : ""}`} />
            {more ? "Ocultar divisão por responsável" : "Ver divisão por responsável"}
          </button>
          {more && <TagBreakdown rows={byTag} average={s.average} count={s.count} />}
        </>
      )}
    </section>
  );
}
