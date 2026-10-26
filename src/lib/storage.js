// localStorage pode falhar (janela privada, dados bloqueados): nunca deixa isso quebrar a tela.
export const safeGet = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSet = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: só não lembra a escolha */
  }
};
