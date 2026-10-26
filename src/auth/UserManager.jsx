import { useEffect, useState } from "react";
import { Check, Share2, ShieldCheck, Trash2, UserX } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Button, Spinner } from "../components/ui";
import { useConfirm } from "../components/Confirm";

function MemberRow({ member, isMe, onAction, busy, shared }) {
  const admin = member.role === "admin";
  const pending = member.approved === false;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-600 bg-ink-700/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-mist-50">{member.name}</span>
        {isMe && <span className="text-[11px] text-mist-400">(você)</span>}
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            pending ? "border-signal-amber/50 text-signal-amber" : admin ? "border-owl-500/50 text-owl-300" : "border-ink-500 text-mist-300"
          }`}
        >
          {pending ? "pendente" : admin ? "admin" : "membro"}
        </span>
      </div>
      {!isMe && (
        <div className="flex items-center gap-1">
          {pending ? (
            <>
              <Button size="sm" variant="primary" disabled={busy} onClick={() => onAction("approve", member)}>
                <Check size={14} /> Aprovar
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => onAction("remove", member)}>
                <UserX size={14} /> Recusar
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant={shared ? "secondary" : "ghost"}
                disabled={busy}
                onClick={() => onAction("share", member)}
                aria-pressed={shared}
                title="Quem tem acesso vê e edita o seu espaço (além do espaço próprio dela)"
              >
                <Share2 size={14} /> {shared ? "Acessa o meu espaço" : "Compartilhar meu espaço"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("role", member)}>
                <ShieldCheck size={14} /> {admin ? "Tornar membro" : "Tornar admin"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("remove", member)} className="hover:!text-signal-rose" aria-label={`Remover ${member.name}`}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function UserManager() {
  const { members, refreshMembers, currentUser, setMemberRole, setMemberApproved, removeMember, shares, setSpaceShared } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    refreshMembers().then(() => setLoaded(true));
  }, [refreshMembers]);

  const handle = async (action, member) => {
    setMessage("");
    if (action === "share") {
      setBusy(true);
      const done = await setSpaceShared(member.id, !shares.includes(member.id));
      setBusy(false);
      if (!done) setMessage("Não foi possível alterar o compartilhamento. Confira se a migração 004 foi aplicada.");
      return;
    }
    if (action === "remove" && !(await confirm({ title: "Remover usuário?", message: `Remover ${member.name}? O login e TODOS os dados dessa pessoa (contas, categorias e meses) serão apagados e não dá para desfazer.`, confirmLabel: "Remover", danger: true }))) return;
    setBusy(true);
    let ok = false;
    if (action === "approve") ok = await setMemberApproved(member.id, true);
    if (action === "role") ok = await setMemberRole(member.id, member.role === "admin" ? "membro" : "admin");
    if (action === "remove") ok = await removeMember(member.id);
    setBusy(false);
    if (!ok) setMessage("Não foi possível concluir. Se for a primeira vez, rode a migração 003 no SQL Editor do Supabase (veja o README).");
  };

  const pending = members.filter((m) => m.approved === false);
  const active = members.filter((m) => m.approved !== false);

  if (!loaded) {
    return (
      <p className="flex items-center gap-2 text-sm text-mist-300">
        <Spinner /> Carregando…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-mist-300">
        Quem cria conta pela tela de login fica <strong className="text-mist-100">pendente</strong> até você aprovar. Cada pessoa vê e edita só o próprio espaço; você, como admin, acessa os de todos. Use “Compartilhar meu espaço” para quem deve ver e editar as mesmas contas que você (por exemplo, o casal).
      </p>
      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-signal-amber">Aguardando aprovação ({pending.length})</h3>
          <ul className="flex flex-col gap-2">
            {pending.map((m) => (
              <MemberRow key={m.id} member={m} isMe={m.id === currentUser?.id} onAction={handle} busy={busy} shared={false} />
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-mist-300">Com acesso ({active.length})</h3>
        <ul className="flex flex-col gap-2">
          {active.map((m) => (
            <MemberRow key={m.id} member={m} isMe={m.id === currentUser?.id} onAction={handle} busy={busy} shared={shares.includes(m.id)} />
          ))}
        </ul>
      </section>
      {message && (
        <p role="alert" className="rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-xs text-signal-rose">
          {message}
        </p>
      )}
    </div>
  );
}
