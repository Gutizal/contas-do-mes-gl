import { useState } from "react";
import { TAG_PALETTE, tagDot } from "../tagColors";
import { makeTag } from "../data/initialData";

export default function TagManager({ tab, tags, onChange, onClose }) {
  const [newName, setNewName] = useState("");

  const updateTag = (id, fields) => onChange(tags.map((t) => (t.id === id ? { ...t, ...fields } : t)), { id, fields });
  const removeTag = (id) => onChange(tags.filter((t) => t.id !== id), { removedId: id });
  const addTag = () => {
    if (!newName.trim()) return;
    const usedColors = tags.map((t) => t.color);
    const freeColor = TAG_PALETTE.find((c) => !usedColors.includes(c.key))?.key ?? TAG_PALETTE[0].key;
    const tag = makeTag(tab, newName.trim(), freeColor);
    onChange([...tags, tag], { created: tag });
    setNewName("");
  };

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/80 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mist-100">Categorias de quem paga</h3>
        <button onClick={onClose} className="text-xs text-mist-300 hover:text-mist-100">
          Fechar
        </button>
      </div>
      <p className="text-xs text-mist-300">
        Renomeie como quiser (nomes, iniciais, apelidos) e escolha uma cor para cada pessoa ou grupo.
      </p>

      <div className="flex flex-col gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2">
            <input
              type="text"
              value={tag.name}
              onChange={(e) => updateTag(tag.id, { name: e.target.value })}
              className="flex-1 min-w-0 rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue"
            />
            <div className="flex items-center gap-1">
              {TAG_PALETTE.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.key}
                  onClick={() => updateTag(tag.id, { color: c.key })}
                  className={[
                    "h-5 w-5 rounded-full border-2 transition-transform",
                    tagDot(c.key),
                    tag.color === c.key ? "border-mist-50 scale-110" : "border-transparent opacity-60",
                  ].join(" ")}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              title="Remover categoria"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-mist-300 hover:text-signal-rose hover:bg-signal-rose/10 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        {tags.length === 0 && <p className="text-xs text-mist-300/60 italic">Nenhuma categoria ainda.</p>}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-ink-700">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          placeholder="Nova categoria (ex: João, Casa, Sócios)"
          className="flex-1 min-w-0 rounded-md bg-ink-800 border border-ink-600 px-2 py-1.5 text-sm text-mist-100 placeholder-mist-300/40 focus:outline-none focus:ring-1 focus:ring-signal-blue focus:border-signal-blue mt-2"
        />
        <button
          type="button"
          onClick={addTag}
          className="mt-2 rounded-md bg-signal-blue px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-signal-blue/90 transition-colors"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
