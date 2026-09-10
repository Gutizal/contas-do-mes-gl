import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { monthKeyLabel, shiftMonthKey, sortMonthKeys } from "../monthUtils";

export default function MonthSwitcher({ existingMonths, selected, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const keys = sortMonthKeys(existingMonths);

  // agrupa os meses existentes por ano pra ficar fácil de achar no menu
  const byYear = keys.reduce((acc, k) => {
    const year = k.slice(0, 4);
    (acc[year] ||= []).push(k);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onSelect(shiftMonthKey(selected, -1))}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-ink-600 text-mist-300 hover:text-mist-100 hover:border-mist-300 transition-colors"
        title="Mês anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="min-w-[170px] px-3 py-1.5 rounded-lg border border-ink-600 bg-ink-800/60 text-sm font-medium text-mist-50 hover:border-mist-300 transition-colors text-center"
        >
          {monthKeyLabel(selected)}
        </button>
        {open && (
          <div className="absolute z-10 top-full mt-2 left-0 rounded-lg border border-ink-600 bg-ink-800 p-2 shadow-xl w-56 max-h-72 overflow-y-auto scrollbar-thin">
            {keys.length === 0 && <p className="text-xs text-mist-300/60 px-2 py-1.5">Nenhum mês criado ainda.</p>}
            {Object.keys(byYear)
              .sort()
              .reverse()
              .map((year) => (
                <div key={year} className="mb-1 last:mb-0">
                  <p className="text-[11px] text-mist-300/60 px-2 pt-1.5 pb-1">{year}</p>
                  {byYear[year]
                    .slice()
                    .reverse()
                    .map((k) => (
                      <div key={k} className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onSelect(k);
                            setOpen(false);
                          }}
                          className={[
                            "flex-1 text-left px-2 py-1.5 rounded-md text-sm transition-colors",
                            k === selected ? "bg-signal-blue text-ink-950" : "text-mist-100 hover:bg-ink-700/60",
                          ].join(" ")}
                        >
                          {monthKeyLabel(k)}
                        </button>
                        {keys.length > 1 && (
                          <button
                            onClick={() => onDelete(k)}
                            title="Excluir este mês"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-mist-300/60 hover:text-signal-rose hover:bg-signal-rose/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(shiftMonthKey(selected, 1))}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-ink-600 text-mist-300 hover:text-mist-100 hover:border-mist-300 transition-colors"
        title="Próximo mês"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
