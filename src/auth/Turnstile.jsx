import { useEffect, useImperativeHandle, useRef, useState } from "react";

// CAPTCHA gratuito da Cloudflare (Turnstile). Só aparece se VITE_TURNSTILE_SITE_KEY estiver definida;
// sem a chave o app funciona normalmente. A chave do site é pública; a chave secreta fica só no painel do Supabase.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        scriptPromise = null; // permite tentar de novo
        reject(new Error("turnstile-script"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// O token vale para UMA verificação: depois de cada tentativa (certa ou errada), chame ref.current.reset().
export default function Turnstile({ onToken, onFail, ref }) {
  const box = useRef(null);
  const widgetId = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current(null);
      if (widgetId.current !== null && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_ENABLED) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !box.current) return;
        widgetId.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          size: "flexible",
          callback: (token) => {
            setFailed(false);
            onFailRef.current?.(false);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            setFailed(true);
            onFailRef.current?.(true);
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        onFailRef.current?.(true);
      });
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  if (!TURNSTILE_ENABLED) return null;
  return (
    <div>
      <div ref={box} className="min-h-[65px]" data-testid="turnstile" />
      {failed && <p className="mt-1 text-xs text-signal-amber">Não foi possível carregar a verificação de segurança. Você ainda pode tentar entrar; se não funcionar, desative bloqueadores de anúncios para este site ou recarregue a página.</p>}
    </div>
  );
}
