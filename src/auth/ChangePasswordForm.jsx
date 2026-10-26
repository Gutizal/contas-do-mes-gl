import { useState } from "react";
import { MIN_PASSWORD, useAuth } from "./AuthContext";
import PasswordInput from "./PasswordInput";
import { Button, Field, Spinner } from "../components/ui";

export default function ChangePasswordForm({ onDone }) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-signal-green">Senha atualizada. Use a nova no próximo login.</p>
        <Button variant="primary" onClick={onDone}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nova senha" hint={`Mínimo de ${MIN_PASSWORD} caracteres.`}>
        {(id) => <PasswordInput id={id} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
      </Field>
      <Field label="Confirmar nova senha">
        {(id) => <PasswordInput id={id} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-signal-rose">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy && <Spinner />} Salvar nova senha
      </Button>
    </form>
  );
}
