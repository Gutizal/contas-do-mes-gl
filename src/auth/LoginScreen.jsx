import { useState } from "react";
import { useAuth } from "./AuthContext";
import OwlMark from "../components/OwlMark";

export default function LoginScreen() {
  const { hasAdmin, createAdmin, login } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "setup"
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const isSetup = mode === "setup" || !hasAdmin;

  const handleSetup = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !password) return setError("Preencha nome e senha.");
    if (password.length < 4) return setError("A senha precisa ter pelo menos 4 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    createAdmin(name.trim(), password);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const ok = login(name, password);
    if (!ok) setError("Nome ou senha incorretos.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-800/70 p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <OwlMark size={96} />
          <div>
            <h1 className="text-lg font-semibold text-mist-50">Contas do mês</h1>
            <p className="text-xs text-mist-300 mt-1">
              {isSetup ? "Criar o acesso de administrador." : "Entre com seu acesso para continuar."}
            </p>
          </div>
        </div>

        <form onSubmit={isSetup ? handleSetup : handleLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist-300">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
            />
          </div>
          {isSetup && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-mist-300">Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
              />
            </div>
          )}

          {error && <p className="text-xs text-signal-rose">{error}</p>}

          <button
            type="submit"
            className="mt-1 rounded-lg bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
          >
            {isSetup ? "Criar administrador e entrar" : "Entrar"}
          </button>
        </form>

        <div className="text-center -mt-2">
          {hasAdmin && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "setup" : "login");
                setError("");
              }}
              className="text-xs text-signal-blue hover:underline"
            >
              {mode === "login" ? "Esqueceu a senha?" : "Já tenho uma senha, fazer login"}
            </button>
          )}
        </div>

        {mode === "setup" && hasAdmin && (
          <p className="text-[11px] leading-relaxed text-mist-300/60 -mt-3">
            Recuperar senha automaticamente exigiria um servidor e um jeito de confirmar quem você é (e-mail, SMS
            etc.), que este app ainda não tem. Por enquanto, criar um novo administrador aqui substitui o acesso
            existente neste dispositivo.
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-mist-300/60">
          Este login é um controle de acesso simples salvo neste navegador, sem servidor por trás. Ele evita que
          alguém abra o app sem senha neste dispositivo, mas não sincroniza dados entre aparelhos diferentes.
        </p>
      </div>
    </div>
  );
}
