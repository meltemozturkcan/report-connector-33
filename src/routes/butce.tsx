import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import {
  baseScenario,
  budgetVariance,
  forecast,
  netProfitVariance,
  varianceReasons,
} from "@/data/report";
import { formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/butce")({
  head: () => ({
    meta: [
      { title: "Bütçe – Gerçekleşen Sapmaları — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Satış, maliyet, faaliyet gideri ve kâr kalemlerinde bütçe-gerçekleşen sapması ve nedenleri.",
      },
      { property: "og:title", content: "Bütçe – Gerçekleşen Sapmaları" },
      {
        property: "og:description",
        content: "Sapmanın büyüklüğü kadar nedeni ve yıl sonuna etkisi önemlidir.",
      },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  return (
    <AppShell>
      <PageHeader
        title="Bütçe – Gerçekleşen Karşılaştırması"
        description="Her sapma için üç soru: ne kadar saptık, neden saptık, yıl sonuna etkisi ne olur?"
      />

      <Section title="Gelir tablosu sapma tablosu" description="Ay bazında bütçe ve gerçekleşen.">
        <DataTable
          caption="Bütçe gerçekleşen karşılaştırması"
          rowKey={(row) => row.item}
          rows={budgetVariance}
          columns={[
            { header: "Kalem", cell: (row) => row.item },
            { header: "Bütçe", align: "right", cell: (row) => formatAmount(row.budget) },
            { header: "Gerçekleşen", align: "right", cell: (row) => formatAmount(row.actual) },
            {
              header: "Sapma",
              align: "right",
              cell: (row) => <Delta value={row.actual - row.budget} />,
            },
            {
              header: "Sapma %",
              align: "right",
              cell: (row) => (
                <Delta value={((row.actual - row.budget) / Math.abs(row.budget)) * 100} digits={1} suffix="%" />
              ),
            },
          ]}
        />
      </Section>

      <Section title="Önemli sapmaların nedenleri" description="Sadece tutar değil, açıklama.">
        <DataTable
          caption="Sapma nedenleri"
          rowKey={(row) => row.item}
          rows={varianceReasons}
          columns={[
            { header: "Kalem", cell: (row) => row.item },
            { header: "Sapma", align: "right", cell: (row) => <Delta value={row.variance} /> },
            { header: "Neden", cell: (row) => row.reason },
          ]}
        />
      </Section>

      <Insight question="Bütçeden sapıldıysa yıl sonu tahmini ne olacak?">
        Satış bütçenin üzerinde olmasına rağmen brüt marj ve finansman gideri sapmaları net kârı
        bütçenin {formatPercent(
          ((netProfitVariance.budget - netProfitVariance.actual) / netProfitVariance.budget) * 100,
        )}{" "}
        altına indirdi. Aynı marj ve faiz seviyesi devam ederse yıl sonu FAVÖK baz senaryoda{" "}
        {formatAmount(baseScenario.ebitda)}, bütçe ise{" "}
        {formatAmount(forecast.budgetFullYear.ebitda)} seviyesindedir; aradaki fark{" "}
        {formatAmount(forecast.budgetFullYear.ebitda - baseScenario.ebitda)}.
      </Insight>
    </AppShell>
  );
}
