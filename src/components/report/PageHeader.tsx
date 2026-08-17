import { reportMeta } from "@/data/report";

type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="border-b border-border pb-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {reportMeta.company} · {reportMeta.period}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground">{reportMeta.currencyNote}</p>
    </header>
  );
}
