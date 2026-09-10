import { useState } from "react";
import { useAuth } from "./AuthContext";
import OwlMark from "../components/OwlMark";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (isSignup) {
      if (!name.trim() || !email.trim() || !password) return setError("Preencha nome, e-mail e senha.");
      if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
      if (password !== confirm) return setError("As senhas não coincidem.");
      setBusy(true);
      const result = await signUp(name.trim(), email.trim(), password);
      setBusy(false);
      if (result.error) return setError(result.error);
      if (result.needsConfirmation) return setInfo("Conta criada. Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).");
    } else {
      if (!email.trim() || !password) return setError("Preencha e-mail e senha.");
      setBusy(true);
      const result = await signIn(email.trim(), password);
      setBusy(false);
      if (result.error) return setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-800/70 p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <OwlMark size={96} />
          <div>
            <h1 className="text-lg font-semibold text-mist-50">Contas do mês</h1>
            <p className="text-xs text-mist-300 mt-1">
              {isSignup ? "Criar sua conta de acesso." : "Entre com seu acesso para continuar."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isSignup && (
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
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist-300">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
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
          {isSignup && (
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
          {info && <p className="text-xs text-signal-teal">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-lg bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors disabled:opacity-60"
          >
            {busy ? "Um instante..." : isSignup ? "Criar conta e entrar" : "Entrar"}
          </button>
        </form>

        <div className="text-center -mt-2">
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError("");
              setInfo("");
            }}
            className="text-xs text-signal-blue hover:underline"
          >
            {isSignup ? "Já tenho conta, fazer login" : "Ainda não tenho conta, criar uma"}
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-mist-300/60">
          O login agora é uma conta de verdade, sincronizada entre qualquer aparelho. O primeiro e-mail cadastrado
          vira administrador automaticamente; os próximos entram como membro.
        </p>
      </div>
    </div>
  );
}
