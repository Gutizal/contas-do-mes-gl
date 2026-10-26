// Pequeno "store" que diz se há gravações em andamento ou com erro, para a UI
// mostrar "Salvando…", "Salvo" ou "Não foi possível salvar".
let state = { pending: 0, error: null };
const listeners = new Set();

const set = (next) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};

export const getSyncState = () => state;
export const subscribeSync = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const syncStart = () => set({ pending: state.pending + 1 });
export const syncEnd = (error) => set({ pending: Math.max(state.pending - 1, 0), ...(error ? { error } : {}) });
export const syncClearError = () => set({ error: null });
