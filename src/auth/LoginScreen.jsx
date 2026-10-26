import { useRef, useState } from "react";
import { Mail } from "lucide-react";
import { GOOGLE_LOGIN_ENABLED, MIN_PASSWORD, useAuth } from "./AuthContext";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";
import Turnstile, { TURNSTILE_ENABLED } from "./Turnstile";
import { Button, Field, Spinner, inputCls } from "../components/ui";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const SUBTITLES = {
  login: "Entre para ver as contas do mês.",
  signup: "Crie seu acesso.",
  forgot: "Enviamos um link para você criar uma nova senha.",
};

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const captchaRef = useRef(null);
  // Se o widget não carrega, não trava a tela: quem decide é o servidor (Supabase), que recusa sem token válido.
  const waitingCaptcha = TURNSTILE_ENABLED && !captcha && !captchaFailed;

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
    setPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const mail = email.trim();
    if (!mail) return setError("Preencha o e-mail.");
    if (waitingCaptcha) return setError("Aguarde a verificação de segurança terminar e tente de novo.");

    if (mode === "forgot") {
      setBusy(true);
      const result = await requestPasswordReset(mail, captcha);
      setBusy(false);
      captchaRef.current?.reset();
      if (result.error) return setError(result.error);
      // não confirma se o e-mail existe (evita dar pista a quem não tem acesso)
      return setInfo("Se esse e-mail tiver conta, o link de redefinição já está a caminho. Veja a caixa de entrada e o spam.");
    }

    if (!password) return setError("Preencha a senha.");

    if (mode === "signup") {
      if (!name.trim()) return setError("Preencha seu nome.");
      if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      if (password !== confirm) return setError("As senhas não coincidem.");
      setBusy(true);
      const result = await signUp(name.trim(), mail, password, captcha);
      setBusy(false);
      captchaRef.current?.reset();
      if (result.error) return setError(result.error);
      if (result.needsConfirmation) return setInfo("Conta criada! Confirme seu e-mail (veja a caixa de entrada e o spam) e depois entre.");
      return;
    }

    setBusy(true);
    const result = await signIn(mail, password, captcha);
    setBusy(false);
    captchaRef.current?.reset();
    if (result.error) setError(result.error);
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setBusy(false);
      setError(result.error);
    }
  };

  return (
    <AuthLayout title="Contas do mês" subtitle={SUBTITLES[mode]}>
      {mode !== "forgot" && (
        <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-900 p-1">
          {[
            ["login", "Entrar"],
            ["signup", "Criar conta"],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              type="button"
              onClick={() => switchMode(key)}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${mode === key ? "bg-ink-600 text-mist-50" : "text-mist-300 hover:text-mist-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {GOOGLE_LOGIN_ENABLED && mode !== "forgot" && (
        <>
          <Button size="lg" className="w-full bg-white !text-ink-900 hover:!bg-mist-100 !border-transparent" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon />
            Continuar com Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-mist-400">
            <span className="h-px flex-1 bg-ink-600" />
            ou com e-mail
            <span className="h-px flex-1 bg-ink-600" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {mode === "signup" && (
          <Field label="Nome">
            {(id) => <input id={id} type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />}
          </Field>
        )}
        <Field label="E-mail">
          {(id) => (
            <input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              autoFocus={mode === "login"}
            />
          )}
        </Field>
        {mode !== "forgot" && (
          <Field label="Senha" hint={mode === "signup" ? `Mínimo de ${MIN_PASSWORD} caracteres.` : undefined}>
            {(id) => (
              <PasswordInput id={id} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
        )}
        {mode === "signup" && (
          <Field label="Confirmar senha">
            {(id) => <PasswordInput id={id} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm text-signal-rose">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="flex gap-2 rounded-lg border border-signal-green/30 bg-signal-green/10 px-3 py-2 text-sm text-signal-green">
            <Mail size={16} className="mt-0.5 shrink-0" />
            {info}
          </p>
        )}

        <Turnstile ref={captchaRef} onToken={setCaptcha} onFail={setCaptchaFailed} />

        <Button type="submit" variant="primary" size="lg" disabled={busy || waitingCaptcha} className="w-full">
          {busy || waitingCaptcha ? <Spinner /> : null}
          {waitingCaptcha ? "Verificando…" : mode === "forgot" ? "Enviar link" : mode === "signup" ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        {mode === "forgot" ? (
          <button type="button" onClick={() => switchMode("login")} className="text-sm text-owl-400 hover:underline">
            Voltar para o login
          </button>
        ) : (
          mode === "login" && (
            <button type="button" onClick={() => switchMode("forgot")} className="text-sm text-mist-300 hover:text-mist-50 hover:underline">
              Esqueci minha senha
            </button>
          )
        )}
      </div>

      {mode === "signup" && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-mist-400">
          O primeiro cadastro vira administrador. Os próximos precisam ser aprovados por ele antes de ver as contas.
        </p>
      )}
    </AuthLayout>
  );
}
