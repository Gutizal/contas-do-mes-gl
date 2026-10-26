import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { translateAuthError } from "../lib/authErrors";

const AuthContext = createContext(null);

export const GOOGLE_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "true";
export const MIN_PASSWORD = 8;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// O perfil é criado por um trigger logo após o cadastro; tenta algumas vezes.
async function fetchProfile(userId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) return data;
    if (error) console.error("Erro ao buscar perfil:", error);
    await wait(500 + attempt * 500);
  }
  return null;
}

// Funções administrativas do banco (migração 003). Se ainda não foram
// criadas, cai no update direto para o app continuar funcionando.
async function adminCall(fn, args, fallback) {
  const { error } = await supabase.rpc(fn, args);
  if (!error) return true;
  if (error.code === "PGRST202" || /could not find the function/i.test(error.message || "")) return fallback();
  console.error(`Erro em ${fn}:`, error);
  return false;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando
  const [profile, setProfile] = useState(undefined); // undefined = carregando | null = não encontrado
  const [members, setMembers] = useState([]);
  const [recovery, setRecovery] = useState(false); // chegou pelo link "esqueci minha senha"
  const [sharedSpaces, setSharedSpaces] = useState([]); // espaços de outras pessoas a que tenho acesso
  const [shares, setShares] = useState([]); // (admin) quem tem acesso ao MEU espaço
  const [spacesReady, setSpacesReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setProfile(undefined);
    setProfile(await fetchProfile(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(undefined);
      return;
    }
    let cancelled = false;
    fetchProfile(userId).then((p) => !cancelled && setProfile(p));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Compartilhamentos: o admin enxerga todos (RLS); os demais, só os próprios.
  const refreshSpaces = useCallback(async () => {
    if (!userId) return;
    const { data: rows, error } = await supabase.from("space_members").select("owner_id, member_id");
    if (error) {
      // banco sem a migração 004: sem compartilhamento, o app segue com o espaço próprio
      setSharedSpaces([]);
      setShares([]);
      setSpacesReady(true);
      return;
    }
    const ownerIds = rows.filter((r) => r.member_id === userId).map((r) => r.owner_id);
    setShares(rows.filter((r) => r.owner_id === userId).map((r) => r.member_id));
    if (ownerIds.length) {
      const { data: people } = await supabase.from("profiles").select("id, name").in("id", ownerIds);
      setSharedSpaces((people || []).map((p) => ({ id: p.id, name: p.name })));
    } else {
      setSharedSpaces([]);
    }
    setSpacesReady(true);
  }, [userId]);

  const approved = Boolean(profile) && profile.approved !== false;
  useEffect(() => {
    if (!userId) {
      setSharedSpaces([]);
      setShares([]);
      setSpacesReady(false);
      return;
    }
    if (approved) refreshSpaces();
  }, [userId, approved, refreshSpaces]);

  // Só o admin cria/remove compartilhamentos (o banco recusa de qualquer outra pessoa).
  const setSpaceShared = async (memberId, on) => {
    const { error } = on
      ? await supabase.from("space_members").insert({ owner_id: userId, member_id: memberId })
      : await supabase.from("space_members").delete().eq("owner_id", userId).eq("member_id", memberId);
    if (error) console.error("Erro ao alterar compartilhamento:", error);
    else await refreshSpaces();
    return !error;
  };

  const refreshMembers = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (!error) setMembers(data || []);
  }, []);

  // captchaToken: só é enviado quando o Turnstile está ligado; o Supabase o valida se a proteção estiver ativa no painel.
  const signUp = async (name, email, password, captchaToken) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, ...(captchaToken && { captchaToken }) } });
    if (error) return { error: translateAuthError(error.message) };
    if (!data.session) return { needsConfirmation: true };
    return {};
  };

  const signIn = async (email, password, captchaToken) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password, ...(captchaToken && { options: { captchaToken } }) });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signOut = async () => {
    setRecovery(false);
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: translateAuthError(error.message) };
    setRecovery(false);
    return {};
  };

  const requestPasswordReset = async (email, captchaToken) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin, ...(captchaToken && { captchaToken }) });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const setMemberRole = async (id, role) => {
    const ok = await adminCall("admin_set_role", { target: id, new_role: role }, async () => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      return !error;
    });
    if (ok) refreshMembers();
    return ok;
  };

  const setMemberApproved = async (id, approved) => {
    const ok = await adminCall("admin_set_approved", { target: id, ok: approved }, async () => {
      const { error } = await supabase.from("profiles").update({ approved }).eq("id", id);
      return !error;
    });
    if (ok) refreshMembers();
    return ok;
  };

  const removeMember = async (id) => {
    const ok = await adminCall("admin_remove_member", { target: id }, async () => false);
    if (ok) refreshMembers();
    return ok;
  };

  const profileLoading = Boolean(session) && profile === undefined;
  const loading = session === undefined || profileLoading;
  const profileMissing = Boolean(session) && profile === null;

  const currentUser = useMemo(
    () =>
      session && profile
        ? {
            id: profile.id,
            name: profile.name,
            role: profile.role,
            email: session.user.email,
            // antes da migração 003 a coluna não existe: todos contam como aprovados
            approved: profile.approved !== false,
          }
        : null,
    [session, profile]
  );

  return (
    <AuthContext.Provider
      value={{
        loading,
        currentUser,
        profileMissing,
        sessionEmail: session?.user?.email ?? null,
        recovery,
        members,
        refreshMembers,
        sharedSpaces,
        shares,
        spacesReady,
        refreshSpaces,
        setSpaceShared,
        reloadProfile: loadProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        setMemberRole,
        setMemberApproved,
        removeMember,
        updatePassword,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
