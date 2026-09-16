import { cacBucketNames, type ReportInput } from "@/lib/report-schema";

/**
 * Edinim (CAC) ekonomisi hesaplama motoru.
 *
 * Üç hesap ayrı tutulur ve karıştırılmaz:
 *  1) Gerçek freemium CAC = B2C edinimine atfedilebilir harcama ÷ yeni uygun
 *     ücretsiz ebeveyn (cohort bazında).
 *  2) Ücretli B2C CAC = freemium CAC ÷ ücretsizden ücretliye dönüşüm; Basic /
 *     Premium birim ekonomisiyle sürdürülebilirlik testi.
 *  3) B2B profesyonel lisansın edinim dâhil tam maliyet kartı.
 *
 * Mükerrerlik: her kalem defterde tek satırda, tek kovada ve bir atıf oranıyla
 * durur. Atfedilen pay + dağıtılmayan pay = kalem tutarı olduğu için aynı gider
 * iki yerde birlikte sayılamaz. CAC dışı kovalar (COGS, ürün operasyon, Ar-Ge,
 * genel yönetim, uzman hizmeti) kanal CAC havuzuna girmez.
 */

export type AcquisitionInput = ReportInput["acquisition"];

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
const clampRate = (value: number) => Math.min(Math.max(value, 0), 100);

export type SpendLedgerLine = {
  name: string;
  bucket: string;
  period: string;
  amount: number;
  attributionRate: number;
  attributedAmount: number;
  unallocatedAmount: number;
  countsInCac: boolean;
  note: string;
};

export type CohortChannelResult = {
  channel: string;
  spend: number;
  eligibleFreeParents: number;
  freemiumCac: number;
  paidParents: number;
  paidCac: number;
  spendShare: number;
};

export type CohortResult = {
  cohort: string;
  channels: CohortChannelResult[];
  totalSpend: number;
  totalEligible: number;
  totalPaid: number;
  blendedFreemiumCac: number;
  blendedPaidCac: number;
  conversionRate: number;
};

export type ConversionScenario = {
  conversionRate: number;
  paidCac: number;
  isMeasured: boolean;
};

export type PackageEconomics = {
  name: string;
  monthlyPrice: number;
  commission: number;
  netRevenue: number;
  techCost: number;
  supportCost: number;
  contribution: number;
  contributionRate: number;
  churnRate: number;
  expectedLifetimeMonths: number;
  ltv: number;
  mixShare: number;
};

export type B2bFixedOpsLine = {
  name: string;
  annualAmount: number;
  productShareRate: number;
  productAmount: number;
  perLicense: number;
};

export type B2bCacChannelResult = {
  channel: string;
  newLicenses: number;
  spend: number;
  cac: number;
  items: { name: string; amount: number }[];
};

export type AcquisitionModel = ReturnType<typeof computeAcquisition>;

export function computeAcquisition(input: AcquisitionInput) {
  /* ---------- 1. Harcama defteri ve atıf ---------- */
  const ledger: SpendLedgerLine[] = input.spendLedger.map((item) => {
    const rate = clampRate(item.attributionRate);
    const attributedAmount = (item.amount * rate) / 100;
    return {
      name: item.name,
      bucket: item.bucket,
      period: item.period,
      amount: item.amount,
      attributionRate: rate,
      attributedAmount,
      unallocatedAmount: item.amount - attributedAmount,
      countsInCac: cacBucketNames.includes(item.bucket),
      note: item.note,
    };
  });

  const bucketTotals = [...new Set(ledger.map((line) => line.bucket))].map((bucket) => {
    const lines = ledger.filter((line) => line.bucket === bucket);
    return {
      bucket,
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      attributedAmount: lines.reduce((sum, line) => sum + line.attributedAmount, 0),
      unallocatedAmount: lines.reduce((sum, line) => sum + line.unallocatedAmount, 0),
      countsInCac: cacBucketNames.includes(bucket),
    };
  });

  const poolFor = (bucket: string) =>
    ledger
      .filter((line) => line.bucket === bucket)
      .reduce((sum, line) => sum + line.attributedAmount, 0);

  const b2cCacPool = poolFor("B2C CAC");
  const b2bCacPool = poolFor("B2B CAC");
  const referralCacPool = poolFor("Yönlendirme CAC");
  const excludedPool = bucketTotals
    .filter((row) => !row.countsInCac)
    .reduce((sum, row) => sum + row.amount, 0);
  const unallocatedTotal = ledger.reduce((sum, line) => sum + line.unallocatedAmount, 0);

  /* ---------- 2. Cohort bazlı freemium CAC ---------- */
  const cohorts: CohortResult[] = input.b2cCohorts.map((cohort) => {
    const totalSpend = cohort.channels.reduce((sum, row) => sum + row.spend, 0);
    const totalEligible = cohort.channels.reduce((sum, row) => sum + row.eligibleFreeParents, 0);
    const totalPaid = cohort.channels.reduce((sum, row) => sum + row.paidParents, 0);
    return {
      cohort: cohort.cohort,
      channels: cohort.channels.map((row) => ({
        channel: row.channel,
        spend: row.spend,
        eligibleFreeParents: row.eligibleFreeParents,
        freemiumCac: safeDiv(row.spend, row.eligibleFreeParents),
        paidParents: row.paidParents,
        paidCac: safeDiv(row.spend, row.paidParents),
        spendShare: safeDiv(row.spend, totalSpend) * 100,
      })),
      totalSpend,
      totalEligible,
      totalPaid,
      blendedFreemiumCac: safeDiv(totalSpend, totalEligible),
      blendedPaidCac: safeDiv(totalSpend, totalPaid),
      conversionRate: safeDiv(totalPaid, totalEligible) * 100,
    };
  });

  const cohortSpend = cohorts.reduce((sum, row) => sum + row.totalSpend, 0);
  const cohortEligible = cohorts.reduce((sum, row) => sum + row.totalEligible, 0);
  const cohortPaid = cohorts.reduce((sum, row) => sum + row.totalPaid, 0);
  const blendedFreemiumCac = safeDiv(cohortSpend, cohortEligible);
  const measuredConversionRate =
    input.b2cUnit.freeToPaidRate > 0
      ? input.b2cUnit.freeToPaidRate
      : safeDiv(cohortPaid, cohortEligible) * 100;

  /* ---------- 3. Ücretli CAC duyarlılığı ---------- */
  const scenarioRates = [...new Set(input.b2cUnit.conversionScenarios.filter((rate) => rate > 0))]
    .sort((a, b) => a - b);
  const conversionScenarios: ConversionScenario[] = scenarioRates.map((rate) => ({
    conversionRate: rate,
    paidCac: safeDiv(blendedFreemiumCac, rate / 100),
    isMeasured: Math.abs(rate - measuredConversionRate) < 0.001,
  }));
  const measuredPaidCac = safeDiv(blendedFreemiumCac, measuredConversionRate / 100);

  /* ---------- 4. Basic / Premium birim ekonomisi ---------- */
  const unit = input.b2cUnit;
  const basicMix = clampRate(unit.basicMixRate);
  const buildPackage = (
    name: string,
    monthlyPrice: number,
    churnRate: number,
    mixShare: number,
  ): PackageEconomics => {
    const commission = (monthlyPrice * clampRate(unit.paymentCommissionRate)) / 100;
    const netRevenue = monthlyPrice - commission;
    const contribution = netRevenue - unit.techCostPerUser - unit.supportCostPerUser;
    const expectedLifetimeMonths = churnRate > 0 ? 100 / churnRate : 0;
    return {
      name,
      monthlyPrice,
      commission,
      netRevenue,
      techCost: unit.techCostPerUser,
      supportCost: unit.supportCostPerUser,
      contribution,
      contributionRate: safeDiv(contribution, monthlyPrice) * 100,
      churnRate,
      expectedLifetimeMonths,
      ltv: contribution * expectedLifetimeMonths,
      mixShare,
    };
  };

  const packages: PackageEconomics[] = [
    buildPackage("Basic", unit.basicPrice, unit.basicChurnRate, basicMix),
    buildPackage("Premium", unit.premiumPrice, unit.premiumChurnRate, 100 - basicMix),
  ];
  const blendedContribution = packages.reduce(
    (sum, row) => sum + (row.mixShare / 100) * row.contribution,
    0,
  );
  const blendedLtv = packages.reduce((sum, row) => sum + (row.mixShare / 100) * row.ltv, 0);
  const b2cLtvToCac = safeDiv(blendedLtv, measuredPaidCac);
  const b2cPaybackMonths = safeDiv(measuredPaidCac, blendedContribution);

  /* ---------- 5. B2B lisans tam maliyet kartı ---------- */
  const b2b = input.b2bLicense;
  const activeLicenseEquivalent = safeDiv(
    b2b.monthlyActiveLicenses.reduce((sum, value) => sum + value, 0),
    12,
  );
  const perReport = b2b.perReport.map((row) => ({
    name: row.name,
    unitCost: row.unitCost,
    licenseYearCost: row.unitCost * b2b.reportsPerLicense,
  }));
  const perReportUnitTotal = perReport.reduce((sum, row) => sum + row.unitCost, 0);
  const techCogs = perReportUnitTotal * b2b.reportsPerLicense;
  const paymentCommission =
    (b2b.licensePrice * clampRate(b2b.onlineCollectionShare) * clampRate(b2b.paymentCommissionRate)) /
    10000;
  const supportPerLicense = safeDiv(b2b.annualSupportCost, activeLicenseEquivalent);
  const directAccountCost = techCogs + paymentCommission + supportPerLicense;

  const fixedOps: B2bFixedOpsLine[] = b2b.fixedOps.map((row) => {
    const productAmount = (row.annualAmount * clampRate(row.productShareRate)) / 100;
    return {
      name: row.name,
      annualAmount: row.annualAmount,
      productShareRate: clampRate(row.productShareRate),
      productAmount,
      perLicense: safeDiv(productAmount, activeLicenseEquivalent),
    };
  });
  const fixedOpsAnnualTotal = fixedOps.reduce((sum, row) => sum + row.productAmount, 0);
  const fixedOpsPerLicense = safeDiv(fixedOpsAnnualTotal, activeLicenseEquivalent);
  const fullCostBeforeCac = directAccountCost + fixedOpsPerLicense;

  const cacChannels: B2bCacChannelResult[] = b2b.cacChannels.map((channel) => {
    const items = b2b.cacItems
      .filter((item) => item.channel.trim() === channel.channel.trim())
      .map((item) => ({ name: item.name, amount: item.amount }));
    const spend = items.reduce((sum, item) => sum + item.amount, 0);
    return {
      channel: channel.channel,
      newLicenses: channel.newLicenses,
      spend,
      cac: safeDiv(spend, channel.newLicenses),
      items,
    };
  });
  const unassignedCacItems = b2b.cacItems.filter(
    (item) =>
      !b2b.cacChannels.some((channel) => channel.channel.trim() === item.channel.trim()),
  );
  const b2bCacSpend = cacChannels.reduce((sum, row) => sum + row.spend, 0);
  const b2bNewLicenses = cacChannels.reduce((sum, row) => sum + row.newLicenses, 0);
  const weightedB2bCac = safeDiv(b2bCacSpend, b2bNewLicenses);

  const contributionSummary = [
    { label: "Teknik brüt katkı", value: b2b.licensePrice - techCogs },
    { label: "Doğrudan hesap katkısı", value: b2b.licensePrice - directAccountCost },
    { label: "CAC öncesi operasyon katkısı", value: b2b.licensePrice - fullCostBeforeCac },
    ...cacChannels.map((row) => ({
      label: `${row.channel} ile ilk yıl katkı`,
      value: b2b.licensePrice - fullCostBeforeCac - row.cac,
    })),
    {
      label: "Ağırlıklı CAC ile ilk yıl katkı",
      value: b2b.licensePrice - fullCostBeforeCac - weightedB2bCac,
    },
    { label: "Yenileme yılı katkısı (CAC yüklenmez)", value: b2b.licensePrice - fullCostBeforeCac },
  ];

  /* ---------- 6. Uyarılar ---------- */
  const normalized = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
  const seen = new Map<string, number>();
  for (const line of ledger) {
    if (!line.name.trim()) continue;
    const key = normalized(line.name);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const warnings = [
    ...[...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => `"${key}" kalemi defterde birden fazla satırda: tek satırda birleştirin.`),
    ...input.spendLedger
      .filter((item) => item.attributionRate > 100 || item.attributionRate < 0)
      .map((item) => `"${item.name}" atıf oranı %0–100 aralığında olmalı.`),
    b2cCacPool > 0 && cohortSpend > 0 && Math.abs(b2cCacPool - cohortSpend) > 1
      ? `Defterden B2C edinimine atfedilen harcama ${Math.round(b2cCacPool)} TL, cohort tablolarındaki harcama ${Math.round(cohortSpend)} TL: fark kanal tablolarına dağıtılmamış.`
      : null,
    unassignedCacItems.length > 0
      ? `${unassignedCacItems.length} B2B CAC alt kalemi hiçbir kanala bağlı değil: kanal adını kanal tablosuyla aynı yazın.`
      : null,
    b2b.monthlyActiveLicenses.length > 0 && b2b.monthlyActiveLicenses.length !== 12
      ? "Aktif lisans eşdeğeri Ocak–Aralık toplamının 12'ye bölümüdür; 12 aylık adet girin."
      : null,
  ].filter((item): item is string => item !== null);

  const hasAcquisitionData =
    ledger.length > 0 ||
    cohorts.length > 0 ||
    b2b.licensePrice > 0 ||
    unit.basicPrice > 0 ||
    unit.premiumPrice > 0;

  return {
    hasAcquisitionData,
    ledger,
    bucketTotals,
    b2cCacPool,
    b2bCacPool,
    referralCacPool,
    excludedPool,
    unallocatedTotal,
    cohorts,
    cohortSpend,
    cohortEligible,
    cohortPaid,
    blendedFreemiumCac,
    measuredConversionRate,
    measuredPaidCac,
    conversionScenarios,
    packages,
    blendedContribution,
    blendedLtv,
    b2cLtvToCac,
    b2cPaybackMonths,
    b2b: {
      licensePrice: b2b.licensePrice,
      reportsPerLicense: b2b.reportsPerLicense,
      activeLicenseEquivalent,
      perReport,
      perReportUnitTotal,
      techCogs,
      paymentCommission,
      supportPerLicense,
      directAccountCost,
      fixedOps,
      fixedOpsAnnualTotal,
      fixedOpsPerLicense,
      fullCostBeforeCac,
      cacChannels,
      b2bCacSpend,
      b2bNewLicenses,
      weightedB2bCac,
      contributionSummary,
    },
    warnings,
  };
}
