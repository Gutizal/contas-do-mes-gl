import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, Users } from "lucide-react";

// Botão redondo com a inicial do usuário; abre o menu de conta.
export default function AccountMenu({ user, onUsers, onPassword, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => (e.type === "keydown" ? e.key === "Escape" && setOpen(false) : !ref.current?.contains(e.target) && setOpen(false));
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-mist-100 hover:bg-ink-600/70";
  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-600 font-display text-sm font-bold text-owl-300 ring-1 ring-ink-500 transition hover:ring-owl-500/60"
      >
        {(user.name || user.email || "?").trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-ink-500 bg-ink-800 p-1.5 shadow-2xl">
          <div className="border-b border-ink-600 px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-mist-50">{user.name}</p>
            <p className="truncate text-xs text-mist-300">{user.email}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-owl-300">{user.role === "admin" ? "Administrador" : "Membro"}</p>
          </div>
          <div className="pt-1.5">
            {user.role === "admin" && (
              <button role="menuitem" className={item} onClick={run(onUsers)}>
                <Users size={16} className="text-mist-300" /> Usuários
              </button>
            )}
            <button role="menuitem" className={item} onClick={run(onPassword)}>
              <KeyRound size={16} className="text-mist-300" /> Trocar senha
            </button>
            <button role="menuitem" className={`${item} text-signal-rose`} onClick={run(onSignOut)}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
