import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  note?: string;
  delta?: { text: string; tone: "positive" | "negative" | "neutral" };
};

export function KpiCard({ label, value, note, delta }: KpiCardProps) {
  const Icon =
    delta?.tone === "positive" ? ArrowUpRight : delta?.tone === "negative" ? ArrowDownRight : ArrowRight;

  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {delta ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium tabular-nums",
            delta.tone === "positive" && "text-positive",
            delta.tone === "negative" && "text-destructive",
            delta.tone === "neutral" && "text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {delta.text}
        </p>
      ) : null}
      {note ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}
