import PayerSelector from "./PayerSelector";
import StatusSelector from "./StatusSelector";
import { isVariable } from "../utils";

function NumberField({ value, onChange, placeholder, width = "w-24" }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      placeholder={placeholder}
      className={`${width} rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm font-mono text-mist-100 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue`}
    />
  );
}

export default function BillsTable({ bills, tags, onUpdate, onRemove, onPostpone }) {
  const patch = (id, fields) => onUpdate(id, fields);

  const toggleVariable = (bill) => {
    if (isVariable(bill)) {
      // vira valor fixo
      patch(bill.id, { value: bill.valueMin ?? 0, valueMin: null, valueMax: null });
    } else {
      // vira faixa variável
      patch(bill.id, { value: null, valueMin: bill.value, valueMax: bill.value });
    }
  };

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/60 overflow-hidden min-w-0">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-600 text-left text-mist-300">
              <th className="px-3 py-3 font-medium w-[160px]">Quem paga</th>
              <th className="px-3 py-3 font-medium w-[130px]">Status</th>
              <th className="px-3 py-3 font-medium">Descrição</th>
              <th className="px-3 py-3 font-medium w-[150px]">Valor fixo</th>
              <th className="px-3 py-3 font-medium w-[210px]">Faixa (se variável)</th>
              <th className="px-3 py-3 font-medium w-[110px]">Parcelas restantes</th>
              <th className="px-3 py-3 font-medium">Observações</th>
              <th className="px-3 py-3 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-b border-ink-700/70 last:border-b-0 hover:bg-ink-700/30 align-top">
                <td className="px-3 py-2.5">
                  <PayerSelector tags={tags} value={bill.tagId} onChange={(v) => patch(bill.id, { tagId: v })} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusSelector
                    status={bill.status || "pendente"}
                    onChangeStatus={(s) => patch(bill.id, { status: s })}
                    onPostpone={() => onPostpone(bill.id)}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    value={bill.description}
                    onChange={(e) => patch(bill.id, { description: e.target.value })}
                    placeholder="Nome da conta"
                    className="w-full min-w-[160px] rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
                  />
                </td>
                <td className="px-3 py-2.5">
                  {isVariable(bill) ? (
                    <button
                      type="button"
                      onClick={() => toggleVariable(bill)}
                      className="text-xs text-signal-blue hover:underline"
                    >
                      + definir valor fixo
                    </button>
                  ) : (
                    <NumberField value={bill.value} onChange={(v) => patch(bill.id, { value: v })} placeholder="R$" width="w-full" />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {isVariable(bill) ? (
                    <div className="flex items-center gap-1.5">
                      <NumberField value={bill.valueMin} onChange={(v) => patch(bill.id, { valueMin: v })} placeholder="mín" width="w-20" />
                      <span className="text-mist-300">a</span>
                      <NumberField value={bill.valueMax} onChange={(v) => patch(bill.id, { valueMax: v })} placeholder="máx" width="w-20" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleVariable(bill)}
                      className="text-xs text-signal-blue hover:underline"
                    >
                      + tornar variável
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <NumberField
                    value={bill.installmentsLeft}
                    onChange={(v) => patch(bill.id, { installmentsLeft: v })}
                    placeholder="nenhuma"
                    width="w-full"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    value={bill.notes}
                    onChange={(e) => patch(bill.id, { notes: e.target.value })}
                    placeholder="opcional"
                    className="w-full min-w-[140px] rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-200 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
                  />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(bill.id)}
                    title="Remover"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-mist-300 hover:text-signal-rose hover:bg-signal-rose/10 transition-colors"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-mist-300 text-sm">
                  Nenhuma conta nesta aba ainda. Adicione a primeira abaixo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
