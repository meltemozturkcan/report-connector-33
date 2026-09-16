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

export const Route = createFileRoute("/cac")({
  head: () => ({
    meta: [
      { title: "Müşteri Kazanım Maliyeti (CAC) — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Kanal bazlı müşteri kazanım maliyeti, CAC geri ödeme süresi ve dönüşüm hunisi ile büyüme harcamasının verimliliği.",
      },
      { property: "og:title", content: "Müşteri Kazanım Maliyeti (CAC)" },
      {
        property: "og:description",
        content: "Büyüme harcaması arttıysa kazanım maliyeti ve geri ödeme süresi nasıl değişti?",
      },
    ],
  }),
  component: CacPage,
});

function CacPage() {
  const {
    cacDetail,
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
        {acquisition.hasAcquisitionData ? <AcquisitionCacFallback /> : <EmptyState />}
      </AppShell>
    );
  }

  const current = currentUnitEconomics;
  const previous = previousUnitEconomics;
  const totalSpend = current.marketingSpend + current.salesSpend;
  const ratio = ltvDetail.currentLtv / current.cac;

  return (
    <AppShell>
      <PageHeader
        title="Müşteri Kazanım Maliyeti (CAC)"
        description="Girişim tarafında büyümenin fiyatı: bir müşteriyi kazanmak için harcanan tutar ve bu tutarın ne kadar sürede geri döndüğü. Tutarlar müşteri başına TL, harcamalar bin TL."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Blended CAC"
          value={`${formatAmount(current.cac)} TL`}
          delta={{
            text: `${formatPercent(changePercent(current.cac, previous.cac))} önceki aya göre`,
            tone: "negative",
          }}
        />
        <KpiCard
          label="CAC geri ödeme süresi"
          value={`${formatAmount(cacDetail.paybackMonths, 1)} ay`}
          delta={{
            text: `Hedef ${cacDetail.targetPaybackMonths} ay`,
            tone: cacDetail.paybackMonths <= cacDetail.targetPaybackMonths ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="LTV / CAC"
          value={formatRatio(ratio, 1)}
          delta={{ text: `Hedef 3,0x`, tone: ratio >= 3 ? "positive" : "negative" }}
        />
        <KpiCard
          label="Yeni müşteri"
          value={formatAmount(current.newCustomers)}
          delta={{
            text: `${formatPercent(changePercent(current.newCustomers, previous.newCustomers))} önceki aya göre`,
            tone: "positive",
          }}
        />
      </div>

      <Section
        title="CAC ve yeni müşteri seyri"
        description="Kazanım harcaması artarken müşteri başına maliyetin yönü."
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={unitEconomics} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} />
              <Tooltip formatter={(value: number) => formatAmount(value)} />
              <Line type="monotone" dataKey="cac" name="CAC (TL)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="newCustomers"
                name="Yeni müşteri"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Insight question="Harcama arttıysa kazanım verimi ne oldu?">
          Kazanım harcaması {formatAmount(totalSpend)} bin TL'ye çıkarken CAC beş ayda{" "}
          {formatPercent(changePercent(current.cac, unitEconomics[0]!.cac))} arttı. Yeni müşteri sayısı
          artıyor ancak her ek müşteri bir öncekinden daha pahalıya geliyor: büyüme ölçeklenmiyor,
          satın alınıyor.
        </Insight>
      </Section>

      <Section
        title={
          cacDetail.channelPeriod
            ? `Kanal bazlı CAC — ${cacDetail.channelPeriod}`
            : "Kanal bazlı CAC"
        }
        description="Her kanal için harcama, yeni uygun ücretsiz ebeveyn ve yeni ücretli ebeveyn; freemium ve ücretli kazanım maliyeti ayrı izlenir."
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cacDetail.byChannel} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="channel" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} />
              <Tooltip formatter={(value: number) => `${formatAmount(value)} TL`} />
              <Bar dataKey="freemiumCac" name="Freemium CAC (TL)" fill="hsl(var(--muted-foreground))" />
              <Bar dataKey="cac" name="Ücretli CAC (TL)" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <DataTable
            caption="Kanal bazlı freemium ve ücretli kazanım maliyeti"
            rowKey={(row) => row.channel}
            rows={[
              ...cacDetail.byChannel,
              {
                channel: "Toplam / blended",
                spend: cacDetail.totalSpend,
                freeSignups: cacDetail.totalFreeSignups,
                newCustomers: cacDetail.totalPaidCustomers,
                freemiumCac: cacDetail.channelFreemiumCac,
                cac: cacDetail.channelPaidCac,
                share: 100,
              },
            ]}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Harcama (bin TL)", align: "right", cell: (row) => formatAmount(row.spend) },
              {
                header: "Yeni uygun ücretsiz ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.freeSignups),
              },
              {
                header: "Freemium CAC (TL)",
                align: "right",
                cell: (row) => (row.freeSignups > 0 ? formatAmount(row.freemiumCac) : "—"),
              },
              {
                header: "Yeni ücretli ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.newCustomers),
              },
              {
                header: "Ücretli CAC (TL)",
                align: "right",
                cell: (row) => (row.newCustomers > 0 ? formatAmount(row.cac) : "—"),
              },
              { header: "Payı", align: "right", cell: (row) => formatPercent(row.share, 0) },
            ]}
          />
        </div>
        <Insight question="Nerede bağlandı?">
          Toplam kazanım harcaması {formatAmount(cacDetail.totalSpend)} bin TL; blended freemium CAC{" "}
          {cacDetail.totalFreeSignups > 0 ? `${formatAmount(cacDetail.channelFreemiumCac)} TL` : "—"},
          blended ücretli CAC{" "}
          {cacDetail.totalPaidCustomers > 0 ? `${formatAmount(cacDetail.channelPaidCac)} TL` : "—"}.
          Ücretli CAC'i ortalamanın üzerinde olan kanallardan, altında kalan kanallara bütçe kaydırmak
          blended CAC'i doğrudan aşağı çeker.
        </Insight>
      </Section>

      <Section title="Dönüşüm hunisi" description="CAC'in kaynağı: hunideki dönüşüm oranları.">
        <DataTable
          caption="Dönüşüm hunisi"
          rowKey={(row) => row.stage}
          rows={cacDetail.funnel.map((step, index) => ({
            ...step,
            conversion:
              index === 0 ? null : (step.count / (cacDetail.funnel[index - 1]?.count ?? step.count)) * 100,
          }))}
          columns={[
            { header: "Aşama", cell: (row) => row.stage },
            { header: "Adet", align: "right", cell: (row) => formatAmount(row.count) },
            {
              header: "Bir önceki aşamadan dönüşüm",
              align: "right",
              cell: (row) => (row.conversion === null ? "—" : formatPercent(row.conversion)),
            },
          ]}
        />
        <Insight question="Bundan sonra ne yapacağız?">
          Hunideki her aşamanın dönüşüm oranı doğrudan CAC'i belirler: son aşamadaki dönüşüm bir puan
          iyileştiğinde aynı harcama daha fazla müşteri getirir ve geri ödeme süresi hedeflenen{" "}
          {cacDetail.targetPaybackMonths} aya yaklaşır.
        </Insight>
      </Section>
    </AppShell>
  );
}

/** Aylık rapor verisi yokken edinim modelinden hesaplanan kanal bazlı CAC görünümü. */
function AcquisitionCacFallback() {
  const model = useAcquisition();
  const plan = model.b2cPlan;

  return (
    <>
      <PageHeader
        title="Müşteri Kazanım Maliyeti (CAC)"
        description="Aylık rapor verisi girilmedi. Aşağıdaki rakamlar edinim (CAC) maliyet havuzu ve kanal hedeflerinden hesaplanır."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Planlanan freemium CAC"
          value={`${formatAmount(plan.freemiumCac, 2)} TL`}
          note={`${plan.period || "Dönem"} · havuz ${formatAmount(plan.pool)} TL`}
          delta={{
            text:
              plan.buffer >= 0
                ? `Tampon ${formatAmount(plan.buffer)} TL`
                : `Üst sınır ${formatAmount(-plan.buffer)} TL aşıldı`,
            tone: plan.buffer >= 0 ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Hedef CAC üst sınırı"
          value={`${formatAmount(plan.cacTarget)} TL`}
          note={`${formatAmount(plan.eligibleTotal)} uygun ücretsiz ebeveyn · sınır ${formatAmount(plan.cacCeiling)} TL`}
        />
        <KpiCard
          label="Ücretli B2C CAC"
          value={`${formatAmount(plan.paidCac, 2)} TL`}
          note={`${formatAmount(plan.paidParents, 1)} ücretli ebeveyn · dönüşüm ${formatPercent(plan.conversionRate, 1)}`}
        />
        <KpiCard
          label="Gerçekleşen freemium CAC"
          value={plan.actualEligible > 0 ? `${formatAmount(plan.actualCac, 2)} TL` : "—"}
          note={`Gerçek harcama ${formatAmount(plan.actualSpend)} TL · ${formatAmount(plan.actualEligible)} uygun ebeveyn`}
        />
      </div>

      <Section
        title={plan.period ? `Kanal bazlı planlanan CAC — ${plan.period}` : "Kanal bazlı planlanan CAC"}
        description="Kanala atanmış doğrudan maliyet + ortak maliyetin uygun ebeveyn payına göre dağıtımı."
      >
        <DataTable
          caption="Kanal bazlı maliyet ve planlanan CAC"
          rowKey={(row) => row.channel}
          rows={[
            ...plan.channels,
            {
              channel: "Toplam / blended",
              eligibleTarget: plan.eligibleTotal,
              eligibleShare: 100,
              directCost: plan.directCost,
              sharedCost: plan.sharedCost,
              totalCost: plan.pool,
              plannedCac: plan.freemiumCac,
            },
          ]}
          columns={[
            { header: "Kanal", cell: (row) => row.channel },
            { header: "Uygun ücretsiz ebeveyn", align: "right", cell: (row) => formatAmount(row.eligibleTarget) },
            { header: "Payı", align: "right", cell: (row) => formatPercent(row.eligibleShare, 1) },
            { header: "Doğrudan maliyet (TL)", align: "right", cell: (row) => formatAmount(row.directCost) },
            { header: "Ortak pay (TL)", align: "right", cell: (row) => formatAmount(row.sharedCost, 2) },
            { header: "Toplam maliyet (TL)", align: "right", cell: (row) => formatAmount(row.totalCost, 2) },
            { header: "Planlanan CAC (TL)", align: "right", cell: (row) => formatAmount(row.plannedCac, 2) },
          ]}
        />
        <Insight question="Hedef tutuyor mu?">
          Maliyet havuzu {formatAmount(plan.pool)} TL, üst sınır {formatAmount(plan.cacCeiling)} TL;
          planlanan freemium CAC {formatAmount(plan.freemiumCac, 2)} TL. Ücretli tarafta{" "}
          {formatPercent(plan.conversionRate, 1)} dönüşüm ile ücretli CAC{" "}
          {formatAmount(plan.paidCac, 2)} TL oluyor.
        </Insight>
      </Section>

      {plan.actuals.length > 0 ? (
        <Section
          title="Dönem sonu kanıt tablosu"
          description="Gerçek harcama ÷ gerçek uygun ücretsiz ebeveyn = gerçek freemium CAC."
        >
          <DataTable
            caption="Gerçekleşen kanal maliyetleri"
            rowKey={(row) => row.channel}
            rows={plan.actuals}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Gerçek harcama (TL)", align: "right", cell: (row) => formatAmount(row.actualSpend) },
              { header: "Uygun ücretsiz ebeveyn", align: "right", cell: (row) => formatAmount(row.actualEligible) },
              {
                header: "Gerçek freemium CAC (TL)",
                align: "right",
                cell: (row) => (row.actualEligible > 0 ? formatAmount(row.actualCac, 2) : "—"),
              },
              {
                header: "Chatbot destekli tamamlanma",
                align: "right",
                cell: (row) => formatAmount(row.chatbotAssistedCompletion),
              },
            ]}
          />
        </Section>
      ) : null}
    </>
  );
}
