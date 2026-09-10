import { createContext, useContext, useEffect, useState } from "react";

const USERS_KEY = "contas-auth-users-v1";
const SESSION_KEY = "contas-auth-session-v1";

const AuthContext = createContext(null);

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Não foi possível ler usuários salvos:", e);
  }
  return [];
}

function loadSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(loadUsers);
  const [sessionUserId, setSessionUserId] = useState(loadSession);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (sessionUserId) localStorage.setItem(SESSION_KEY, sessionUserId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionUserId]);

  const currentUser = users.find((u) => u.id === sessionUserId) || null;

  const createAdmin = (name, password) => {
    const admin = { id: `user-${Date.now().toString(36)}`, name, password, role: "admin" };
    setUsers([admin]);
    setSessionUserId(admin.id);
  };

  const login = (name, password) => {
    const match = users.find((u) => u.name.toLowerCase() === name.trim().toLowerCase() && u.password === password);
    if (match) {
      setSessionUserId(match.id);
      return true;
    }
    return false;
  };

  const logout = () => setSessionUserId(null);

  const addUser = (name, password, role = "membro") => {
    const user = { id: `user-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`, name, password, role };
    setUsers((u) => [...u, user]);
  };

  const removeUser = (id) => setUsers((u) => u.filter((usr) => usr.id !== id));

  const updateUserPassword = (id, password) => setUsers((u) => u.map((usr) => (usr.id === id ? { ...usr, password } : usr)));

  return (
    <AuthContext.Provider
      value={{ users, currentUser, hasAdmin: users.length > 0, createAdmin, login, logout, addUser, removeUser, updateUserPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
