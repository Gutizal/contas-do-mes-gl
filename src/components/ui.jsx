import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

// text-base no celular evita o zoom automático do iOS ao focar um campo.
export const inputCls =
  "w-full rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-base sm:text-sm text-mist-50 placeholder-mist-400 " +
  "focus:outline-none focus:border-owl-500 focus:ring-2 focus:ring-owl-500/25 transition-colors disabled:opacity-60";

const VARIANTS = {
  primary: "bg-owl-400 text-ink-950 font-semibold hover:bg-owl-300 active:bg-owl-500 disabled:hover:bg-owl-400",
  secondary: "border border-ink-500 text-mist-100 hover:border-mist-300 hover:bg-ink-700/60",
  ghost: "text-mist-300 hover:text-mist-50 hover:bg-ink-700/60",
  danger: "border border-signal-rose/50 text-signal-rose hover:bg-signal-rose/10",
};
const SIZES = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-base sm:text-sm" };

export function Button({ variant = "secondary", size = "md", className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-owl-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function IconButton({ label, className = "", children, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mist-300 transition-colors",
        "hover:bg-ink-700/70 hover:text-mist-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-owl-400/60",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-mist-200">
        {label}
      </label>
      {typeof children === "function" ? children(id) : children}
      {hint && <p className="text-[11px] text-mist-400">{hint}</p>}
    </div>
  );
}

export const Card = ({ className = "", ...props }) => (
  <div className={`rounded-2xl border border-ink-600 bg-ink-800/70 shadow-card ${className}`} {...props} />
);

export function Spinner({ className = "" }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

// Janela por cima da página. Fecha com Esc ou clicando fora; no celular vira uma folha na parte de baixo.
export function Modal({ title, onClose, children, width = "max-w-md" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative flex max-h-[90dvh] w-full ${width} flex-col rounded-t-2xl border border-ink-500 bg-ink-800 shadow-2xl outline-none sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-600 px-5 py-3.5">
          <h2 className="font-display text-base font-bold text-mist-50">{title}</h2>
          <IconButton label="Fechar" onClick={onClose} className="-mr-2">
            <X size={18} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, className = "" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-600 ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-signal-green to-owl-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
