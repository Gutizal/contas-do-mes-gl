import { tagClasses } from "../tagColors";

const IDLE = "bg-ink-700 border-ink-500 text-mist-300 hover:border-mist-300 hover:text-mist-100";

export default function PayerSelector({ tags, value, onChange, compact = false }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1" role="group" aria-label="Quem paga">
      {tags.map((tag) => {
        const active = value === tag.id;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onChange(active ? null : tag.id)}
            title={tag.name}
            className={[
              "flex items-center justify-center rounded-full font-medium transition-colors border px-2.5",
              compact ? "h-6 text-[11px]" : "h-7 text-xs",
              active ? tagClasses(tag.color) : IDLE,
            ].join(" ")}
          >
            {tag.name}
          </button>
        );
      })}
      {tags.length === 0 && (
        <span className="text-xs text-mist-300/60 italic">crie categorias em "Categorias"</span>
      )}
    </div>
  );
}
