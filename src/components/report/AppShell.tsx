import { Link } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";

import { reportMeta } from "@/data/report";

const navItems = [
  { to: "/", label: "Yönetici Özeti" },
  { to: "/satis", label: "Satış Performansı" },
  { to: "/butce", label: "Bütçe – Gerçekleşen" },
  { to: "/karlilik", label: "Kârlılık" },
  { to: "/nakit", label: "Nakit ve İşletme Sermayesi" },
  { to: "/finansman", label: "Borç, Kredi ve CAPEX" },
  { to: "/tahmin", label: "Yıl Sonu Tahmini" },
  { to: "/cac", label: "CAC" },
  { to: "/ltv", label: "LTV" },
] as const;

export function EmptyState() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card px-6 py-20 text-center"
    >
      <FileSearch className="h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 text-base font-semibold text-foreground">Henüz rapor verisi yok</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Bu dönem için veri girilmemiş. Rapor bölümleri, veriler eklendiğinde otomatik olarak
        dolacaktır.
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const metaText = [reportMeta.company, reportMeta.period].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
            Aylık Yönetim Raporu
          </Link>
          {metaText ? <p className="text-xs text-muted-foreground">{metaText}</p> : null}
        </div>
        <nav aria-label="Rapor bölümleri" className="mx-auto max-w-6xl px-4">
          <ul className="-mb-px flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="inline-block border-b-2 border-transparent py-2 text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "border-primary text-foreground font-medium" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-muted-foreground">
          İyi bir aylık yönetim raporu; geçmişi anlatır, bugünü açıklar, geleceğe yön verir.
          {reportMeta.isDemoData ? (
            <span className="mt-1 block font-medium text-warning">
              Bu raporda örnek (demo) veri kullanılmaktadır; gerçek muhasebe verisiyle
              değiştirilmelidir.
            </span>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
