import { Card } from "./ui";

const ACCENTS = {
  default: "text-mist-50",
  green: "text-signal-green",
  amber: "text-signal-amber",
  rose: "text-signal-rose",
  owl: "text-owl-300",
};

export default function StatCard({ icon: Icon, label, value, sub, accent = "default", className = "" }) {
  return (
    <Card className={`flex min-w-0 flex-col gap-1 p-3.5 sm:p-4 ${className}`}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-mist-300">
        {Icon && <Icon size={13} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className={`font-display text-lg font-bold tabular break-words sm:text-xl ${ACCENTS[accent]}`}>{value}</span>
      {sub && <span className="break-words text-xs leading-snug text-mist-400">{sub}</span>}
    </Card>
  );
}
