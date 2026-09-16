import { Link } from "@tanstack/react-router";

import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { KpiCard } from "@/components/report/KpiCard";
import { Section } from "@/components/report/Section";
import { useAcquisition, useFeasibility } from "@/hooks/useReport";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

const tl = (value: number, digits = 0) => `${formatAmount(value, digits)} TL`;

/**
 * Fizibilite / BEP ve edinim (CAC) modellerinden doğan metrikleri özet ekranına taşır.
 * Böylece veri girişindeki her değişiklik yönetici özetinde de görünür.
 */
export function ModelSummary() {
  const feasibility = useFeasibility();
  const acquisition = useAcquisition();

  const hasFeasibility = feasibility.hasFeasibilityData && Boolean(feasibility.current);
  const hasFirstYear = feasibility.firstYearCosts.hasData;
  const hasAcquisition = acquisition.hasAcquisitionData;

  if (!hasFeasibility && !hasFirstYear && !hasAcquisition) return null;

  const period = feasibility.current;
  const plan = acquisition.b2cPlan;
  const firstYear = feasibility.firstYearCosts;
  const b2b = acquisition.b2b;

  const cashCollectionTotal = feasibility.cashCollections.reduce(
    (sum, row) => sum + row.pilot + row.annual,
    0,
  );

  const kpis: { label: string; value: string; note?: string; delta?: { text: string; tone: "positive" | "negative" | "neutral" } }[] = [];

  if (period) {
    kpis.push(
      {
        label: "Başa baş (lisans)",
        value: formatAmount(period.bepAccounts, 1),
        note: `${period.period} · ${tl(period.bepRevenue)} ciro`,
        delta: {
          text:
            period.totalAccounts >= period.bepAccounts
              ? `Güvenlik payı ${formatPercent(period.marginOfSafety, 1)}`
              : `${formatAmount(period.bepAccounts - period.totalAccounts, 1)} lisans eksik`,
          tone: period.totalAccounts >= period.bepAccounts ? "positive" : "negative",
        },
      },
      {
        label: "Katkı payı (birim)",
        value: tl(period.contribution),
        note: `Fiyat ${tl(period.blendedPrice)} − değişken ${tl(period.variable.total)}`,
        delta: {
          text: `Katkı oranı ${formatPercent(period.contributionRate, 1)}`,
          tone: period.contribution > 0 ? "positive" : "negative",
        },
      },
      {
        label: "Dönem kâr / zarar",
        value: tl(period.profit),
        note: `Gelir ${tl(period.totalRevenue)} · sabit ${tl(period.fixedCost)}`,
        delta: {
          text: period.profit >= 0 ? "Kâr" : "Zarar",
          tone: period.profit >= 0 ? "positive" : "negative",
        },
      },
    );
  }

  if (hasFirstYear) {
    kpis.push({
      label: "İlk yıl Ar-Ge / şirket",
      value: `${formatAmount(firstYear.rdTotal)} / ${formatAmount(firstYear.companyTotal)}`,
      note: `Toplam ${tl(firstYear.grandTotal)} · her kalem tek satırda`,
    });
  }

  if (hasAcquisition && plan.eligibleTotal > 0) {
    kpis.push(
      {
        label: "Planlanan freemium CAC",
        value: tl(plan.freemiumCac, 2),
        note: `${plan.period || "Dönem"} · havuz ${tl(plan.pool)}`,
        delta: {
          text:
            plan.buffer >= 0
              ? `Tampon ${tl(plan.buffer)}`
              : `Üst sınır ${tl(-plan.buffer)} aşıldı`,
          tone: plan.buffer >= 0 ? "positive" : "negative",
        },
      },
      {
        label: "Ücretli B2C CAC",
        value: tl(plan.paidCac, 2),
        note: `${formatAmount(plan.paidParents, 1)} ücretli ebeveyn · brüt ${tl(plan.grossRevenue)}`,
        delta: {
          text: `Dönüşüm ${formatPercent(plan.conversionRate, 1)}`,
          tone: "neutral",
        },
      },
    );
  }

  if (hasAcquisition && acquisition.blendedLtv > 0) {
    kpis.push({
      label: "Karma LTV / CAC",
      value: formatRatio(acquisition.b2cLtvToCac, 1),
      note: `LTV ${tl(acquisition.blendedLtv)} · geri ödeme ${formatAmount(acquisition.b2cPaybackMonths, 1)} ay`,
      delta: {
        text: "Hedef 3,0x",
        tone: acquisition.b2cLtvToCac >= 3 ? "positive" : "negative",
      },
    });
  }

  const bridge = [
    period
      ? {
          label: "Satış → kârlılık",
          value: `${formatAmount(period.totalAccounts, 1)} lisans · ${tl(period.totalRevenue)}`,
          detail: `Katkı payı ${tl(period.contribution)}, dönem sonucu ${tl(period.profit)}`,
        }
      : null,
    period
      ? {
          label: "Kârlılık → başa baş",
          value: `${formatAmount(period.bepAccounts, 1)} lisans / ${tl(period.bepRevenue)}`,
          detail: `Sabit maliyet ${tl(period.fixedCost)} ÷ katkı payı`,
        }
      : null,
    hasFirstYear
      ? {
          label: "İlk yıl maliyeti → sabit maliyet",
          value: tl(firstYear.firstYearCharge),
          detail: `Ar-Ge payı ${tl(firstYear.rdCharge)}, şirket payı ${tl(firstYear.companyCharge)}`,
        }
      : null,
    cashCollectionTotal > 0
      ? {
          label: "Gelir → nakit tahsilat",
          value: tl(cashCollectionTotal),
          detail: "Pilot ve yıllık abonelik tahsilatı toplamı",
        }
      : null,
    hasAcquisition && plan.eligibleTotal > 0
      ? {
          label: "Edinim → birim ekonomi",
          value: `${formatAmount(plan.eligibleTotal)} uygun ebeveyn · ${tl(plan.freemiumCac, 2)}`,
          detail: `Ücretli CAC ${tl(plan.paidCac, 2)}, mağaza komisyonu ${tl(plan.storeCommission)}`,
        }
      : null,
    hasAcquisition && b2b.licensePrice > 0
      ? {
          label: "B2B lisans → tam maliyet",
          value: tl(b2b.fullCostBeforeCac, 2),
          detail: `Lisans ${tl(b2b.licensePrice)} · teknik ${tl(b2b.techCogs, 2)} · CAC ${tl(b2b.weightedB2bCac, 2)}`,
        }
      : null,
  ].filter((row): row is { label: string; value: string; detail: string } => row !== null);

  const warnings = [...feasibility.firstYearCosts.warnings, ...acquisition.warnings];

  return (
    <Section
      title="Girişim modeli — fizibilite, ilk yıl maliyeti ve edinim"
      description="Veri girişindeki her değişiklik burada da güncellenir: satış adedi, fiyat, maliyet defteri ve edinim havuzu arasındaki bağlantı."
    >
      {kpis.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>
      ) : null}

      {bridge.length > 0 ? (
        <div className="mt-4">
          <DataTable
            caption="Modeller arası bağlantı"
            rowKey={(row) => row.label}
            rows={bridge}
            columns={[
              { header: "Bağlantı", cell: (row) => row.label },
              { header: "Değer", align: "right", cell: (row) => row.value },
              { header: "Nasıl oluşuyor", cell: (row) => row.detail },
            ]}
          />
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-l-2 border-destructive bg-muted/50 px-4 py-3 text-sm leading-relaxed">
          {warnings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      <Insight question="Bu rakamlar nereden geliyor?">
        Tüm değerler Veri Girişi sayfasındaki kalemlerden hesaplanır. Ayrıntı için{" "}
        <Link to="/fizibilite" className="underline">
          Fizibilite / BEP
        </Link>{" "}
        ve{" "}
        <Link to="/edinim" className="underline">
          Edinim ve Birim Maliyet
        </Link>{" "}
        sayfalarına bakın.
      </Insight>
    </Section>
  );
}

/** Aylık rapor verisi olmasa bile fizibilite/edinim modelinden metrik var mı? */
export function useHasModelData() {
  const feasibility = useFeasibility();
  const acquisition = useAcquisition();
  return (
    feasibility.hasFeasibilityData ||
    feasibility.firstYearCosts.hasData ||
    acquisition.hasAcquisitionData
  );
}
