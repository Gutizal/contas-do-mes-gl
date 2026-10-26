import { useState } from "react";
import { CopyPlus, FilePlus2 } from "lucide-react";
import { monthKeyLabel, sortMonthKeys } from "../lib/months";
import { Button, Card } from "./ui";

export default function MonthSetupPrompt({ monthKey, tabLabel, suggestedFromKey, existingMonths, onStartBlank, onCopyFrom }) {
  const [pickingOther, setPickingOther] = useState(false);
  const otherKeys = sortMonthKeys(existingMonths)
    .reverse()
    .filter((k) => k !== suggestedFromKey && k !== monthKey);

  return (
    <Card className="flex flex-col items-center gap-4 border-dashed p-6 text-center sm:p-10">
      <div>
        <h2 className="font-display text-lg font-bold text-mist-50">{monthKeyLabel(monthKey)}</h2>
        <p className="mt-1 text-sm text-mist-300">Ainda não há contas em {tabLabel} neste mês. Como quer começar?</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
        {suggestedFromKey && (
          <Button variant="primary" size="lg" onClick={() => onCopyFrom(suggestedFromKey)} className="sm:flex-1">
            <CopyPlus size={17} />
            Copiar de {monthKeyLabel(suggestedFromKey)}
          </Button>
        )}
        <Button variant={suggestedFromKey ? "secondary" : "primary"} size="lg" onClick={onStartBlank} className="sm:flex-1">
          <FilePlus2 size={17} />
          Começar em branco
        </Button>
      </div>

      {otherKeys.length > 0 &&
        (pickingOther ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {otherKeys.map((k) => (
              <button
                key={k}
                onClick={() => onCopyFrom(k)}
                className="rounded-full border border-ink-500 px-3 py-1.5 text-xs text-mist-100 transition-colors hover:border-owl-500 hover:text-owl-300"
              >
                {monthKeyLabel(k)}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => setPickingOther(true)} className="text-sm text-owl-400 hover:underline">
            Copiar de outro mês
          </button>
        ))}

      {suggestedFromKey && <p className="max-w-sm text-xs text-mist-400">Ao copiar, tudo volta como pendente e contas parceladas descontam uma parcela (as quitadas não vêm).</p>}
    </Card>
  );
}
