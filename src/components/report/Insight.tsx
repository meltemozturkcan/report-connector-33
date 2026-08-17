import type { ReactNode } from "react";

type InsightProps = {
  question: string;
  children: ReactNode;
};

/** Rakamlar arasındaki bağlantıyı açıklayan yorum bloğu. */
export function Insight({ question, children }: InsightProps) {
  return (
    <div className="border-l-2 border-accent-foreground/40 bg-muted/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{question}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{children}</p>
    </div>
  );
}
