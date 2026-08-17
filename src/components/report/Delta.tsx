import { cn } from "@/lib/utils";
import { formatSigned } from "@/lib/format";

type DeltaProps = {
  value: number;
  digits?: number;
  suffix?: string;
  /** true ise negatif değer olumlu sayılır (ör. maliyet sapması). */
  invert?: boolean;
};

export function Delta({ value, digits = 0, suffix = "", invert = false }: DeltaProps) {
  const good = invert ? value < 0 : value > 0;
  const neutral = value === 0;

  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        neutral && "text-muted-foreground",
        !neutral && good && "text-positive",
        !neutral && !good && "text-destructive",
      )}
    >
      {formatSigned(value, digits)}
      {suffix}
    </span>
  );
}
