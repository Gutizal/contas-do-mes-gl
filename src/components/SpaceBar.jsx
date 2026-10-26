import { Users } from "lucide-react";

// Escolha de "de quem são os dados" na tela: os meus, os de outra pessoa (admin) ou um espaço compartilhado comigo.
export default function SpaceBar({ me, spaces, viewingId, isAdmin, onChange }) {
  if (spaces.length === 0) return null;
  const other = viewingId !== me.id ? spaces.find((s) => s.id === viewingId) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 sm:px-8">
      <label className="flex items-center gap-2 text-xs font-medium text-mist-300" htmlFor="space-view">
        <Users size={14} className="text-owl-400" /> Dados de
      </label>
      <select
        id="space-view"
        value={viewingId}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-ink-600 bg-ink-800 px-3 text-base text-mist-50 focus:border-owl-500 focus:outline-none focus:ring-2 focus:ring-owl-500/25 sm:text-sm"
      >
        <option value={me.id}>Meus dados ({me.name})</option>
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {isAdmin ? s.name : `${s.name} (compartilhado)`}
          </option>
        ))}
      </select>
      {other && (
        <span className="rounded-full border border-signal-amber/40 bg-signal-amber/10 px-3 py-1 text-xs text-signal-amber">
          {isAdmin
            ? `Modo administrador: você está vendo e editando os dados de ${other.name}`
            : `Espaço compartilhado: o que você alterar aqui vale para você e para ${other.name}`}
        </span>
      )}
    </div>
  );
}
