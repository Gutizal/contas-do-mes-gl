import { Check, Clock3, CornerDownRight } from "lucide-react";

export default function StatusSelector({ status, onChangeStatus, onPostpone }) {
  const isPago = status === "pago";
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChangeStatus(isPago ? "pendente" : "pago")}
        title={isPago ? "Pago (clique para marcar como pendente)" : "Pendente (clique para marcar como pago)"}
        className={[
          "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
          isPago
            ? "bg-signal-teal/90 border-signal-teal text-ink-950"
            : "bg-ink-700 border-ink-500 text-signal-amber hover:border-mist-300",
        ].join(" ")}
      >
        {isPago ? <Check size={12} /> : <Clock3 size={12} />}
        {isPago ? "Pago" : "Pendente"}
      </button>
      <button
        type="button"
        onClick={onPostpone}
        title="Mover esta conta para o mês seguinte"
        className="h-6 w-6 inline-flex items-center justify-center rounded-full border border-ink-500 text-mist-300 hover:text-signal-violet hover:border-signal-violet transition-colors"
      >
        <CornerDownRight size={12} />
      </button>
    </div>
  );
}
