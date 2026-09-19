import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ChangePasswordForm({ onClose }) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
  };

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/80 p-4 flex flex-col gap-3 max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mist-100">Trocar senha</h3>
        <button onClick={onClose} className="text-xs text-mist-300 hover:text-mist-100">
          Fechar
        </button>
      </div>

      {done ? (
        <p className="text-xs text-signal-teal">Senha atualizada. Use ela no seu próximo login.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist-300">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist-300">Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
            />
          </div>
          {error && <p className="text-xs text-signal-rose">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-md bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors disabled:opacity-60"
          >
            {busy ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}
    </div>
  );
}
