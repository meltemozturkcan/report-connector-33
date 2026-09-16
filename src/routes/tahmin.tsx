import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useProjection } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { selectScenario, type CollectionView, type ScenarioName } from "@/lib/projection-calc";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

export const Route = createFileRoute("/tahmin")({
  head: () => ({
    meta: [
      { title: "Projeksiyon 2027–2032 — Morvoi Yönetim Raporu" },
      {
        name: "description",
        content:
          "2027–2032 net satış, brüt kâr, FAVÖK, net kâr ve nakit projeksiyonu; senaryo ve tahsilat görünümü seçilebilir.",
      },
      { property: "og:title", content: "Projeksiyon 2027–2032" },
      {
        property: "og:description",
        content: "Satış, maliyet ve nakit sürücülerinden otomatik hesaplanan çok yıllı projeksiyon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectionPage,
});

const scenarioOptions: ScenarioName[] = ["Kötümser", "Baz", "İyimser"];
const currentYear = new Date().getUTCFullYear();

const selectClass =
  "h-9 w-full border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProjectionPage() {
  const model = useProjection();
  const [scenario, setScenario] = useState<ScenarioName>("Baz");
  const [view, setView] = useState<CollectionView>("accrual");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const active = useMemo(() => selectScenario(model, scenario, view), [model, scenario, view]);
  /** Varsayılan: veri girilmiş son yıl; hiç satışı olmayan yıllar öne çıkarılmaz. */
  const yearRow = useMemo(() => {
    const selected = active.years.find((row) => row.year === selectedYear);
    if (selected) return selected;
    const withSales = [...active.years].reverse().find((row) => row.netSales !== 0 || row.opex !== 0);
    return withSales ?? active.years[0];
  }, [active.years, selectedYear]);


  if (!model.hasProjectionData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const showRemainingMonths =
    yearRow !== undefined && yearRow.year.includes(String(currentYear)) && model.settings.remainingMonths > 0;

  const bridge = yearRow
    ? [
        { label: "Net satış", amount: yearRow.netSales, kind: "total" as const },
        { label: "Satışların maliyeti", amount: -yearRow.variableCost, kind: "cost" as const },
        { label: "Brüt kâr", amount: yearRow.grossProfit, kind: "total" as const },
        { label: "Faaliyet gideri", amount: -yearRow.opex, kind: "cost" as const },
        { label: "FAVÖK", amount: yearRow.ebitda, kind: "total" as const },
        { label: "Amortisman", amount: -yearRow.amortization, kind: "cost" as const },
        { label: "Finansal maliyet", amount: -yearRow.financialCost, kind: "cost" as const },
        { label: "Vergi", amount: -yearRow.tax, kind: "cost" as const },
        { label: "Net kâr", amount: yearRow.netProfit, kind: "total" as const },
      ]
    : [];

  const trend = active.years.map((row) => ({
    year: row.year,
    netSales: row.netSales,
    ebitda: row.ebitda,
    netProfit: row.netProfit,
    ebitdaMarginRate: row.ebitdaMarginRate,
    netMarginRate: row.netMarginRate,
  }));

  return (
    <AppShell>
      <PageHeader
        title="Projeksiyon 2027–2032"
        description="Bu sayfadaki tutarlar TL'dir. Sonuçlar elle girilmez: gelir fizibilite dönemlerinden, maliyet ham gider defterinden, nakit ise CAPEX ve finansman satırlarından gelir. Net kâr = FAVÖK − amortisman − finansal maliyet − vergi."
      />

      <Section
        title="Plan ayarları"
        description="Bu alanlar yalnızca sürücüdür; kartlardaki sonuçlar otomatik hesaplanır."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="plan-range">
              Plan başlangıcı / bitişi
            </label>
            <p id="plan-range" className="mt-1 text-sm tabular-nums text-foreground">
              {model.startYear} – {model.endYear}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="scenario">
              Senaryo
            </label>
            <select
              id="scenario"
              className={`mt-1 ${selectClass}`}
              value={scenario}
              onChange={(event) => setScenario(event.target.value as ScenarioName)}
            >
              {scenarioOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="year">
              Görüntülenen yıl
            </label>
            <select
              id="year"
              className={`mt-1 ${selectClass}`}
              value={yearRow?.year ?? ""}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {active.years.map((row) => (
                <option key={row.year} value={row.year}>
                  {row.year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="view">
              Tahsilat yöntemi
            </label>
            <select
              id="view"
              className={`mt-1 ${selectClass}`}
              value={view}
              onChange={(event) => setView(event.target.value as CollectionView)}
            >
              <option value="accrual">Gelir tahakkuku</option>
              <option value="cash">Nakit akışı (tahsilat)</option>
            </select>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">B2C geliri ana senaryoda</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {model.settings.includeB2cRevenue ? "Dahil" : "Kapalı — doğrulanmadı"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kurum geliri ana senaryoda</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {model.settings.includeInstitutionRevenue ? "Dahil" : "Kapalı — doğrulanmadı"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Senaryo sapması</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">
              gelir {formatPercent(active.revenueDelta)} · maliyet {formatPercent(active.costDelta)}
            </dd>
          </div>
          {showRemainingMonths ? (
            <div>
              <dt className="text-muted-foreground">Kalan ay sayısı</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {model.settings.remainingMonths} ay
              </dd>
            </div>
          ) : null}
        </dl>
      </Section>

      {yearRow ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label={`Net satış (${yearRow.year})`} value={formatAmount(yearRow.netSales)} note={yearRow.stage} />
          <KpiCard
            label="Brüt kâr"
            value={formatAmount(yearRow.grossProfit)}
            note={`Brüt marj ${formatPercent(yearRow.grossMarginRate)}`}
          />
          <KpiCard
            label="FAVÖK"
            value={formatAmount(yearRow.ebitda)}
            note={`FAVÖK marjı ${formatPercent(yearRow.ebitdaMarginRate)}`}
          />
          <KpiCard
            label="Net kâr"
            value={formatAmount(yearRow.netProfit)}
            note={`Net marj ${formatPercent(yearRow.netMarginRate)}`}
          />
          <KpiCard
            label="Dönem sonu nakit"
            value={formatAmount(yearRow.closingCash)}
            note={`Dönem başı ${formatAmount(yearRow.openingCash)}`}
          />
          <KpiCard
            label="Net borç / FAVÖK"
            value={yearRow.netDebtToEbitda === null ? "Ölçülmeli" : formatRatio(yearRow.netDebtToEbitda)}
            note={
              yearRow.netDebtToEbitda === null
                ? "FAVÖK pozitif değil ya da borç bakiyesi girilmedi."
                : `Net borç ${formatAmount(yearRow.netDebt)}`
            }
          />
          {model.unitEconomics.map((card) => (
            <KpiCard
              key={card.segment}
              label={`${card.segment} LTV / CAC`}
              value={card.ltvToCac === null ? "Ölçülmeli" : formatRatio(card.ltvToCac)}
              note={`${card.ltv === null ? "LTV ölçülmeli" : `LTV ${formatAmount(card.ltv)}`} · ${
                card.cac === null ? "CAC ölçülmeli" : `CAC ${formatAmount(card.cac)}`
              }`}
            />
          ))}
        </div>
      ) : null}

      <Section
        title="Gelirden net kâra köprü"
        description={`${yearRow?.year ?? ""} · ${scenario} senaryosu · ${
          view === "cash" ? "nakit akışı" : "gelir tahakkuku"
        } görünümü.`}
      >
        <DataTable
          caption="Gelirden net kâra köprü"
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
          rows={bridge}
          rowKey={(row) => row.label}
        />
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bridge.map((row) => ({ label: row.label, amount: row.amount }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} interval={0} angle={-20} height={60} textAnchor="end" />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: number) => formatAmount(value)} />
              <Bar dataKey="amount" name="Tutar" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="2027–2032 kârlılık seyri" description="Net satış, FAVÖK ve net kâr; marjlar ikinci eksende.">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} unit="%" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="netSales" name="Net satış" fill="hsl(var(--muted-foreground))" />
              <Bar yAxisId="left" dataKey="ebitda" name="FAVÖK" fill="hsl(var(--primary))" />
              <Line yAxisId="left" type="monotone" dataKey="netProfit" name="Net kâr" strokeWidth={2} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netMarginRate"
                name="Net marj (%)"
                strokeDasharray="4 2"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <DataTable
            caption="Yıl bazlı projeksiyon"
            columns={[
              { header: "Yıl", cell: (row) => row.year },
              { header: "Nitelik", cell: (row) => row.stage },
              { header: "Net satış", align: "right", cell: (row) => formatAmount(row.netSales) },
              { header: "Brüt kâr", align: "right", cell: (row) => formatAmount(row.grossProfit) },
              { header: "FAVÖK", align: "right", cell: (row) => formatAmount(row.ebitda) },
              { header: "Net kâr", align: "right", cell: (row) => formatAmount(row.netProfit) },
              { header: "Net marj", align: "right", cell: (row) => formatPercent(row.netMarginRate) },
              { header: "Dönem sonu nakit", align: "right", cell: (row) => formatAmount(row.closingCash) },
            ]}
            rows={active.years}
            rowKey={(row) => row.year}
          />
        </div>
      </Section>

      <Section title="Senaryo karşılaştırması" description="Aynı sürücüler, farklı gelir ve maliyet sapmaları.">
        <DataTable
          caption="Senaryo karşılaştırması"
          columns={[
            { header: "Senaryo", cell: (row) => row.name },
            { header: "Gelir sapması", align: "right", cell: (row) => formatPercent(row.revenueDelta) },
            { header: "Maliyet sapması", align: "right", cell: (row) => formatPercent(row.costDelta) },
            {
              header: "Net satış",
              align: "right",
              cell: (row) => formatAmount(row.years.reduce((sum, year) => sum + year.netSales, 0)),
            },
            {
              header: "FAVÖK",
              align: "right",
              cell: (row) => formatAmount(row.years.reduce((sum, year) => sum + year.ebitda, 0)),
            },
            {
              header: "Net kâr",
              align: "right",
              cell: (row) => formatAmount(row.years.reduce((sum, year) => sum + year.netProfit, 0)),
            },
            {
              header: "Dönem sonu nakit",
              align: "right",
              cell: (row) => formatAmount(row.years[row.years.length - 1]?.closingCash ?? 0),
            },
          ]}
          rows={view === "cash" ? model.scenariosCash : model.scenariosAccrual}
          rowKey={(row) => row.name}
        />
      </Section>

      <Section
        title="Nakit köprüsü"
        description="Dönem başı nakit + faaliyet nakdi − CAPEX ± finansman = dönem sonu nakit."
      >
        <DataTable
          caption="Nakit köprüsü"
          columns={[
            { header: "Yıl", cell: (row) => row.year },
            { header: "Dönem başı nakit", align: "right", cell: (row) => formatAmount(row.openingCash) },
            { header: "Faaliyet nakdi", align: "right", cell: (row) => formatAmount(row.operatingCash) },
            { header: "Yatırım (CAPEX)", align: "right", cell: (row) => formatAmount(row.investingCash) },
            { header: "Finansman", align: "right", cell: (row) => formatAmount(row.financingCash) },
            { header: "Tahakkuk − tahsilat farkı", align: "right", cell: (row) => formatAmount(row.collectionGap) },
            { header: "Dönem sonu nakit", align: "right", cell: (row) => formatAmount(row.closingCash) },
          ]}
          rows={active.years}
          rowKey={(row) => row.year}
        />
      </Section>

      <Section
        title="Birim ekonomi karşılaştırması"
        description="B2B ve B2C ayrı ölçülür; karma oran yalnızca referanstır."
      >
        <DataTable
          caption="Birim ekonomi karşılaştırması"
          columns={[
            { header: "Segment", cell: (row) => row.segment },
            { header: "LTV", align: "right", cell: (row) => (row.ltv === null ? "Ölçülmeli" : formatAmount(row.ltv)) },
            { header: "CAC", align: "right", cell: (row) => (row.cac === null ? "Ölçülmeli" : formatAmount(row.cac)) },
            {
              header: "LTV / CAC",
              align: "right",
              cell: (row) => (row.ltvToCac === null ? "Ölçülmeli" : formatRatio(row.ltvToCac)),
            },
            {
              header: "Geri ödeme (ay)",
              align: "right",
              cell: (row) => (row.paybackMonths === null ? "Ölçülmeli" : row.paybackMonths.toFixed(1)),
            },
            { header: "Not", cell: (row) => row.note },
          ]}
          rows={model.unitEconomics}
          rowKey={(row) => row.segment}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Referans karma LTV/CAC:{" "}
          {model.referenceBlendedLtvToCac === null
            ? "iki segmentten biri ölçülmediği için hesaplanmıyor"
            : formatRatio(model.referenceBlendedLtvToCac)}
        </p>
      </Section>

      {model.warnings.length > 0 ? (
        <Section title="Ölçülmesi gereken girdiler" description="Bu kalemler sonuçlara yüklenmedi.">
          <ul className="space-y-2 text-sm leading-relaxed text-foreground">
            {model.warnings.map((warning) => (
              <li key={warning} className="border-l-2 border-destructive/50 pl-3">
                {warning}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Insight question="Ne yapacağız?">
        {yearRow
          ? `${yearRow.year} ${scenario} senaryosunda net kâr ${formatAmount(yearRow.netProfit)} (net marj ${formatPercent(
              yearRow.netMarginRate,
            )}). Ölçülmeyen girdiler sonuca yüklenmediği için bu rakam, girilen belgeli verinin alt sınırıdır.`
          : "Projeksiyon için dönem verisi girin."}
      </Insight>
    </AppShell>
  );
}
