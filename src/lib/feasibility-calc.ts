import type { FeasibilityInput } from "@/lib/report-schema";

/**
 * Fizibilite / başa baş (BEP) hesaplama motoru.
 *
 * Tablo 4.4-1 Gelirler, Tablo 4.4-2 Değişken maliyetler (birim başına),
 * Tablo 4.4-3 Sabit maliyetler ve bunların BEP formülüne bağlanışı burada
 * türetilir. Kullanıcı yalnızca ham varsayımları girer.
 *
 * Katkı payı        = Birim satış fiyatı − Birim ürün (değişken) maliyeti
 * BEP (adet)        = Toplam sabit maliyet ÷ Katkı payı
 * BEP (TL)          = BEP adet × Birim satış fiyatı
 * Dönem kâr/zararı  = Toplam gelir − [Sabit maliyet + (adet × birim değişken maliyet)]
 */

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

export type TierResult = {
  name: string;
  accounts: number;
  unitPrice: number;
  revenue: number;
  mixShare: number;
  unitVariableCost: number;
  contribution: number;
  contributionRate: number;
  bepAccounts: number;
};

export type VariableCostBreakdown = {
  personnel: number;
  material: number;
  energy: number;
  distribution: number;
  other: number;
  total: number;
};

export type FeasibilityPeriod = {
  period: string;
  stage: string;
  tiers: TierResult[];
  totalAccounts: number;
  /** Dönem başı (devreden) aktif lisans ve dönem içi net yeni lisans ihtiyacı. */
  openingAccounts: number;
  netNewAccounts: number;
  /** Yıl sonu ARR = dönem sonu aktif lisans × yıllık fiyat. Gelir tablosu kalemi DEĞİLDİR. */
  arr: number;
  /** Dönem geliri hangi temele göre yazıldı. */
  revenueBasis: "override" | "recognitionRate" | "arr";
  revenueRecognitionRate: number;
  subscriptionRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  blendedPrice: number;
  variable: VariableCostBreakdown;
  variableCostTotal: number;
  fixedCost: number;
  fixedCostIsOverride: boolean;
  fixedCostSource: "override" | "firstYear" | "table443";
  bepAccountsAtPriceDrop: number;
  contribution: number;
  contributionRate: number;
  weightedContribution: number;
  bepAccounts: number;
  bepRevenue: number;
  marginOfSafety: number;
  profit: number;
};

export type FunnelStep = {
  period: string;
  opening: number;
  newAccounts: number;
  churnedAccounts: number;
  closing: number;
  enteredAccounts: number;
  gap: number;
};

export type FirstYearCostLine = {
  name: string;
  amount: number;
  rdShareRate: number;
  rdAmount: number;
  companyAmount: number;
  capitalized: boolean;
  amortizationYears: number;
  firstYearCharge: number;
  rdCharge: number;
  companyCharge: number;
  note: string;
};

export type FirstYearCostModel = {
  label: string;
  hasData: boolean;
  useForFirstPeriod: boolean;
  lines: FirstYearCostLine[];
  /** Nakit/taahhüt bazlı ilk yıl tutarları (aktifleştirme öncesi). */
  rdTotal: number;
  companyTotal: number;
  grandTotal: number;
  /** İlk yıl gelir tablosuna yüklenen tutarlar (amortisman sonrası). */
  rdCharge: number;
  companyCharge: number;
  firstYearCharge: number;
  capitalizedTotal: number;
  /** Mükerrer kayıt uyarıları. */
  duplicateWarnings: string[];
};

/**
 * İlk yıl için Ar-Ge maliyeti ile şirket (işletme) maliyetini ayrı hesaplar.
 *
 * Mükerrerlik kuralı: her kalem defterde YALNIZCA bir satırda bulunur ve
 * Ar-Ge payı (%) ile ikiye bölünür. Ar-Ge payı + şirket payı = kalem tutarı
 * olduğu için aynı gider iki bütçede birlikte sayılamaz.
 */
export function computeFirstYearCosts(input: FeasibilityInput): FirstYearCostModel {
  const firstYear = input.firstYear;
  const lines: FirstYearCostLine[] = firstYear.items.map((item) => {
    const share = Math.min(Math.max(item.rdShareRate, 0), 100) / 100;
    const rdAmount = item.amount * share;
    const companyAmount = item.amount - rdAmount;
    const capitalized = item.amortizationYears > 0;
    const firstYearCharge = capitalized ? item.amount / item.amortizationYears : item.amount;
    return {
      name: item.name,
      amount: item.amount,
      rdShareRate: item.rdShareRate,
      rdAmount,
      companyAmount,
      capitalized,
      amortizationYears: item.amortizationYears,
      firstYearCharge,
      rdCharge: firstYearCharge * share,
      companyCharge: firstYearCharge * (1 - share),
      note: item.note,
    };
  });

  const sum = (pick: (line: FirstYearCostLine) => number) =>
    lines.reduce((total, line) => total + pick(line), 0);

  const normalized = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
  const seen = new Map<string, number>();
  for (const line of lines) {
    if (!line.name.trim()) continue;
    const key = normalized(line.name);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateWarnings = [
    ...[...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => `"${key}" kalemi defterde birden fazla satırda: tek satırda birleştirin.`),
    ...input.fixed.otherItems
      .filter((item) => item.name.trim() && seen.has(normalized(item.name)))
      .map(
        (item) =>
          `"${item.name}" hem ilk yıl defterinde hem Tablo 4.4-3 diğer sabit kalemlerinde var: birinden kaldırın.`,
      ),
  ];

  return {
    label: firstYear.label,
    hasData: lines.length > 0,
    useForFirstPeriod: firstYear.useForFirstPeriod,
    lines,
    rdTotal: sum((line) => line.rdAmount),
    companyTotal: sum((line) => line.companyAmount),
    grandTotal: sum((line) => line.amount),
    rdCharge: sum((line) => line.rdCharge),
    companyCharge: sum((line) => line.companyCharge),
    firstYearCharge: sum((line) => line.firstYearCharge),
    capitalizedTotal: sum((line) => (line.capitalized ? line.amount : 0)),
    duplicateWarnings,
  };
}

export type FeasibilityModel = ReturnType<typeof computeFeasibility>;

export function computeFeasibility(input: FeasibilityInput) {
  const tiers = input.tiers;
  const fixed = input.fixed;
  const variable = input.variable;
  const firstYearCosts = computeFirstYearCosts(input);

  /** Tablo 4.4-3: yıllık toplam sabit maliyet. */
  const fixedBreakdown = {
    equipmentDepreciation: safeDiv(fixed.equipmentInvestment, fixed.equipmentUsefulLifeYears),
    buildingDepreciation: safeDiv(fixed.buildingInvestment, fixed.buildingUsefulLifeYears),
    rent: fixed.annualRent,
    other: fixed.otherItems.reduce((sum, item) => sum + item.amount, 0),
  };
  const fixedTotal =
    fixedBreakdown.equipmentDepreciation +
    fixedBreakdown.buildingDepreciation +
    fixedBreakdown.rent +
    fixedBreakdown.other;

  /** Tablo 4.4-1: abonelik dışı gelir kalemleri (hacim × birim fiyat). */
  const otherRevenueItems = input.otherRevenue.map((item) => ({
    ...item,
    total: item.volume * item.unitPrice,
  }));
  const otherRevenueCatalogTotal = otherRevenueItems.reduce((sum, item) => sum + item.total, 0);

  const periods: FeasibilityPeriod[] = input.periods.map((row, periodIndex) => {
    const counts = tiers.map((_, index) => row.counts[index] ?? 0);
    const totalAccounts = counts.reduce((sum, value) => sum + value, 0);
    /** Dönem sonu aktif lisans × yıllık fiyat = yıl sonu ARR. */
    const arr = tiers.reduce((sum, tier, index) => sum + (counts[index] ?? 0) * tier.unitPrice, 0);
    const previousRow = periodIndex > 0 ? input.periods[periodIndex - 1] : undefined;
    const openingAccounts = previousRow
      ? tiers.reduce((sum, _tier, index) => sum + (previousRow.counts[index] ?? 0), 0)
      : 0;
    const netNewAccounts = totalAccounts - openingAccounts;
    const blendedPrice = safeDiv(arr, totalAccounts);
    /**
     * Dönem geliri ARR değildir: lisanslar yıl boyunca kazanıldığı için gelir
     * ya belgeli tutardan ya da yıl içi ortalama aktiflik oranından türetilir.
     */
    const recognitionRate = row.revenueRecognitionRate ?? 0;
    const revenueBasis: FeasibilityPeriod["revenueBasis"] =
      (row.recognizedRevenueOverride ?? 0) > 0
        ? "override"
        : recognitionRate > 0
          ? "recognitionRate"
          : "arr";
    const subscriptionRevenue =
      revenueBasis === "override"
        ? row.recognizedRevenueOverride
        : revenueBasis === "recognitionRate"
          ? arr * (recognitionRate / 100)
          : arr;
    const otherRevenue = row.otherRevenue !== 0 ? row.otherRevenue : otherRevenueCatalogTotal;
    const totalRevenue = subscriptionRevenue + otherRevenue;

    /** Tablo 4.4-2: hesap başına yıllık değişken maliyet. */
    const servedAccounts =
      totalAccounts > 0
        ? totalAccounts
        : variable.supportHeadcount * variable.accountsPerStaff;
    const personnel = safeDiv(
      variable.supportHeadcount * variable.annualCostPerSupportStaff,
      servedAccounts,
    );
    const material =
      variable.cloudCostPerAccount > 0
        ? variable.cloudCostPerAccount
        : safeDiv(variable.annualCloudApiCost, servedAccounts);
    const energy = safeDiv(variable.annualEnergyCost, servedAccounts);
    const billingPerAccount = safeDiv(variable.annualBillingSoftwareCost, servedAccounts);
    const commissionRate = variable.paymentCommissionRate / 100;
    const other = variable.otherVariablePerAccount;
    const commonCost = personnel + material + energy + other + billingPerAccount;

    const tierResults: TierResult[] = tiers.map((tier, index) => {
      const accounts = counts[index] ?? 0;
      const unitVariableCost = commonCost + commissionRate * tier.unitPrice;
      const contribution = tier.unitPrice - unitVariableCost;
      return {
        name: tier.name,
        accounts,
        unitPrice: tier.unitPrice,
        revenue: accounts * tier.unitPrice,
        mixShare: safeDiv(accounts, totalAccounts) * 100,
        unitVariableCost,
        contribution,
        contributionRate: safeDiv(contribution, tier.unitPrice) * 100,
        bepAccounts: 0,
      };
    });

    const distribution = commissionRate * blendedPrice + billingPerAccount;
    const variableBreakdown: VariableCostBreakdown = {
      personnel,
      material,
      energy,
      distribution,
      other,
      total: personnel + material + energy + distribution + other,
    };

    const variableCostTotal = tierResults.reduce(
      (sum, tier) => sum + tier.accounts * tier.unitVariableCost,
      0,
    );

    const fixedCostIsOverride = row.fixedCostOverride !== 0;
    /**
     * İlk dönem sabit maliyeti: ilk yıl defteri doldurulmuşsa oradan gelir
     * (Ar-Ge + şirket, amortisman sonrası). Böylece Tablo 4.4-3 ile ilk yıl
     * defteri aynı gideri iki kez yüklemez.
     */
    const useFirstYearLedger =
      periodIndex === 0 &&
      !fixedCostIsOverride &&
      firstYearCosts.hasData &&
      firstYearCosts.useForFirstPeriod;
    const fixedCost = fixedCostIsOverride
      ? row.fixedCostOverride
      : useFirstYearLedger
        ? firstYearCosts.firstYearCharge
        : fixedTotal;
    const fixedCostSource: FeasibilityPeriod["fixedCostSource"] = fixedCostIsOverride
      ? "override"
      : useFirstYearLedger
        ? "firstYear"
        : "table443";

    const contribution = blendedPrice - variableBreakdown.total;
    /** Katman karışımı sabit tutularak ağırlıklı katkı payı. */
    const weightedContribution = tierResults.reduce(
      (sum, tier) => sum + (tier.mixShare / 100) * tier.contribution,
      0,
    );
    const usedContribution =
      input.method === "weighted" && weightedContribution !== 0 ? weightedContribution : contribution;

    const bepAccounts = usedContribution > 0 ? fixedCost / usedContribution : 0;
    const tiersWithBep = tierResults.map((tier) => ({
      ...tier,
      bepAccounts: (tier.mixShare / 100) * bepAccounts,
    }));
    const bepRevenue =
      input.method === "weighted"
        ? tiersWithBep.reduce((sum, tier) => sum + tier.bepAccounts * tier.unitPrice, 0)
        : bepAccounts * blendedPrice;

    /** Duyarlılık: fiyat %20 düşerse başa baş adedi. Komisyon fiyata bağlı olduğu için yeniden hesaplanır. */
    const droppedPrice = blendedPrice * 0.8;
    const droppedVariable =
      variableBreakdown.total - commissionRate * blendedPrice + commissionRate * droppedPrice;
    const droppedContribution = droppedPrice - droppedVariable;
    const bepAccountsAtPriceDrop = droppedContribution > 0 ? fixedCost / droppedContribution : 0;

    return {
      period: row.period,
      stage: row.stage ?? "",
      fixedCostSource,
      bepAccountsAtPriceDrop,
      tiers: tiersWithBep,
      totalAccounts,
      subscriptionRevenue,
      otherRevenue,
      totalRevenue,
      blendedPrice,
      variable: variableBreakdown,
      variableCostTotal,
      fixedCost,
      fixedCostIsOverride,
      contribution,
      contributionRate: safeDiv(contribution, blendedPrice) * 100,
      weightedContribution,
      bepAccounts,
      bepRevenue,
      marginOfSafety: safeDiv(totalAccounts - bepAccounts, totalAccounts) * 100,
      profit: totalRevenue - (fixedCost + variableCostTotal),
    };
  });

  /** Huni varsayımlarından aşağıdan yukarı aktif hesap köprüsü. */
  const funnel = input.funnel;
  const months = funnel.monthsPerPeriod > 0 ? funnel.monthsPerPeriod : 1;
  const monthlyNew =
    funnel.monthlyLeads * (funnel.demoRate / 100) * (funnel.payingRate / 100);
  let opening = funnel.startingAccounts;
  const funnelBridge: FunnelStep[] = periods.map((period) => {
    let active = opening;
    let newTotal = 0;
    let churnTotal = 0;
    for (let m = 0; m < months; m += 1) {
      const churned = active * (funnel.monthlyChurnRate / 100);
      active = active + monthlyNew - churned;
      newTotal += monthlyNew;
      churnTotal += churned;
    }
    const step: FunnelStep = {
      period: period.period,
      opening,
      newAccounts: newTotal,
      churnedAccounts: churnTotal,
      closing: active,
      enteredAccounts: period.totalAccounts,
      gap: period.totalAccounts - active,
    };
    opening = active;
    return step;
  });

  const current = periods[periods.length - 1];
  const first = periods[0];

  const missingInputs = [
    variable.annualCloudApiCost === 0 && variable.cloudCostPerAccount === 0
      ? "Hesap başına bulut/API maliyeti (malzeme)"
      : null,
    variable.supportHeadcount === 0 || variable.annualCostPerSupportStaff === 0
      ? "Destek/müşteri başarısı personel sayısı ve yıllık maliyeti"
      : null,
    variable.paymentCommissionRate === 0 ? "Ödeme altyapısı komisyon oranı (dağıtım)" : null,
    fixedBreakdown.other === 0 ? "Çekirdek ekip bordrosu ve genel yönetim gideri (diğer sabit)" : null,
    fixed.equipmentInvestment === 0 ? "Geliştirme donanımı / sunucu yatırım tutarı" : null,
    fixed.annualRent === 0 ? "Ofis kirası (varsa)" : null,
    tiers.length === 0 ? "Katman fiyat listesi (bağımsız / klinik / kurum)" : null,
    periods.length === 0 ? "Dönem bazlı aktif lisans adetleri" : null,
    !firstYearCosts.hasData ? "İlk yıl Ar-Ge ve şirket maliyet defteri" : null,
  ].filter((item): item is string => item !== null);

  const hypotheses = otherRevenueItems
    .filter((item) => item.hypothesis.trim().length > 0)
    .map((item) => `${item.name}: ${item.hypothesis}`);

  return {
    hasFeasibilityData: periods.length > 0 && tiers.length > 0,
    method: input.method,
    currencyNote: input.currencyNote,
    tiers,
    priceCatalog: input.priceCatalog,
    revenueChannels: input.revenueChannels,
    nonRevenueItems: input.nonRevenueItems,
    cashCollections: input.cashCollections,
    periods,
    current,
    first,
    fixedBreakdown,
    fixedTotal,
    firstYearCosts,
    otherRevenueItems,
    otherRevenueCatalogTotal,
    funnelBridge,
    funnelAssumptions: { ...funnel, monthlyNewAccounts: monthlyNew },
    missingInputs,
    hypotheses,
    narrative: buildNarrative(periods, funnel),
  };
}

function buildNarrative(periods: FeasibilityPeriod[], funnel: FeasibilityInput["funnel"]) {
  const current = periods[periods.length - 1];
  if (!current) return { where: [], why: [], next: [] as string[] };

  const fmt = (value: number, digits = 0) =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  const where = [
    `${current.period} döneminde ${fmt(current.totalAccounts)} aktif lisans, ${fmt(current.totalRevenue)} TL toplam gelir.`,
    `Harmanlanmış birim fiyat ${fmt(current.blendedPrice)} TL, birim değişken maliyet ${fmt(current.variable.total)} TL, katkı payı ${fmt(current.contribution)} TL (%${fmt(current.contributionRate, 1)}).`,
    `Başa baş noktası ${fmt(current.bepAccounts, 1)} lisans / ${fmt(current.bepRevenue)} TL.`,
  ];

  const why: string[] = [];
  if (current.totalAccounts >= current.bepAccounts && current.bepAccounts > 0) {
    why.push(
      `Mevcut adet başa baş noktasının ${fmt(current.totalAccounts - current.bepAccounts, 1)} lisans üzerinde; güvenlik payı %${fmt(current.marginOfSafety, 1)}. Dönem sonucu ${fmt(current.profit)} TL kâr.`,
    );
  } else if (current.bepAccounts > 0) {
    why.push(
      `Başa başa ulaşmak için ${fmt(current.bepAccounts - current.totalAccounts, 1)} lisans daha gerekiyor; mevcut yapıda dönem sonucu ${fmt(current.profit)} TL zarar.`,
    );
  }
  why.push(
    `Sabit maliyet ${fmt(current.fixedCost)} TL katkı payına bölünerek BEP bulunur; sabit maliyette %10 artış BEP'i ${fmt(current.bepAccounts * 0.1, 1)} lisans yukarı taşır.`,
  );
  const mixLeader = [...current.tiers].sort((a, b) => b.revenue - a.revenue)[0];
  if (mixLeader) {
    why.push(
      `Gelirin en büyük kısmı ${mixLeader.name} katmanından geliyor (karışım payı %${fmt(mixLeader.mixShare, 1)}); karışım değişirse harmanlanmış fiyat ve BEP birlikte değişir.`,
    );
  }

  const next: string[] = [];
  if (current.contribution <= 0) {
    next.push(
      "Katkı payı sıfır veya negatif: fiyatlama ya da hesap başına değişken maliyet (bulut/API, destek) düşürülmeden başa baş mümkün değil.",
    );
  }
  if (funnel.targetAccounts > 0) {
    next.push(
      `Hedef ${fmt(funnel.targetAccounts)} aktif lisans (${fmt(funnel.targetMonth)}. ay); mevcut huni varsayımlarıyla aylık net kazanım ${fmt(funnel.monthlyLeads * (funnel.demoRate / 100) * (funnel.payingRate / 100), 1)} müşteri.`,
    );
  }
  next.push(
    "Doğrulanmamış gelir kalemleri ana tabloya iyimser yazılmamalı; hipotez notu ile ayrı gösterilmelidir.",
  );

  return { where, why, next };
}
