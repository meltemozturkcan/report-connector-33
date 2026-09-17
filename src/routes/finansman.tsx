import { createFileRoute } from "@tanstack/react-router";

import { useReport } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import { debtInsight } from "@/lib/insights";
import { Progress } from "@/components/ui/progress";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

export const Route = createFileRoute("/finansman")({
  head: () => ({
    meta: [
      { title: "Borç, Kredi Limitleri ve CAPEX — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Finansal borçların seyri, banka kredi limit kullanımı, vade dağılımı ve yatırım (CAPEX) gerçekleşmeleri.",
      },
      { property: "og:title", content: "Borç, Kredi Limitleri ve CAPEX" },
      { property: "og:description", content: "Borç arttıysa geri ödeme kapasitesi nasıl değişti?" },
    ],
  }),
  component: FinancingPage,
});

function FinancingPage() {
  const model = useReport();
  const { capex, cashFlow, debt, hasReportData } = model;

  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const totalLimit = debt.lines.reduce((sum, line) => sum + line.limit, 0);
  const totalUsed = debt.lines.reduce((sum, line) => sum + line.used, 0);

  return (
    <AppShell>
      <PageHeader
        title="Finansal Borçlar, Kredi Limitleri ve CAPEX"
        description="Borcun tutarı kadar vadesi, maliyeti ve geri ödeme kapasitesi ile birlikte okunması gerekir."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Toplam finansal borç"
          value={formatAmount(debt.total)}
          delta={{
            text: `${formatAmount(debt.total - debt.previous)} değişim`,
            tone: debt.total > debt.previous ? "negative" : "positive",
          }}
        />
        <KpiCard label="Net borç" value={formatAmount(debt.net)} note="Finansal borç - nakit" />
        <KpiCard
          label="Net borç / FAVÖK"
          value={debt.leverageMeasurable ? formatRatio(debt.netDebtToEbitda, 1) : "Ölçülemez"}
          delta={
            debt.leverageMeasurable
              ? {
                  text: debt.netDebtToEbitda > 3 ? "3,0x eşiği aşıldı" : "3,0x eşiğinin altında",
                  tone: debt.netDebtToEbitda > 3 ? "negative" : "positive",
                }
              : { text: "FAVÖK sıfır veya negatif", tone: "negative" }
          }
        />
        <KpiCard
          label="DSCR"
          value={debt.dscrMeasurable ? formatRatio(debt.dscr, 2) : "Ölçülemez"}
          delta={
            debt.dscrMeasurable
              ? { text: "Hedef 1,30", tone: debt.dscr >= 1.3 ? "positive" : "negative" }
              : { text: "Pozitif FAVÖK ve borç servisi gerekli", tone: "neutral" }
          }
        />
      </div>

      <Section
        title="Kredi limitleri ve kullanım"
        description="Kullanılabilir limit, likidite tamponunu gösterir."
      >
        <div className="space-y-4">
          {debt.lines.map((line) => {
            const usage = line.limit > 0 ? (line.used / line.limit) * 100 : 0;
            return (
              <div key={line.bank}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{line.bank}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatAmount(line.used)} / {formatAmount(line.limit)} (
                    {formatPercent(usage, 0)})
                  </span>
                </div>
                <Progress value={usage} className="mt-2 h-2" />
              </div>
            );
          })}
          <p className="text-sm text-muted-foreground">
            Toplam kullanılabilir limit:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatAmount(totalLimit - totalUsed)}
            </span>
          </p>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Vade dağılımı"
          description="Kısa vadeli yoğunlaşma yeniden finansman riski yaratır."
        >
          <DataTable
            caption="Borç vade dağılımı"
            rowKey={(row) => row.period}
            rows={debt.maturities}
            columns={[
              { header: "Vade", cell: (row) => row.period },
              { header: "Tutar", align: "right", cell: (row) => formatAmount(row.amount) },
              {
                header: "Pay",
                align: "right",
                cell: (row) =>
                  debt.total > 0 ? formatPercent((row.amount / debt.total) * 100, 0) : "—",
              },
            ]}
          />
        </Section>

        <Section
          title="CAPEX gerçekleşmeleri"
          description="Yatırım bütçesi ve gerçekleşen harcama."
        >
          <DataTable
            caption="Yatırım projeleri"
            rowKey={(row) => row.name}
            rows={capex.projects}
            columns={[
              { header: "Proje", cell: (row) => row.name },
              { header: "Bütçe", align: "right", cell: (row) => formatAmount(row.budget) },
              { header: "Gerçekleşen", align: "right", cell: (row) => formatAmount(row.actual) },
              { header: "Durum", align: "right", cell: (row) => row.status },
            ]}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Yıl başından bugüne CAPEX {formatAmount(capex.ytdActual)}; bütçe{" "}
            {formatAmount(capex.ytdBudget)} (
            <Delta value={capex.ytdActual - capex.ytdBudget} invert />
            ). Bu ayki nakit çıkışı {formatAmount(capex.monthActual)}.
          </p>
        </Section>
      </div>

      <Insight question="Borç arttıysa geri ödeme kapasitesi nasıl değişti?">
        {debtInsight(model)}
      </Insight>
    </AppShell>
  );
}
