import { useCallback, useEffect, useRef, useState } from "react";

// Aviso rápido no pé da tela. Uso: const { toast, showToast } = useToast();
export function useToast(duration = 4500) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback(
    (message) => {
      setToast(message);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, showToast };
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div role="status" className="pointer-events-auto max-w-md rounded-xl border border-ink-500 bg-ink-700 px-4 py-3 text-sm text-mist-50 shadow-2xl">
        {message}
      </div>
    </div>
  );
}
