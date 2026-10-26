import { useState } from "react";
import { MailCheck, ShieldAlert, Settings2 } from "lucide-react";
import { MIN_PASSWORD, useAuth } from "./AuthContext";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";
import { Button, Field, Spinner } from "../components/ui";

// Conta criada, mas ainda não liberada por um administrador.
export function PendingApprovalScreen() {
  const { currentUser, reloadProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    await reloadProfile();
    setChecking(false);
  };
  return (
    <AuthLayout title="Aguardando liberação" subtitle="Seu cadastro foi criado, mas ainda precisa ser aprovado.">
      <div className="flex flex-col items-center gap-4 text-center">
        <MailCheck className="text-owl-400" size={32} />
        <p className="text-sm text-mist-200">
          Peça para um administrador liberar o acesso de <strong className="text-mist-50">{currentUser?.email}</strong>. Depois é só tocar em “Verificar de novo”.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button variant="primary" size="lg" onClick={check} disabled={checking}>
            {checking && <Spinner />} Verificar de novo
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

// Entrou no Supabase Auth mas não existe perfil (ex.: usuário criado antes do trigger).
export function ProfileMissingScreen() {
  const { sessionEmail, reloadProfile, signOut } = useAuth();
  return (
    <AuthLayout title="Não foi possível entrar" subtitle="Seu login funcionou, mas o perfil não foi encontrado.">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="text-signal-amber" size={32} />
        <p className="text-sm text-mist-200">
          {sessionEmail} está autenticado, mas não tem perfil no banco. Tente de novo; se persistir, avise o administrador.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button variant="primary" size="lg" onClick={reloadProfile}>
            Tentar de novo
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

// Chegou pelo link de "esqueci minha senha": precisa definir a nova senha antes de usar o app.
export function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha a senha que você vai usar daqui para frente.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nova senha" hint={`Mínimo de ${MIN_PASSWORD} caracteres.`}>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
        </Field>
        <Field label="Confirmar nova senha">
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm text-signal-rose">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy && <Spinner />} Salvar e entrar
        </Button>
        <Button variant="ghost" onClick={signOut}>
          Cancelar
        </Button>
      </form>
    </AuthLayout>
  );
}

export function MissingConfigScreen() {
  return (
    <AuthLayout title="Configuração faltando" subtitle="O app não encontrou a conexão com o Supabase.">
      <div className="flex flex-col items-center gap-3 text-center text-sm text-mist-200">
        <Settings2 className="text-signal-amber" size={32} />
        <p>
          Defina <code className="rounded bg-ink-900 px-1.5 py-0.5 text-owl-300">VITE_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-ink-900 px-1.5 py-0.5 text-owl-300">VITE_SUPABASE_ANON_KEY</code> (no <code>.env.local</code> ou em Environment Variables da Vercel) e faça um novo deploy.
        </p>
      </div>
    </AuthLayout>
  );
}
