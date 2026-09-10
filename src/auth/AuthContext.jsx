import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setProfile(null);
      return;
    }
    // pequeno atraso: o trigger que cria o perfil roda logo após o cadastro
    let cancelled = false;
    (async () => {
      let p = await fetchProfile(session.user.id);
      if (!p) {
        await new Promise((r) => setTimeout(r, 800));
        p = await fetchProfile(session.user.id);
      }
      if (!cancelled) setProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const refreshMembers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (!error) setMembers(data || []);
  };

  const signUp = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { needsConfirmation: true };
    return {};
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = () => supabase.auth.signOut();

  const setMemberRole = async (id, role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) refreshMembers();
    return !error;
  };

  const loading = session === undefined || (session && profile === null);
  const currentUser = session && profile ? { id: profile.id, name: profile.name, role: profile.role, email: session.user.email } : null;

  return (
    <AuthContext.Provider
      value={{ loading, currentUser, members, refreshMembers, signUp, signIn, signOut, setMemberRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
