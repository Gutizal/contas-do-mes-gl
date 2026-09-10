// Paleta fixa de cores que o usuário pode escolher para cada categoria de "quem paga".
export const TAG_PALETTE = [
  { key: "blue", active: "bg-signal-blue/90 border-signal-blue text-ink-950", dot: "bg-signal-blue" },
  { key: "rose", active: "bg-signal-rose/90 border-signal-rose text-ink-950", dot: "bg-signal-rose" },
  { key: "violet", active: "bg-signal-violet/90 border-signal-violet text-ink-950", dot: "bg-signal-violet" },
  { key: "teal", active: "bg-signal-teal/90 border-signal-teal text-ink-950", dot: "bg-signal-teal" },
  { key: "amber", active: "bg-signal-amber/90 border-signal-amber text-ink-950", dot: "bg-signal-amber" },
];

export const tagClasses = (color) =>
  TAG_PALETTE.find((c) => c.key === color)?.active ?? TAG_PALETTE[0].active;

export const tagDot = (color) =>
  TAG_PALETTE.find((c) => c.key === color)?.dot ?? TAG_PALETTE[0].dot;
