import { tagClasses } from "../lib/tagColors";

const IDLE = "bg-ink-700 border-ink-500 text-mist-300 hover:border-mist-300 hover:text-mist-100";

export default function PayerSelector({ tags, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quem paga">
      {tags.map((tag) => {
        const active = value === tag.id;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onChange(active ? null : tag.id)}
            aria-pressed={active}
            className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors xl:h-7 ${active ? tagClasses(tag.color) : IDLE}`}
          >
            {tag.name}
          </button>
        );
      })}
      {tags.length === 0 && <span className="text-xs italic text-mist-400">crie categorias em “Categorias”</span>}
    </div>
  );
}
