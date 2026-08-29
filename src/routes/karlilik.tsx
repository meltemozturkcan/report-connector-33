import { createFileRoute } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import {
  cashFlow,
  currentMargin,
  currentMonth,
  hasReportData,
  margins,
  previousMargin,
  previousMonth,
  salesBreakdown,
} from "@/data/report";
import { formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/karlilik")({
  head: () => ({
    meta: [
      { title: "Kârlılık — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Brüt kâr, FAVÖK ve net kâr marjlarının seyri, marj daralmasının nedenleri ve nakde yansıması.",
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
  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const bridge = [
    { label: "Önceki ay FAVÖK marjı", value: previousMargin.ebitda },
    { label: "Hammadde maliyeti etkisi", value: -1.4 },
    { label: "Ürün karması etkisi", value: -0.4 },
    { label: "Fiyat artışı etkisi", value: 0.9 },
    { label: "Faaliyet gideri kaldıracı", value: -0.1 },
    { label: "Bu ay FAVÖK marjı", value: currentMargin.ebitda },
  ];

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
          delta={{ text: `${formatPercent(currentMargin.gross)} marj`, tone: "negative" }}
        />
        <KpiCard
          label="FAVÖK"
          value={formatAmount(currentMonth.ebitda)}
          delta={{ text: `${formatPercent(currentMargin.ebitda)} marj`, tone: "negative" }}
        />
        <KpiCard
          label="Net kâr"
          value={formatAmount(currentMonth.netProfit)}
          delta={{ text: `${formatPercent(currentMargin.net)} marj`, tone: "negative" }}
        />
        <KpiCard
          label="Nakde dönüşüm"
          value={formatPercent((cashFlow.operating / currentMonth.ebitda) * 100)}
          note="Faaliyet nakit akışı / FAVÖK"
        />
      </div>

      <Section title="Marj seyri" description="Brüt kâr, FAVÖK ve net kâr marjlarının son 6 aylık gelişimi.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={margins} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                formatter={(value: number) => formatPercent(value)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line name="Brüt kâr marjı" dataKey="gross" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line name="FAVÖK marjı" dataKey="ebitda" stroke="var(--positive)" strokeWidth={2} dot={false} />
              <Line name="Net kâr marjı" dataKey="net" stroke="var(--destructive)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="FAVÖK marjı köprüsü" description="Önceki aydan bu aya marj değişiminin nedenleri (puan).">
        <DataTable
          caption="Marj köprüsü"
          rowKey={(row) => row.label}
          rows={bridge}
          columns={[
            { header: "Etken", cell: (row) => row.label },
            {
              header: "Puan",
              align: "right",
              cell: (row) =>
                row.label.includes("marjı") ? (
                  <span className="font-medium">{formatPercent(row.value)}</span>
                ) : (
                  <Delta value={row.value} digits={1} suffix=" puan" />
                ),
            },
          ]}
        />
      </Section>

      <Section title="Ürün / müşteri kârlılığı" description="Marj daralmasının nerede yoğunlaştığı.">
        <DataTable
          caption="Ürün grubu kârlılığı"
          rowKey={(row) => row.name}
          rows={salesBreakdown.byProduct.map((product, index) => ({
            name: product.name,
            revenue: product.current,
            grossMargin: [31.5, 26.8, 38.2, 14.6][index] ?? 0,
            change: [-1.2, -2.4, 0.3, -3.8][index] ?? 0,
          }))}
          columns={[
            { header: "Ürün grubu", cell: (row) => row.name },
            { header: "Ciro", align: "right", cell: (row) => formatAmount(row.revenue) },
            { header: "Brüt marj", align: "right", cell: (row) => formatPercent(row.grossMargin) },
            {
              header: "Değişim",
              align: "right",
              cell: (row) => <Delta value={row.change} digits={1} suffix=" puan" />,
            },
          ]}
        />
      </Section>

      <Insight question="Kâr arttıysa nakde yansıdı mı?">
        Hayır. Ciro {formatAmount(currentMonth.sales - previousMonth.sales)} artmasına rağmen FAVÖK{" "}
        {formatAmount(currentMonth.ebitda - previousMonth.ebitda)} değişti ve faaliyet nakit akışı{" "}
        {formatAmount(cashFlow.operating)} ile negatife döndü. Aradaki fark işletme sermayesinde
        bağlandı; ayrıntı nakit sayfasındadır.
      </Insight>
    </AppShell>
  );
}
