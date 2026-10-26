import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { currentMonthKey, monthKeyLabel, monthKeyOf, monthName, parseMonthKey, shiftMonthKey } from "../lib/months";
import { Button, IconButton } from "./ui";

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => (e.type === "keydown" ? e.key === "Escape" && setOpen(false) : !ref.current?.contains(e.target) && setOpen(false));
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function MonthPicker({ selected, monthsWithData, onSelect, onClose }) {
  const [year, setYear] = useState(parseMonthKey(selected).year);
  const now = currentMonthKey();
  return (
    <div className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-ink-500 bg-ink-800 p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <IconButton label="Ano anterior" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft size={16} />
        </IconButton>
        <span className="font-display text-sm font-bold text-mist-50">{year}</span>
        <IconButton label="Próximo ano" onClick={() => setYear((y) => y + 1)}>
          <ChevronRight size={16} />
        </IconButton>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => {
          const key = monthKeyOf(year, i);
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelect(key);
                onClose();
              }}
              aria-pressed={isSelected}
              className={[
                "relative h-11 rounded-lg text-sm transition-colors",
                isSelected ? "bg-owl-400 font-semibold text-ink-950" : "text-mist-100 hover:bg-ink-600/70",
                key === now && !isSelected ? "ring-1 ring-owl-500/70" : "",
              ].join(" ")}
            >
              {monthName(i + 1).slice(0, 3)}
              {monthsWithData.has(key) && (
                <span className={`absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? "bg-ink-950" : "bg-owl-400"}`} />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 flex items-center gap-3 text-[11px] text-mist-400">
        <span className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-owl-400" /> tem contas
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-owl-500/70" /> mês atual
        </span>
      </p>
    </div>
  );
}

export default function MonthSwitcher({ selected, monthsWithData, canReset, canDelete, tabLabel, onSelect, onReset, onDelete }) {
  const picker = usePopover();
  const menu = usePopover();
  const isCurrent = selected === currentMonthKey();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-ink-600 bg-ink-800/70 p-1">
        <IconButton label="Mês anterior" onClick={() => onSelect(shiftMonthKey(selected, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="relative" ref={picker.ref}>
          <button
            type="button"
            onClick={() => picker.setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={picker.open}
            className="flex h-9 min-w-[10.5rem] items-center justify-center gap-2 rounded-lg px-3 font-display text-sm font-bold text-mist-50 hover:bg-ink-700/70 sm:min-w-[12rem]"
          >
            <CalendarDays size={15} className="text-owl-400" />
            {monthKeyLabel(selected)}
          </button>
          {picker.open && <MonthPicker selected={selected} monthsWithData={monthsWithData} onSelect={onSelect} onClose={() => picker.setOpen(false)} />}
        </div>
        <IconButton label="Próximo mês" onClick={() => onSelect(shiftMonthKey(selected, 1))}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      {!isCurrent && (
        <Button size="sm" variant="secondary" onClick={() => onSelect(currentMonthKey())}>
          Mês atual
        </Button>
      )}

      {(canReset || canDelete) && (
        <div className="relative ml-auto" ref={menu.ref}>
          <IconButton label="Mais ações do mês" onClick={() => menu.setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menu.open}>
            <MoreHorizontal size={18} />
          </IconButton>
          {menu.open && (
            <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-ink-500 bg-ink-800 p-1.5 shadow-2xl">
              {canReset && (
                <button
                  role="menuitem"
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-mist-100 hover:bg-ink-600/70"
                  onClick={() => {
                    menu.setOpen(false);
                    onReset();
                  }}
                >
                  <RotateCcw size={16} className="mt-0.5 shrink-0 text-mist-300" />
                  <span>
                    Reiniciar este mês
                    <span className="block text-xs text-mist-400">Só na aba {tabLabel}: apaga as contas e volta para “copiar ou começar em branco”.</span>
                  </span>
                </button>
              )}
              {canDelete && (
                <button
                  role="menuitem"
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-signal-rose hover:bg-signal-rose/10"
                  onClick={() => {
                    menu.setOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Excluir este mês
                    <span className="block text-xs text-signal-rose/70">Apaga as contas de Pessoal e Empresa.</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
