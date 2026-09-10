import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function UserManager({ onClose }) {
  const { users, addUser, removeUser, currentUser } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("membro");
  const [error, setError] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || password.length < 4) return setError("Nome obrigatório e senha com pelo menos 4 caracteres.");
    if (users.some((u) => u.name.toLowerCase() === name.trim().toLowerCase())) return setError("Já existe um usuário com esse nome.");
    addUser(name.trim(), password, role);
    setName("");
    setPassword("");
  };

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/80 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mist-100">Usuários com acesso</h3>
        <button onClick={onClose} className="text-xs text-mist-300 hover:text-mist-100">
          Fechar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-md border border-ink-600 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-mist-100">{u.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-mist-300 border border-ink-500 rounded px-1.5 py-0.5">
                {u.role === "admin" ? "admin" : "membro"}
              </span>
            </div>
            {u.id !== currentUser?.id && u.role !== "admin" && (
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="text-xs text-signal-rose hover:underline"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 pt-2 border-t border-ink-700">
        <p className="text-xs text-mist-300">Adicionar novo acesso</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="flex-1 min-w-[120px] rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="flex-1 min-w-[120px] rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue"
          >
            <option value="membro">Membro</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-xs text-signal-rose">{error}</p>}
        <button
          type="submit"
          className="self-start rounded-md bg-signal-blue px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}
