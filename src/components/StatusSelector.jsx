import { Check, Clock3, CornerDownRight, Lock } from "lucide-react";

export default function StatusSelector({ status, onChangeStatus, onPostpone }) {
  const isPago = status === "pago";

  if (isPago) {
    // Uma vez pago, fica travado: não existe botão pra voltar a pendente,
    // nem faz sentido postergar uma conta que já foi quitada.
    return (
      <div
        title="Pago — não pode ser revertido"
        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium bg-signal-teal/90 border-signal-teal text-ink-950 cursor-default"
      >
        <Check size={12} />
        Pago
        <Lock size={10} className="opacity-70" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Marcar como pago? Essa ação não pode ser desfeita depois.")) onChangeStatus("pago");
        }}
        title="Marcar como pago (não dá pra desfazer depois)"
        className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors bg-ink-700 border-ink-500 text-signal-amber hover:border-mist-300"
      >
        <Clock3 size={12} />
        Pendente
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
