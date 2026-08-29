import { createFileRoute, Link } from "@tanstack/react-router";

import { useReport } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { KpiCard } from "@/components/report/KpiCard";
import { Section } from "@/components/report/Section";
import { DataTable } from "@/components/report/DataTable";
import { changePercent, formatAmount, formatPercent, formatRatio } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yönetici Özeti — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Aylık yönetim raporu yönetici özeti: neredeyiz, neden buradayız ve bundan sonra ne yapacağız sorularının cevabı.",
      },
      { property: "og:title", content: "Yönetici Özeti — Aylık Yönetim Raporu" },
      {
        property: "og:description",
        content: "Satış, kârlılık, nakit ve borç göstergelerinin birbirine bağlandığı tek sayfalık özet.",
      },
    ],
  }),
  component: ExecutiveSummary,
});

function ExecutiveSummary() {
  const {
    baseScenario,
    cashFlow,
    currentMargin,
    currentMonth,
    debt,
    forecast,
    hasReportData,
    inventory,
    narrative,
    netProfitVariance,
    previousMonth,
    receivables,
  } = useReport();

  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const current = currentMonth;
  const previous = previousMonth;
  const netProfitBudget = netProfitVariance;

  return (
    <AppShell>
      <PageHeader
        title="Yönetici Özeti"
        description="Rakamların tek tek listelenmesi değil, aralarındaki bağlantı önemlidir. Bu sayfa üç soruyu yanıtlar: Neredeyiz? Neden buradayız? Bundan sonra ne yapacağız?"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Net satış"
          value={formatAmount(current.sales)}
          delta={{
            text: `${formatPercent(changePercent(current.sales, previous.sales))} önceki aya göre`,
            tone: current.sales >= previous.sales ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="FAVÖK marjı"
          value={formatPercent(currentMargin.ebitda)}
          delta={{
            text: `${formatAmount(currentMargin.ebitda - previousMargin.ebitda, 1)} puan`,
            tone: currentMargin.ebitda >= previousMargin.ebitda ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Faaliyet nakit akışı"
          value={formatAmount(cashFlow.operating)}
          delta={{
            text: cashFlow.operating >= 0 ? "Pozitif" : "Negatif",
            tone: cashFlow.operating >= 0 ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Net borç / FAVÖK"
          value={formatRatio(debt.netDebtToEbitda, 1)}
          delta={{
            text: `DSCR ${formatRatio(debt.dscr, 2)}`,
            tone: debt.netDebtToEbitda <= 3 && debt.dscr >= 1.3 ? "positive" : "negative",
          }}
        />
      </div>

      <Section
        title="1. Neredeyiz?"
        description="Ayın fotoğrafı: satış, kârlılık, nakit ve borcun bulunduğu nokta."
      >
        <ul className="space-y-2 text-sm leading-relaxed text-foreground">
          {narrative.where.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-primary" />
              {line}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="2. Neden buradayız?"
        description="Rakamlar arasındaki bağlantı: satış, kâr, nakit ve borç zinciri."
      >
        <ul className="space-y-2 text-sm leading-relaxed text-foreground">
          {narrative.why.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-primary" />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-l-2 border-primary bg-muted/60 px-4 py-3 text-sm leading-relaxed">
          Kısaca: satış arttı, kâr artmadı; kâr nakde dönmedi, işletme sermayesinde bağlandı; nakit
          açığı borçla kapandı, geri ödeme kapasitesi zayıfladı. Bütçe sapması yıl sonu FAVÖK
          tahminini {formatAmount(forecast.budgetFullYear.ebitda - baseScenario.ebitda)} bin
          TL aşağı çekiyor.
        </p>
      </Section>

      <Section
        title="3. Bundan sonra ne yapacağız?"
        description="Karar gerektiren aksiyonlar, sorumlu ve termin."
      >
        <DataTable
          caption="Aksiyon planı"
          rowKey={(row) => row.action}
          rows={narrative.next}
          columns={[
            { header: "Aksiyon", cell: (row) => row.action },
            { header: "Sorumlu", cell: (row) => row.owner },
            { header: "Termin", align: "right", cell: (row) => row.due },
          ]}
        />
      </Section>

      <Section title="Kilit göstergeler" description="Yönetimin ay boyunca takip ettiği sayılar.">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Net satış", value: formatAmount(current.sales) },
            { label: "Brüt kâr marjı", value: formatPercent(currentMargin.gross) },
            { label: "FAVÖK", value: formatAmount(current.ebitda) },
            {
              label: "Net kâr / bütçe",
              value: `${formatAmount(netProfitBudget.actual)} / ${formatAmount(netProfitBudget.budget)}`,
            },
            { label: "Dönem sonu nakit", value: formatAmount(cashFlow.closing) },
            { label: "Net borç", value: formatAmount(debt.net) },
            { label: "Alacak gün sayısı", value: `${receivables.days} gün` },
            { label: "Stok gün sayısı", value: `${inventory.days} gün` },
            { label: "DSCR", value: formatRatio(debt.dscr, 2) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between border-b border-border/60 py-1.5">
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <nav aria-label="Detay sayfaları" className="flex flex-wrap gap-2 text-sm">
        {[
          { to: "/satis", label: "Satış performansı" },
          { to: "/butce", label: "Bütçe sapmaları" },
          { to: "/karlilik", label: "Kârlılık" },
          { to: "/nakit", label: "Nakit ve işletme sermayesi" },
          { to: "/finansman", label: "Borç ve CAPEX" },
          { to: "/tahmin", label: "Yıl sonu tahmini" },
          { to: "/cac", label: "Müşteri kazanım maliyeti (CAC)" },
          { to: "/ltv", label: "Müşteri yaşam boyu değeri (LTV)" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="border border-border bg-card px-3 py-1.5 text-foreground transition-colors hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </AppShell>
  );
}
