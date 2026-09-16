import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAcquisition, useReport } from "@/hooks/useReport";
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
  const acquisition = useAcquisition();

  if (!hasReportData) {
    return (
      <AppShell>
        {acquisition.hasAcquisitionData ? <AcquisitionLtvFallback /> : <EmptyState />}
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
            { header: "12. ay elde tutma", align: "right", cell: (row) => formatPercent(row.month12Retention, 0) },
            { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
          ]}
        />
        <Insight question="Kalite mi düşüyor?">
          Kohortların 12. ay elde tutma oranları düşüyorsa, yüksek CAC ile alınan büyüme düşük LTV ile geri
          döner. Tablodaki en yeni kohortun elde tutma oranını en eski kohortla karşılaştırın: fark, kazanım
          kalitesindeki değişimi gösterir.
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
          en yüksek LTV/CAC oranına sahip. Kazanım bütçesinin oranı yüksek segmentlere kaydırılması, net gelir
          elde tutma oranını{" "}
          {formatPercent(ltvDetail.netRevenueRetention, 0)} seviyesinin üzerine taşır.
        </Insight>
      </Section>
    </AppShell>
  );
}

/** Aylık rapor verisi yokken edinim modelinin Basic / Premium birim ekonomisi. */
function AcquisitionLtvFallback() {
  const model = useAcquisition();

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
          value={formatRatio(model.b2cLtvToCac, 1)}
          delta={{ text: "Hedef 3,0x", tone: model.b2cLtvToCac >= 3 ? "positive" : "negative" }}
        />
        <KpiCard
          label="Geri ödeme süresi"
          value={`${formatAmount(model.b2cPaybackMonths, 1)} ay`}
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
            { header: "Aylık fiyat (TL)", align: "right", cell: (row) => formatAmount(row.monthlyPrice) },
            { header: "Komisyon (TL)", align: "right", cell: (row) => formatAmount(row.commission, 2) },
            { header: "Katkı payı (TL)", align: "right", cell: (row) => formatAmount(row.contribution, 2) },
            { header: "Katkı oranı", align: "right", cell: (row) => formatPercent(row.contributionRate, 1) },
            { header: "Aylık churn", align: "right", cell: (row) => formatPercent(row.churnRate, 1) },
            { header: "Beklenen ömür (ay)", align: "right", cell: (row) => formatAmount(row.expectedLifetimeMonths, 1) },
            { header: "LTV (TL)", align: "right", cell: (row) => formatAmount(row.ltv) },
            { header: "Karışım payı", align: "right", cell: (row) => formatPercent(row.mixShare, 1) },
          ]}
        />
        <Insight question="Sürdürülebilir mi?">
          Karma LTV {formatAmount(model.blendedLtv)} TL, ücretli CAC{" "}
          {formatAmount(model.b2cPlan.paidCac, 2)} TL; oran {formatRatio(model.b2cLtvToCac, 1)}. Churn
          bir puan düşerse beklenen ömür uzar ve aynı CAC ile LTV/CAC doğrudan yükselir.
        </Insight>
      </Section>
    </>
  );
}
