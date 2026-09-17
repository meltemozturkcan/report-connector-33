import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useProjection, useReport } from "@/hooks/useReport";
import { buildNetProfitBridge, type ProjectionScenario } from "@/lib/projection-calc";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import { profitToCashInsight } from "@/lib/insights";
import { formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/karlilik")({
  head: () => ({
    meta: [
      { title: "Kârlılık — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Brüt kâr, FAVÖK ve net kâr marjlarının seyri, marj daralmasının nedenleri ve nakde yansıması.",
      },
      { property: "og:title", content: "Kârlılık — Aylık Yönetim Raporu" },
      {
        property: "og:description",
        content: "Marj daralması nereden geliyor ve kâr nakde dönüyor mu?",
      },
    ],
  }),
  component: ProfitabilityPage,
});

function ProfitabilityPage() {
  const model = useReport();
  const {
    cashFlow,
    currentMargin,
    currentMonth,
    hasReportData,
    margins,
    previousMargin,
    previousMonth,
    salesBreakdown,
  } = model;
  const projection = useProjection();

  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const baseScenarioYears =
    projection.scenariosAccrual.find((row: ProjectionScenario) => row.name === "Baz")?.years ?? [];

  /** Kârlılık sayfası da Projeksiyon sayfasıyla aynı köprüyü kullanır (tek formül). */
  const projectionYear =
    [...baseScenarioYears].reverse().find((row) => row.netSales !== 0 || row.opex !== 0) ??
    baseScenarioYears[baseScenarioYears.length - 1];
  const netProfitBridge = projectionYear ? buildNetProfitBridge(projectionYear) : [];

  return (
    <AppShell>
      <PageHeader
        title="Kârlılık: Brüt Kâr, FAVÖK ve Net Kâr"
        description="Marjın hangi seviyede olduğu değil, hangi nedenle değiştiği yönetim kararını belirler."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Brüt kâr"
          value={formatAmount(currentMonth.grossProfit)}
          delta={{
            text: `${formatPercent(currentMargin.gross)} marj`,
            tone: currentMargin.gross >= previousMargin.gross ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="FAVÖK"
          value={formatAmount(currentMonth.ebitda)}
          delta={{
            text: `${formatPercent(currentMargin.ebitda)} marj`,
            tone: currentMargin.ebitda >= previousMargin.ebitda ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Net kâr"
          value={formatAmount(currentMonth.netProfit)}
          delta={{
            text: `${formatPercent(currentMargin.net)} marj`,
            tone: currentMargin.net >= previousMargin.net ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Nakde dönüşüm"
          value={
            currentMonth.ebitda > 0
              ? formatPercent((cashFlow.operating / currentMonth.ebitda) * 100)
              : "FAVÖK ≤ 0"
          }
          note="Faaliyet nakit akışı / FAVÖK"
        />
      </div>

      <Section
        title="Marj seyri"
        description="Brüt kâr, FAVÖK ve net kâr marjlarının son 6 aylık gelişimi."
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={margins} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                formatter={(value: number) => formatPercent(value)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                name="Brüt kâr marjı"
                dataKey="gross"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name="FAVÖK marjı"
                dataKey="ebitda"
                stroke="var(--positive)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name="Net kâr marjı"
                dataKey="net"
                stroke="var(--destructive)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        title="Gelirden net kâra köprü"
        description={
          projectionYear
            ? `${projectionYear.year} · baz senaryo · tutarlar TL (aylık tablolar bin TL) · Projeksiyon sayfasıyla aynı hesap.`
            : "Projeksiyon dönemi girilmedi."
        }
      >
        {projectionYear ? (
          <DataTable
            caption="Gelirden net kâra köprü"
            rowKey={(row) => row.label}
            rows={netProfitBridge}
            columns={[
              { header: "Kalem", cell: (row) => row.label },
              {
                header: "Tutar",
                align: "right",
                cell: (row) => (
                  <span className={row.kind === "cost" ? "text-destructive" : "font-medium"}>
                    {formatAmount(row.amount)}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Net kâr köprüsü için Veri Girişi → Projeksiyon sekmesindeki dönem, vergi oranı ve
            finansman satırlarını girin.
          </p>
        )}
      </Section>

      <Section
        title="Ürün / müşteri kırılımı"
        description="Ciro kırılımı; ürün bazlı marj henüz ölçülmedi."
      >
        <DataTable
          caption="Ürün grubu ciro kırılımı"
          rowKey={(row) => row.name}
          rows={salesBreakdown.byProduct.map((product) => ({
            name: product.name,
            revenue: product.current,
          }))}
          columns={[
            { header: "Ürün grubu", cell: (row) => row.name },
            { header: "Ciro", align: "right", cell: (row) => formatAmount(row.revenue) },
            { header: "Brüt marj", align: "right", cell: () => "Ölçülmeli" },
          ]}
        />
      </Section>

      <Insight question="Kâr arttıysa nakde yansıdı mı?">{profitToCashInsight(model)}</Insight>
    </AppShell>
  );
}
