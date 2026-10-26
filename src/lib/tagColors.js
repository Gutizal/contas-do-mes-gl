// Paleta de cores que o usuário pode escolher para cada categoria de "quem paga".
// As chaves ficam gravadas no banco (coluna tags.color): não renomear as existentes.
// Classes escritas por extenso para o Tailwind enxergar cada uma.
export const TAG_PALETTE = [
  { key: "blue", hex: "#4C8DFF", active: "bg-signal-blue/90 border-signal-blue text-ink-950", dot: "bg-signal-blue" },
  { key: "rose", hex: "#F0627A", active: "bg-signal-rose/90 border-signal-rose text-ink-950", dot: "bg-signal-rose" },
  { key: "violet", hex: "#9484F2", active: "bg-signal-violet/90 border-signal-violet text-ink-950", dot: "bg-signal-violet" },
  { key: "teal", hex: "#22B8A6", active: "bg-signal-teal/90 border-signal-teal text-ink-950", dot: "bg-signal-teal" },
  { key: "amber", hex: "#F0A93E", active: "bg-signal-amber/90 border-signal-amber text-ink-950", dot: "bg-signal-amber" },
  { key: "lime", hex: "#9BD14B", active: "bg-signal-lime/90 border-signal-lime text-ink-950", dot: "bg-signal-lime" },
  { key: "orange", hex: "#F2864B", active: "bg-signal-orange/90 border-signal-orange text-ink-950", dot: "bg-signal-orange" },
  { key: "pink", hex: "#E873C8", active: "bg-signal-pink/90 border-signal-pink text-ink-950", dot: "bg-signal-pink" },
];

const byKey = (color) => TAG_PALETTE.find((c) => c.key === color) ?? TAG_PALETTE[0];

export const tagClasses = (color) => byKey(color).active;
export const tagDot = (color) => byKey(color).dot;
export const tagHex = (color) => byKey(color).hex;
export const NO_TAG_HEX = "#627089";
