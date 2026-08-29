import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import {
  cacDetail,
  currentUnitEconomics,
  hasReportData,
  ltvDetail,
  previousUnitEconomics,
  unitEconomics,
} from "@/data/report";
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
  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
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
          delta={{ text: `Hedef ${cacDetail.targetPaybackMonths} ay`, tone: "negative" }}
        />
        <KpiCard
          label="LTV / CAC"
          value={formatRatio(ratio, 1)}
          delta={{ text: "Hedef 3,0x", tone: "negative" }}
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

      <Section title="Kanal bazlı CAC" description="Hangi kanal ucuza, hangisi pahalıya müşteri getiriyor?">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cacDetail.byChannel} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="channel" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" width={64} />
              <Tooltip formatter={(value: number) => `${formatAmount(value)} TL`} />
              <Bar dataKey="cac" name="CAC (TL)" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <DataTable
            caption="Kanal bazlı müşteri kazanım maliyeti"
            rowKey={(row) => row.channel}
            rows={cacDetail.byChannel}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Harcama (bin TL)", align: "right", cell: (row) => formatAmount(row.spend) },
              { header: "Yeni müşteri", align: "right", cell: (row) => formatAmount(row.newCustomers) },
              { header: "CAC (TL)", align: "right", cell: (row) => formatAmount(row.cac) },
              { header: "Payı", align: "right", cell: (row) => formatPercent(row.share * 100, 0) },
            ]}
          />
        </div>
        <Insight question="Nerede bağlandı?">
          Yeni müşterilerin %47'si organik ve referans kanalından, toplam harcamanın yalnızca %19'u ile
          geliyor. Ücretli kanalların CAC'i ortalamanın {formatRatio(cacDetail.paidCac / cacDetail.blendedCac, 1)} üzerinde;
          bütçenin ücretli taraftan referans programına kaydırılması blended CAC'i doğrudan aşağı çeker.
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
          Deneme → ücretli müşteri dönüşümü %16,4. Bu oran 2 puan iyileşirse aynı harcama ile CAC yaklaşık
          %11 düşer ve geri ödeme süresi hedeflenen {cacDetail.targetPaybackMonths} aya yaklaşır.
        </Insight>
      </Section>
    </AppShell>
  );
}
