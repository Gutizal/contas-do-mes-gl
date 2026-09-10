import { useState } from "react";
import { monthKeyLabel, sortMonthKeys } from "../monthUtils";

export default function MonthSetupPrompt({ monthKey, suggestedFromKey, existingMonths, onStartBlank, onCopyFrom }) {
  const [pickingOther, setPickingOther] = useState(false);
  const otherKeys = sortMonthKeys(existingMonths).reverse();

  return (
    <div className="rounded-xl border border-dashed border-ink-500 bg-ink-800/40 p-6 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-mist-100">
        {monthKeyLabel(monthKey)} ainda não tem contas nesta aba.
      </p>

      {suggestedFromKey ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => onCopyFrom(suggestedFromKey)}
            className="rounded-lg bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
          >
            Copiar contas de {monthKeyLabel(suggestedFromKey)}
          </button>
          <button
            onClick={onStartBlank}
            className="rounded-lg border border-ink-500 px-4 py-2 text-sm text-mist-100 hover:border-mist-300 hover:bg-ink-700/50 transition-colors"
          >
            Começar em branco
          </button>
        </div>
      ) : (
        <button
          onClick={onStartBlank}
          className="rounded-lg bg-signal-blue px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
        >
          Começar em branco
        </button>
      )}

      {otherKeys.length > (suggestedFromKey ? 1 : 0) && (
        <div className="mt-1">
          {!pickingOther ? (
            <button onClick={() => setPickingOther(true)} className="text-xs text-signal-blue hover:underline">
              Copiar de outro mês
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
              {otherKeys
                .filter((k) => k !== suggestedFromKey)
                .map((k) => (
                  <button
                    key={k}
                    onClick={() => onCopyFrom(k)}
                    className="rounded-full border border-ink-600 px-3 py-1 text-xs text-mist-100 hover:border-mist-300 transition-colors"
                  >
                    {monthKeyLabel(k)}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
