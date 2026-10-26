import { createContext, useCallback, useContext, useState } from "react";
import { Button, Modal } from "./ui";

// Substitui o window.confirm nativo (feio no celular e bloqueado em alguns navegadores embutidos).
// Uso: const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, danger })) { ... }
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setReq({ ...(typeof opts === "string" ? { message: opts } : opts), resolve })),
    []
  );

  const answer = (value) => {
    req.resolve(value);
    setReq(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && (
        <Modal title={req.title || "Confirmar"} onClose={() => answer(false)} width="max-w-sm">
          <p className="mb-5 text-sm leading-relaxed text-mist-200">{req.message}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => answer(false)}>Cancelar</Button>
            <Button variant={req.danger ? "danger" : "primary"} onClick={() => answer(true)} autoFocus>
              {req.confirmLabel || "Confirmar"}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
