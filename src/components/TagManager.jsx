import { useState } from "react";
import { Trash2 } from "lucide-react";
import { TAG_PALETTE, tagDot } from "../lib/tagColors";
import { Button, IconButton, inputCls } from "./ui";
import { useConfirm } from "./Confirm";

export default function TagManager({ tags, usage, onAdd, onUpdate, onRemove }) {
  const [newName, setNewName] = useState("");
  const confirm = useConfirm();

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const used = tags.map((t) => t.color);
    const free = TAG_PALETTE.find((c) => !used.includes(c.key))?.key ?? TAG_PALETTE[tags.length % TAG_PALETTE.length].key;
    onAdd(name, free);
    setNewName("");
  };

  const remove = async (tag) => {
    const n = usage[tag.id] || 0;
    const msg = n
      ? `Remover “${tag.name}”? ${n} conta${n === 1 ? "" : "s"} vai ficar sem responsável.`
      : `Remover a categoria “${tag.name}”?`;
    if (await confirm({ title: "Remover categoria?", message: msg, confirmLabel: "Remover", danger: true })) onRemove(tag.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-mist-300">Renomeie como quiser (nomes, iniciais, apelidos) e escolha uma cor para cada pessoa ou grupo.</p>

      <ul className="flex flex-col gap-3">
        {tags.map((tag) => (
          <li key={tag.id} className="flex flex-col gap-2 rounded-xl border border-ink-600 bg-ink-700/40 p-2.5">
            <div className="flex items-center gap-2">
              <input type="text" aria-label="Nome da categoria" maxLength={40} value={tag.name} onChange={(e) => onUpdate(tag.id, { name: e.target.value })} className={inputCls} />
              <IconButton label={`Remover ${tag.name}`} onClick={() => remove(tag)} className="hover:!bg-signal-rose/10 hover:!text-signal-rose">
                <Trash2 size={16} />
              </IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cor">
              {TAG_PALETTE.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-label={c.key}
                  aria-pressed={tag.color === c.key}
                  onClick={() => onUpdate(tag.id, { color: c.key })}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${tagDot(c.key)} ${tag.color === c.key ? "scale-110 border-mist-50" : "border-transparent opacity-60 hover:opacity-100"}`}
                />
              ))}
            </div>
          </li>
        ))}
        {tags.length === 0 && <li className="text-xs italic text-mist-400">Nenhuma categoria ainda.</li>}
      </ul>

      <form
        className="flex items-center gap-2 border-t border-ink-600 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input type="text" aria-label="Nova categoria" maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova categoria (ex.: João, Casa, Sócios)" className={inputCls} />
        <Button type="submit" variant="primary">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
