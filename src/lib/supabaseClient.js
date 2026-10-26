import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.warn("Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. Configure o .env.local (veja .env.example).");
}

// createClient lança erro com URL vazia; usa um valor inofensivo para o app
// conseguir mostrar a tela de "configuração faltando" em vez de quebrar em branco.
export const supabase = createClient(url || "http://localhost", anonKey || "missing");
