import { useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function UserManager({ onClose }) {
  const { members, refreshMembers, currentUser, setMemberRole } = useAuth();

  useEffect(() => {
    refreshMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/80 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mist-100">Usuários com acesso</h3>
        <button onClick={onClose} className="text-xs text-mist-300 hover:text-mist-100">
          Fechar
        </button>
      </div>

      <p className="text-xs text-mist-300">
        Qualquer pessoa com o link do app pode criar a própria conta pela tela de login. Aqui você só ajusta o papel
        de cada uma.
      </p>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border border-ink-600 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-mist-100">{m.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-mist-300 border border-ink-500 rounded px-1.5 py-0.5">
                {m.role === "admin" ? "admin" : "membro"}
              </span>
            </div>
            {m.id !== currentUser?.id && (
              <button
                type="button"
                onClick={() => setMemberRole(m.id, m.role === "admin" ? "membro" : "admin")}
                className="text-xs text-signal-blue hover:underline"
              >
                {m.role === "admin" ? "Rebaixar para membro" : "Tornar admin"}
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="text-xs text-mist-300/60 italic">Carregando...</p>}
      </div>
    </div>
  );
}
