import { createFileRoute } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import { baseScenario, bestScenario, forecast, hasReportData, narrative, worstScenario } from "@/data/report";
import { formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/tahmin")({
  head: () => ({
    meta: [
      { title: "Yıl Sonu Tahmini — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Bütçe, baz, kötümser ve iyimser senaryolarla yıl sonu satış, FAVÖK ve nakit tahmini.",
      },
      { property: "og:title", content: "Yıl Sonu Tahmini" },
      { property: "og:description", content: "Bugünkü sapmalar yıl sonunu nasıl değiştiriyor?" },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const ebitdaGap = baseScenario.ebitda - forecast.budgetFullYear.ebitda;

  return (
    <AppShell>
      <PageHeader
        title="Yıl Sonu Tahmini"
        description="Tahmin, geçmiş sapmaların geleceğe taşınmasıdır. Her ay güncellenir ve varsayımları açıkça yazılır."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bütçe FAVÖK" value={formatAmount(forecast.budgetFullYear.ebitda)} />
        <KpiCard
          label="Baz senaryo FAVÖK"
          value={formatAmount(baseScenario.ebitda)}
          delta={{ text: `${formatAmount(ebitdaGap)} bütçe altı`, tone: "negative" }}
        />
        <KpiCard label="Baz senaryo satış" value={formatAmount(baseScenario.sales)} />
        <KpiCard
          label="Yıl sonu net nakit"
          value={formatAmount(baseScenario.netCash)}
          delta={{
            text: `${formatAmount(baseScenario.netCash - forecast.budgetFullYear.netCash)} bütçe altı`,
            tone: "negative",
          }}
        />
      </div>

      <Section title="Senaryolar" description="Kötümser, baz ve iyimser senaryoların bütçe ile karşılaştırması.">
        <DataTable
          caption="Yıl sonu senaryoları"
          rowKey={(row) => row.name}
          rows={[
            { ...forecast.budgetFullYear, name: "Bütçe" },
            worstScenario,
            baseScenario,
            bestScenario,
          ]}
          columns={[
            { header: "Senaryo", cell: (row) => row.name },
            { header: "Satış", align: "right", cell: (row) => formatAmount(row.sales) },
            { header: "FAVÖK", align: "right", cell: (row) => formatAmount(row.ebitda) },
            {
              header: "FAVÖK marjı",
              align: "right",
              cell: (row) => formatPercent((row.ebitda / row.sales) * 100),
            },
            { header: "Yıl sonu nakit", align: "right", cell: (row) => formatAmount(row.netCash) },
            {
              header: "Bütçe farkı (FAVÖK)",
              align: "right",
              cell: (row) =>
                row.name === "Bütçe" ? "-" : <Delta value={row.ebitda - forecast.budgetFullYear.ebitda} />,
            },
          ]}
        />
      </Section>

      <Section title="Kalan 4 ay" description="Baz senaryoda aylık satış ve FAVÖK patikası.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast.path} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => formatAmount(value)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line name="Satış" dataKey="sales" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line name="FAVÖK" dataKey="ebitda" stroke="var(--positive)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Tahmini belirleyen varsayımlar" description="Her varsayım yönetim kararına açık bırakılmıştır.">
        <DataTable
          caption="Tahmin varsayımları"
          rowKey={(row) => row.name}
          rows={forecast.drivers}
          columns={[
            { header: "Varsayım", cell: (row) => row.name },
            {
              header: "Yön",
              align: "right",
              cell: (row) => (
                <span className={row.impact === "+" ? "text-positive" : "text-destructive"}>
                  {row.impact === "+" ? "Olumlu" : "Olumsuz"}
                </span>
              ),
            },
            { header: "Not", cell: (row) => row.note },
          ]}
        />
      </Section>

      <Insight question="Bundan sonra ne yapacağız?">
        Aksiyon planı tam uygulanırsa baz senaryo iyimser senaryoya doğru{" "}
        {formatAmount(bestScenario.ebitda - baseScenario.ebitda)} FAVÖK ve{" "}
        {formatAmount(bestScenario.netCash - baseScenario.netCash)} nakit iyileşmesi sağlar. Öncelik
        sırası: tahsilat süresinin kısaltılması, stok azaltımı, fiyat güncellemesi ve kısa vadeli
        borcun uzun vadeye çevrilmesi.
      </Insight>

      <Section title="Aksiyon takibi" description="Yönetici özetindeki kararların termin listesi.">
        <DataTable
          caption="Aksiyon takibi"
          rowKey={(row) => row.action}
          rows={narrative.next}
          columns={[
            { header: "Aksiyon", cell: (row) => row.action },
            { header: "Sorumlu", cell: (row) => row.owner },
            { header: "Termin", align: "right", cell: (row) => row.due },
          ]}
        />
      </Section>
    </AppShell>
  );
}
