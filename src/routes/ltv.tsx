import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReport } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { changePercent, formatAmount, formatPercent, formatRatio } from "@/lib/format";

export const Route = createFileRoute("/ltv")({
  head: () => ({
    meta: [
      { title: "Müşteri Yaşam Boyu Değeri (LTV) — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Kohort bazlı elde tutma, churn, ARPU ve segment bazlı LTV ile müşteri yaşam boyu değerinin seyri.",
      },
      { property: "og:title", content: "Müşteri Yaşam Boyu Değeri (LTV)" },
      {
        property: "og:description",
        content: "Churn arttıysa müşteri değeri ve LTV/CAC dengesi nasıl değişti?",
      },
    ],
  }),
  component: LtvPage,
});

function LtvPage() {
  const {
    currentUnitEconomics,
    hasReportData,
    ltvDetail,
    previousUnitEconomics,
    unitEconomics,
  } = useReport();

  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const current = currentUnitEconomics;
  const previous = previousUnitEconomics;
  const ratio = ltvDetail.currentLtv / current.cac;

  return (
    <AppShell>
      <PageHeader
        title="Müşteri Yaşam Boyu Değeri (LTV)"
        description="Bir müşterinin ilişki süresi boyunca bıraktığı brüt kâr. LTV = ARPU × brüt marj ÷ aylık churn. Tutarlar müşteri başına TL."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="LTV"
          value={`${formatAmount(ltvDetail.currentLtv)} TL`}
          delta={{
            text: `${formatPercent(changePercent(ltvDetail.currentLtv, ltvDetail.previousLtv))} önceki aya göre`,
            tone: "negative",
          }}
        />
        <KpiCard
          label="Aylık churn"
          value={formatPercent(current.churnRate)}
          delta={{
            text: `${formatAmount(current.churnRate - previous.churnRate, 1)} puan artış`,
            tone: "negative",
          }}
        />
        <KpiCard
          label="Ortalama yaşam süresi"
          value={`${formatAmount(ltvDetail.averageLifetimeMonths, 1)} ay`}
        />
        <KpiCard
          label="LTV / CAC"
          value={formatRatio(ratio, 1)}
          delta={{ text: "Hedef 3,0x", tone: "negative" }}
        />
      </div>

      <Section title="LTV ve churn seyri" description="Müşteri değerinin yönü ve arkasındaki elde tutma performansı.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={unitEconomics} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} className="text-xs" width={64} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} className="text-xs" width={44} />
              <Tooltip formatter={(value: number) => formatAmount(value, 1)} />
              <Line yAxisId="left" type="monotone" dataKey="ltv" name="LTV (TL)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="cac" name="CAC (TL)" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="churnRate" name="Churn (%)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Insight question="Neden LTV geriliyor?">
          ARPU {formatAmount(current.arpu)} TL ile artmaya devam ediyor, ancak aylık churn{" "}
          {formatPercent(previous.churnRate)} seviyesinden {formatPercent(current.churnRate)} seviyesine
          çıktı. Churn'deki artış ortalama yaşam süresini kısaltıyor ve fiyat artışının LTV'ye katkısını
          silip götürüyor.
        </Insight>
      </Section>

      <Section title="Kohort performansı" description="Yeni kohortlar eskileri kadar uzun kalıyor mu?">
        <DataTable
          caption="Kohort bazlı 12. ay elde tutma ve LTV"
          rowKey={(row) => row.cohort}
          rows={ltvDetail.cohorts}
          columns={[
            { header: "Kohort", cell: (row) => row.cohort },
            { header: "12. ay elde tutma", align: "right", cell: (row) => formatPercent(row.month12Retention * 100, 0) },
            { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
          ]}
        />
        <Insight question="Kalite mi düşüyor?">
          2025 Q3 kohortunda %74 olan 12. ay elde tutma, 2026 Q2 kohortunda %66'ya indi. Ücretli kanaldan
          gelen müşteriler daha erken ayrılıyor; yüksek CAC ile alınan büyüme, düşük LTV ile geri dönüyor.
        </Insight>
      </Section>

      <Section title="Segment bazlı birim ekonomi" description="Hangi segment sürdürülebilir büyüme sağlıyor?">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ltvDetail.bySegment} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="segment" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} />
              <Tooltip formatter={(value: number) => `${formatAmount(value)} TL`} />
              <Bar dataKey="ltv" name="LTV (TL)" fill="hsl(var(--primary))" />
              <Bar dataKey="cac" name="CAC (TL)" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <DataTable
            caption="Segment bazlı LTV, CAC ve churn"
            rowKey={(row) => row.segment}
            rows={ltvDetail.bySegment}
            columns={[
              { header: "Segment", cell: (row) => row.segment },
              { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
              { header: "CAC (TL)", align: "right", cell: (row) => formatAmount(row.cac) },
              { header: "LTV / CAC", align: "right", cell: (row) => formatRatio(row.ltv / row.cac, 1) },
              { header: "Aylık churn", align: "right", cell: (row) => formatPercent(row.churnRate) },
            ]}
          />
        </div>
        <Insight question="Bundan sonra ne yapacağız?">
          Kurumsal segment {formatRatio(ltvDetail.bySegment[0]!.ltv / ltvDetail.bySegment[0]!.cac, 1)} LTV/CAC ile
          en sağlıklı alan; KOBİ segmentinde churn %5,4 ile değeri eritiyor. Kazanım bütçesinin kurumsal ve
          orta ölçek segmentine kaydırılması, net gelir elde tutma oranını{" "}
          {formatPercent(ltvDetail.netRevenueRetention * 100, 0)} seviyesinin üzerine taşır.
        </Insight>
      </Section>
    </AppShell>
  );
}
