import { Link, useRouterState } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import {
  entryTabLabel,
  reportRouteLabels,
  sourceTabsFor,
  type ReportRoute,
} from "@/components/entry/entry-tabs";
import { useReport } from "@/hooks/useReport";

type PageHeaderProps = {
  title: string;
  description: string;
};

const isReportRoute = (path: string): path is ReportRoute => path in reportRouteLabels;

export function PageHeader({ title, description }: PageHeaderProps) {
  const { reportMeta } = useReport();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const metaText = [reportMeta.company, reportMeta.period].filter(Boolean).join(" · ");
  /** Rapor sayfasını besleyen veri girişi sekmeleri: rakamın nereden geldiğine tek tıkla gidilir. */
  const sources = isReportRoute(pathname) ? sourceTabsFor(pathname) : [];

  return (
    <header className="border-b border-border pb-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {metaText}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground">{reportMeta.currencyNote}</p>
      {sources.length > 0 ? (
        <nav
          aria-label="Bu sayfanın veri kaynakları"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs text-muted-foreground">Veri kaynağı:</span>
          {sources.map((tab) => (
            <Link
              key={tab}
              to="/veri-girisi"
              search={{ sekme: tab }}
              className="inline-flex items-center gap-1 border border-border bg-card px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="size-3" aria-hidden="true" />
              {entryTabLabel(tab)}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
