import { useState } from "react";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import PayerSelector from "./PayerSelector";
import StatusSelector from "./StatusSelector";
import { Button, IconButton, inputCls } from "./ui";
import { effectiveValue, hasNoValue, isVariable } from "../lib/calc";
import { fmtBRL } from "../lib/format";
import { useConfirm } from "./Confirm";

// Colunas da linha no desktop largo (xl). Abaixo disso cada conta vira um cartão.
const ROW_COLS = "xl:grid-cols-[minmax(150px,190px)_136px_minmax(160px,1.3fr)_minmax(200px,230px)_92px_minmax(120px,1fr)_36px]";

const HEADERS = ["Quem paga", "Status", "Descrição", "Valor", "Parcelas", "Observações", ""];

function NumberField({ value, onChange, placeholder, label, className = "" }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      max="1000000000"
      aria-label={label}
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(-1e9, Math.min(1e9, Number(e.target.value))))}
      placeholder={placeholder}
      className={`${inputCls} tabular ${className}`}
    />
  );
}

// Cada célula mostra seu rótulo só no cartão (mobile); no desktop o cabeçalho da tabela faz esse papel.
function Cell({ label, className = "", showLabel = true, children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {showLabel && <span className="text-[11px] font-medium uppercase tracking-wide text-mist-400 xl:hidden">{label}</span>}
      {children}
    </div>
  );
}

function ValueCell({ bill, onPatch }) {
  // O modo (fixo/variável) é do componente: limpar um campo não pode "virar" a conta de modo.
  const [variable, setVariable] = useState(() => isVariable(bill));

  const toFixed = () => {
    setVariable(false);
    onPatch({ value: hasNoValue(bill) ? null : effectiveValue(bill), valueMin: null, valueMax: null });
  };
  const toVariable = () => {
    setVariable(true);
    onPatch({ value: null, valueMin: bill.value, valueMax: bill.value });
  };

  const tab = (active) =>
    `h-7 flex-1 rounded-md px-2 text-[11px] font-medium transition-colors ${active ? "bg-ink-500 text-mist-50" : "text-mist-300 hover:text-mist-100"}`;

  return (
    <div className="flex flex-col gap-1.5">
      {variable ? (
        <div className="flex items-center gap-1.5">
          <NumberField label="Valor mínimo" value={bill.valueMin} onChange={(v) => onPatch({ valueMin: v })} placeholder="mín" />
          <span className="text-mist-400">–</span>
          <NumberField label="Valor máximo" value={bill.valueMax} onChange={(v) => onPatch({ valueMax: v })} placeholder="máx" />
        </div>
      ) : (
        <NumberField label="Valor" value={bill.value} onChange={(v) => onPatch({ value: v })} placeholder="R$ 0,00" />
      )}
      <div className="flex rounded-lg bg-ink-900 p-0.5" role="group" aria-label="Tipo de valor">
        <button type="button" className={tab(!variable)} onClick={variable ? toFixed : undefined} aria-pressed={!variable}>
          Fixo
        </button>
        <button type="button" className={tab(variable)} onClick={variable ? undefined : toVariable} aria-pressed={variable}>
          Variável
        </button>
      </div>
    </div>
  );
}

function BillRow({ bill, tags, autoFocus, onPatch, onRemove, onPostpone, onPay }) {
  const paid = bill.status === "pago";
  const confirm = useConfirm();
  // no celular a observação só aparece se já existir ou se a pessoa pedir (deixa o cartão mais curto)
  const [notesOpen, setNotesOpen] = useState(Boolean(bill.notes));

  const askRemove = async () => {
    const filled = bill.description || !hasNoValue(bill);
    const what = `“${bill.description || "conta sem nome"}”${hasNoValue(bill) ? "" : ` (${fmtBRL(effectiveValue(bill))})`}`;
    if (!filled || (await confirm({ title: "Remover conta?", message: `Remover ${what}?`, confirmLabel: "Remover", danger: true }))) onRemove();
  };

  return (
    <li
      className={[
        "relative grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border bg-ink-800/70 p-3 shadow-card xl:items-start xl:gap-y-0 xl:rounded-none xl:border-0 xl:border-b xl:bg-transparent xl:px-4 xl:py-3 xl:shadow-none",
        ROW_COLS,
        paid ? "border-signal-green/30 border-l-2 border-l-signal-green xl:border-l-0" : "border-ink-600 xl:border-ink-700/70",
      ].join(" ")}
    >
      <Cell label="Quem paga" className="order-5 col-span-2 xl:order-none xl:col-span-1">
        <PayerSelector tags={tags} value={bill.tagId} onChange={(v) => onPatch({ tagId: v })} />
      </Cell>

      <Cell label="Status" className="order-4 xl:order-none">
        <StatusSelector status={bill.status || "pendente"} onPay={onPay} onPostpone={onPostpone} />
      </Cell>

      <Cell label="Descrição" showLabel={false} className="order-1 col-span-2 pr-10 xl:order-none xl:col-span-1 xl:pr-0">
        <input
          type="text"
          aria-label="Descrição"
          value={bill.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Nome da conta"
          maxLength={200}
          autoFocus={autoFocus}
          className={inputCls}
        />
      </Cell>

      <Cell label="Valor" className="order-2 col-span-2 xl:order-none xl:col-span-1">
        <ValueCell bill={bill} onPatch={onPatch} />
      </Cell>

      <Cell label="Parcelas restantes" className="order-3 xl:order-none">
        <NumberField label="Parcelas restantes" value={bill.installmentsLeft} onChange={(v) => onPatch({ installmentsLeft: v === null ? null : Math.min(600, Math.max(0, Math.round(v))) })} placeholder="—" />
      </Cell>

      <Cell label="Observações" showLabel={false} className="order-6 col-span-2 xl:order-none xl:col-span-1">
        {!notesOpen && (
          <button type="button" onClick={() => setNotesOpen(true)} className="inline-flex items-center gap-1.5 self-start text-xs text-mist-300 hover:text-owl-300 xl:hidden">
            <MessageSquarePlus size={14} /> Adicionar observação
          </button>
        )}
        <input
          type="text"
          aria-label="Observações"
          value={bill.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
          placeholder="Observação"
          maxLength={1000}
          autoFocus={notesOpen && !bill.notes && !autoFocus}
          className={`${inputCls} ${notesOpen ? "" : "hidden xl:block"}`}
        />
      </Cell>

      <div className="absolute right-2 top-2 xl:static xl:flex xl:justify-end">
        <IconButton label="Remover conta" onClick={askRemove} className="hover:!bg-signal-rose/10 hover:!text-signal-rose">
          <Trash2 size={16} />
        </IconButton>
      </div>
    </li>
  );
}

export default function BillsList({ bills, tags, focusId, onAdd, onUpdate, onRemove, onPostpone, onPay }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden xl:rounded-2xl xl:border xl:border-ink-600 xl:bg-ink-800/70 xl:shadow-card">
        <div className={`hidden gap-x-3 border-b border-ink-600 px-4 py-3 text-xs font-medium text-mist-300 xl:grid ${ROW_COLS}`} aria-hidden="true">
          {HEADERS.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>

        {bills.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-500 px-4 py-10 text-center text-sm text-mist-300 xl:rounded-none xl:border-0">
            Nenhuma conta neste mês ainda. Adicione a primeira abaixo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5 xl:gap-0">
            {bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                tags={tags}
                autoFocus={bill.id === focusId}
                onPatch={(fields) => onUpdate(bill.id, fields)}
                onRemove={() => onRemove(bill.id)}
                onPostpone={() => onPostpone(bill.id)}
                onPay={() => onPay(bill.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <Button variant="primary" size="lg" onClick={onAdd} className="self-stretch sm:self-start">
        <Plus size={18} />
        Adicionar conta
      </Button>
    </div>
  );
}
