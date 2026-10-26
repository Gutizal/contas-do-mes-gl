import { Check, Clock3, CornerDownRight, Lock } from "lucide-react";
import { useConfirm } from "./Confirm";

export default function StatusSelector({ status, onPay, onPostpone }) {
  const confirm = useConfirm();
  if (status === "pago") {
    // Uma vez pago, fica travado: não existe botão para voltar a pendente,
    // nem faz sentido postergar uma conta já quitada.
    return (
      <div
        title="Pago — não pode ser revertido"
        className="inline-flex h-8 cursor-default items-center gap-1.5 rounded-full border border-signal-green/40 bg-signal-green/15 px-3 text-xs font-semibold text-signal-green xl:h-7"
      >
        <Check size={13} />
        Pago
        <Lock size={10} className="opacity-60" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={async () => {
          if (await confirm({ title: "Marcar como pago?", message: "Essa ação não pode ser desfeita depois.", confirmLabel: "Marcar como pago" })) onPay();
        }}
        title="Marcar como pago (não dá para desfazer)"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-signal-amber/40 bg-signal-amber/10 px-3 text-xs font-semibold text-signal-amber transition-colors hover:bg-signal-amber/20 xl:h-7"
      >
        <Clock3 size={13} />
        Pendente
      </button>
      <button
        type="button"
        onClick={onPostpone}
        title="Mover esta conta para o mês seguinte"
        aria-label="Postergar para o mês seguinte"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-500 text-mist-300 transition-colors hover:border-signal-violet hover:text-signal-violet xl:h-7 xl:w-7"
      >
        <CornerDownRight size={13} />
      </button>
    </div>
  );
}
