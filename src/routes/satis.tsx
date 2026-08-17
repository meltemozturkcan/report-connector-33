import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ComposedChart } from "recharts";

import { AppShell } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import {
  currentMargin,
  currentMonth,
  monthly,
  previousMargin,
  previousMonth,
  salesBreakdown,
} from "@/data/report";
import { changePercent, formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/satis")({
  head: () => ({
    meta: [
      { title: "Satış Performansı — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Aylık net satış, geçen ay ve bütçeye göre değişim, ürün ve bölge kırılımı, fiyat-hacim etkisi.",
      },
      { property: "og:title", content: "Satış Performansı — Aylık Yönetim Raporu" },
      {
        property: "og:description",
        content: "Satış büyümesinin kaynağı: hacim mi, fiyat mı, ürün karması mı?",
      },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const current = currentMonth;
  const previous = previousMonth;
  const effect = salesBreakdown.volumePriceEffect;

  return (
    <AppShell>
      <PageHeader
        title="Satış Performansı"
        description="Satışın büyüklüğü kadar bileşimi de önemlidir. Büyümenin fiyattan mı hacimden mi geldiği, kârlılığa ne olacağını belirler."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aylık net satış"
          value={formatAmount(current.sales)}
          delta={{
            text: `${formatPercent(changePercent(current.sales, previous.sales))} önceki aya göre`,
            tone: "positive",
          }}
        />
        <KpiCard
          label="Bütçeye göre"
          value={formatAmount(current.sales - current.budgetSales)}
          delta={{
            text: formatPercent(changePercent(current.sales, current.budgetSales)),
            tone: "positive",
          }}
        />
        <KpiCard
          label="Fiyat etkisi"
          value={formatAmount(effect.priceEffect)}
          note="Büyümenin ana kaynağı fiyat artışı."
        />
        <KpiCard
          label="İlk müşterinin payı"
          value={formatPercent(salesBreakdown.topCustomerShare * 100, 0)}
          note="Müşteri yoğunlaşma riski takip edilmeli."
        />
      </div>

      <Section title="Aylık satış ve bütçe" description="Gerçekleşen net satış ile bütçelenen satışın seyri.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => formatAmount(value)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Gerçekleşen" dataKey="sales" fill="var(--primary)" />
              <Line name="Bütçe" dataKey="budgetSales" stroke="var(--warning)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Ürün grubu kırılımı" description="Bu ay, geçen ay ve bütçe karşılaştırması.">
          <DataTable
            caption="Ürün grubu bazında satış"
            rowKey={(row) => row.name}
            rows={salesBreakdown.byProduct}
            columns={[
              { header: "Ürün grubu", cell: (row) => row.name },
              { header: "Bu ay", align: "right", cell: (row) => formatAmount(row.current) },
              { header: "Geçen ay", align: "right", cell: (row) => formatAmount(row.previous) },
              {
                header: "Bütçe sapması",
                align: "right",
                cell: (row) => <Delta value={row.current - row.budget} />,
              },
            ]}
          />
        </Section>

        <Section title="Bölge kırılımı" description="Satışın coğrafi dağılımı ve aylık değişim.">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesBreakdown.byRegion} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={90} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar name="Bu ay" dataKey="current" fill="var(--primary)" />
                <Bar name="Geçen ay" dataKey="previous" fill="var(--muted-foreground)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Büyümenin kaynağı" description="Hacim, fiyat ve ürün karması etkisinin ayrıştırılması.">
        <DataTable
          caption="Fiyat, hacim ve karma etkisi"
          rowKey={(row) => row.label}
          rows={[
            { label: "Hacim etkisi", value: effect.volumeEffect },
            { label: "Fiyat etkisi", value: effect.priceEffect },
            { label: "Ürün karması etkisi", value: effect.mixEffect },
          ]}
          columns={[
            { header: "Etki", cell: (row) => row.label },
            { header: "Tutar", align: "right", cell: (row) => <Delta value={row.value} /> },
          ]}
        />
      </Section>

      <Insight question="Satış arttıysa kârlılığa ne oldu?">
        Satış geçen aya göre {formatPercent(changePercent(current.sales, previous.sales))} arttı, ancak
        büyümenin büyük bölümü fiyat artışından geliyor ve hammadde maliyeti daha hızlı yükseldi. Brüt
        marj {formatPercent(previousMargin.gross)} seviyesinden{" "}
        {formatPercent(currentMargin.gross)} seviyesine geriledi; FAVÖK tutarı ciro
        büyümesine rağmen azaldı. Ayrıntı için kârlılık sayfasına bakınız.
      </Insight>
    </AppShell>
  );
}
