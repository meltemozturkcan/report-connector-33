import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { reportRouteLabels, type ReportRoute } from "@/components/entry/entry-tabs";
import { cn } from "@/lib/utils";

export type ResultItem = {
  label: string;
  value: string;
  /** Değerin nasıl hesaplandığı veya hangi rapora gittiği. */
  hint?: string | undefined;
  tone?: "positive" | "negative" | "neutral" | undefined;
};

type LinkedResultsProps = {
  items: ResultItem[];
  reports: ReportRoute[];
  warnings?: string[];
  emptyText?: string;
  title?: string;
};

/**
 * Veri girişi sekmesinin altında durur: bu sekmeye girilen verinin
 * hesaplanmış sonuçlarını canlı gösterir ve sonucun göründüğü rapor
 * sayfalarına bağlantı verir. Değerler kaydetmeyi beklemeden güncellenir.
 */
export function LinkedResults({
  items,
  reports,
  warnings = [],
  emptyText = "Bu sekmeye veri girildiğinde sonuçlar burada görünür.",
  title = "Bu verinin sonuçları",
}: LinkedResultsProps) {
  return (
    <section aria-label={title} className="space-y-3 border border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">Canlı hesaplanır · raporlara anında yansır</p>
      </div>

      {items.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 border-b border-border/60 pb-1.5">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd
                className={cn(
                  "text-sm font-medium tabular-nums text-foreground",
                  item.tone === "positive" && "text-positive",
                  item.tone === "negative" && "text-destructive",
                )}
              >
                {item.value}
              </dd>
              {item.hint ? (
                <p className="text-xs leading-snug text-muted-foreground">{item.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}

      {warnings.length > 0 ? (
        <ul className="space-y-1 border-l-2 border-destructive pl-3 text-sm leading-relaxed text-destructive">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <nav
        aria-label="İlgili rapor sayfaları"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <span className="text-xs text-muted-foreground">Raporda gör:</span>
        {reports.map((route) => (
          <Link
            key={route}
            to={route}
            className="inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-foreground transition-colors hover:bg-muted"
          >
            {reportRouteLabels[route]}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
