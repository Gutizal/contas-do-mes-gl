import { Check, CloudOff, Loader2 } from "lucide-react";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { syncClearError } from "../data/syncStatus";

// Mostra se o que foi digitado já está salvo na nuvem.
export default function SyncBadge({ onReload }) {
  const { pending, error } = useSyncStatus();

  if (error) {
    return (
      <button
        type="button"
        onClick={() => {
          syncClearError();
          onReload?.();
        }}
        title="Toque para recarregar os dados salvos"
        className="inline-flex items-center gap-1.5 rounded-full border border-signal-rose/40 bg-signal-rose/10 px-2.5 py-1 text-[11px] font-medium text-signal-rose"
      >
        <CloudOff size={13} /> <span className="hidden sm:inline">{error}</span>
        <span className="sm:hidden">Erro ao salvar</span>
      </button>
    );
  }
  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-500 px-2.5 py-1 text-[11px] font-medium text-mist-300" role="status">
        <Loader2 size={13} className="animate-spin" /> Salvando…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-mist-400" role="status">
      <Check size={13} className="text-signal-green" /> <span className="hidden sm:inline">Tudo salvo</span>
    </span>
  );
}
