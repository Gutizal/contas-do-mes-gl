import { effectiveValue, fmtBRL } from "../utils";

function Card({ label, value, accent, sub }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3 sm:p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs text-mist-300 truncate">{label}</span>
      <span className={`text-lg sm:text-2xl font-mono font-semibold break-words ${accent ?? "text-mist-50"}`}>{value}</span>
      {sub && <span className="text-xs text-mist-300/80 truncate">{sub}</span>}
    </div>
  );
}

export default function SummaryCards({ bills, tags }) {
  const total = bills.reduce((sum, b) => sum + effectiveValue(b), 0);
  const semCategoria = bills.filter((b) => !b.tagId).length;
  const media = bills.length ? total / bills.length : 0;
  const totalPago = bills.filter((b) => b.status === "pago").reduce((sum, b) => sum + effectiveValue(b), 0);
  const totalPendente = total - totalPago;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      <Card label="Total considerado no mês" value={fmtBRL(total)} accent="text-signal-blue" sub={`${bills.length} conta${bills.length === 1 ? "" : "s"}`} />
      <Card label="Já pago" value={fmtBRL(totalPago)} accent="text-signal-teal" />
      <Card label="Ainda pendente" value={fmtBRL(totalPendente)} accent="text-signal-amber" />
      <Card label="Média por conta" value={fmtBRL(media)} />
      {tags.map((tag) => {
        const tagTotal = bills.filter((b) => b.tagId === tag.id).reduce((sum, b) => sum + effectiveValue(b), 0);
        return <Card key={tag.id} label={tag.name} value={fmtBRL(tagTotal)} />;
      })}
      {semCategoria > 0 && (
        <Card label="Sem categoria definida" value={semCategoria} accent="text-signal-amber" sub="clique em quem paga, na tabela" />
      )}
    </div>
  );
}
