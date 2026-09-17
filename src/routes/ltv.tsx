import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAcquisition, useReport } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { cohortInsight, ltvTrendInsight, segmentInsight } from "@/lib/insights";
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
  const model = useReport();
  const { currentUnitEconomics, hasReportData, ltvDetail, previousUnitEconomics, unitEconomics } =
    model;
  const acquisition = useAcquisition();

  // LTV sayfası aylık gelir tablosuna değil, birim ekonomisi satırlarına dayanır.
  if (unitEconomics.length === 0) {
    return (
      <AppShell>
        {acquisition.hasAcquisitionData ? <AcquisitionLtvFallback /> : <EmptyState />}
      </AppShell>
    );
  }

  const current = currentUnitEconomics;
  const previous = previousUnitEconomics;
  const ratio = current.cac > 0 ? ltvDetail.currentLtv / current.cac : 0;

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
            tone: ltvDetail.currentLtv >= ltvDetail.previousLtv ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Aylık churn"
          value={formatPercent(current.churnRate)}
          delta={{
            text: `${formatAmount(current.churnRate - previous.churnRate, 1)} puan değişim`,
            tone: current.churnRate > previous.churnRate ? "negative" : "positive",
          }}
        />
        <KpiCard
          label="Ortalama yaşam süresi"
          value={`${formatAmount(ltvDetail.averageLifetimeMonths, 1)} ay`}
        />
        <KpiCard
          label="LTV / CAC"
          value={formatRatio(ratio, 1)}
          delta={{ text: `Hedef 3,0x`, tone: ratio >= 3 ? "positive" : "negative" }}
        />
      </div>

      <Section
        title="LTV ve churn seyri"
        description="Müşteri değerinin yönü ve arkasındaki elde tutma performansı."
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={unitEconomics} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={64}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={44}
              />
              <Tooltip formatter={(value: number) => formatAmount(value, 1)} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ltv"
                name="LTV (TL)"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cac"
                name="CAC (TL)"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="churnRate"
                name="Churn (%)"
                stroke="var(--destructive)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Insight question="LTV neden değişti?">{ltvTrendInsight(model)}</Insight>
      </Section>

      <Section
        title="Kohort performansı"
        description="Yeni kohortlar eskileri kadar uzun kalıyor mu?"
      >
        <DataTable
          caption="Kohort bazlı 12. ay elde tutma ve LTV"
          rowKey={(row) => row.cohort}
          rows={ltvDetail.cohorts}
          columns={[
            { header: "Kohort", cell: (row) => row.cohort },
            {
              header: "12. ay elde tutma",
              align: "right",
              cell: (row) => formatPercent(row.month12Retention, 0),
            },
            { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
          ]}
        />
        <Insight question="Kalite mi düşüyor?">{cohortInsight(model)}</Insight>
      </Section>

      <Section
        title="Segment bazlı birim ekonomi"
        description="Hangi segment sürdürülebilir büyüme sağlıyor?"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ltvDetail.bySegment} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="segment" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} />
              <Tooltip formatter={(value: number) => `${formatAmount(value)} TL`} />
              <Bar dataKey="ltv" name="LTV (TL)" fill="var(--primary)" />
              <Bar dataKey="cac" name="CAC (TL)" fill="var(--muted-foreground)" />
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
              {
                header: "LTV / CAC",
                align: "right",
                cell: (row) => formatRatio(row.ltv / row.cac, 1),
              },
              {
                header: "Aylık churn",
                align: "right",
                cell: (row) => formatPercent(row.churnRate),
              },
            ]}
          />
        </div>
        <Insight question="Bundan sonra ne yapacağız?">{segmentInsight(model)}</Insight>
      </Section>
    </AppShell>
  );
}

/** Aylık rapor verisi yokken edinim modelinin Basic / Premium birim ekonomisi. */
function AcquisitionLtvFallback() {
  const model = useAcquisition();
  /** Ölçülen (cohort) CAC yoksa plandaki ücretli CAC kullanılır. */
  const paidCac = model.measuredPaidCac > 0 ? model.measuredPaidCac : model.b2cPlan.paidCac;
  const ratio = paidCac > 0 ? model.blendedLtv / paidCac : 0;
  const payback = model.blendedContribution > 0 ? paidCac / model.blendedContribution : 0;

  return (
    <>
      <PageHeader
        title="Müşteri Yaşam Boyu Değeri (LTV)"
        description="Aylık rapor verisi girilmedi. Aşağıdaki rakamlar B2C birim ekonomisinden hesaplanır: LTV = katkı payı ÷ aylık churn."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Karma LTV"
          value={`${formatAmount(model.blendedLtv)} TL`}
          note={`Karma katkı ${formatAmount(model.blendedContribution, 2)} TL / ay`}
        />
        <KpiCard
          label="Ücretli B2C CAC"
          value={`${formatAmount(model.b2cPlan.paidCac, 2)} TL`}
          note={`Ölçülen ${formatAmount(model.measuredPaidCac, 2)} TL`}
        />
        <KpiCard
          label="LTV / CAC"
          value={formatRatio(ratio, 1)}
          delta={{ text: "Hedef 3,0x", tone: ratio >= 3 ? "positive" : "negative" }}
        />
        <KpiCard
          label="Geri ödeme süresi"
          value={`${formatAmount(payback, 1)} ay`}
          note={`Karma katkı ${formatAmount(model.blendedContribution, 2)} TL / ay`}
        />
      </div>

      <Section
        title="Basic / Premium birim ekonomisi"
        description="Fiyat, ödeme komisyonu, teknik ve destek maliyeti sonrası katkı payı ile beklenen ömür."
      >
        <DataTable
          caption="Paket bazlı katkı payı ve LTV"
          rowKey={(row) => row.name}
          rows={model.packages}
          columns={[
            { header: "Paket", cell: (row) => row.name },
            {
              header: "Aylık fiyat (TL)",
              align: "right",
              cell: (row) => formatAmount(row.monthlyPrice),
            },
            {
              header: "Komisyon (TL)",
              align: "right",
              cell: (row) => formatAmount(row.commission, 2),
            },
            {
              header: "Katkı payı (TL)",
              align: "right",
              cell: (row) => formatAmount(row.contribution, 2),
            },
            {
              header: "Katkı oranı",
              align: "right",
              cell: (row) => formatPercent(row.contributionRate, 1),
            },
            {
              header: "Aylık churn",
              align: "right",
              cell: (row) => formatPercent(row.churnRate, 1),
            },
            {
              header: "Beklenen ömür (ay)",
              align: "right",
              cell: (row) => formatAmount(row.expectedLifetimeMonths, 1),
            },
            { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
            {
              header: "Karışım payı",
              align: "right",
              cell: (row) => formatPercent(row.mixShare, 1),
            },
          ]}
        />
        <Insight question="Sürdürülebilir mi?">
          Karma LTV {formatAmount(model.blendedLtv)} TL, ücretli CAC {formatAmount(paidCac, 2)} TL;
          oran {formatRatio(ratio, 1)}. Churn bir puan düşerse beklenen ömür uzar ve aynı CAC ile
          LTV/CAC doğrudan yükselir.
        </Insight>
      </Section>
    </>
  );
}
