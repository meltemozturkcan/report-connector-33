import type { ReportInput } from "./report-schema";
import { computeFeasibility } from "./feasibility-calc";
import { computeAcquisition } from "./acquisition-calc";

/**
 * 2027–2032 projeksiyon merkezi.
 *
 * Hiçbir sonuç elle girilmez: gelir fizibilite dönemlerinden, satışların
 * maliyeti Tablo 4.4-2 değişken maliyetlerinden, faaliyet gideri ham gider
 * defterinin atfedilen paylarından, amortisman ilk yıl defterinin
 * aktifleştirilen kalemlerinden, finansal maliyet ve CAPEX yıl bazlı
 * finansman/CAPEX satırlarından gelir.
 *
 * Net kâr = FAVÖK − amortisman − finansal maliyet − vergi.
 * Tutarlar TL'dir (aylık rapor bölümündeki bin TL ölçeğinden bağımsız).
 */

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
const clampRate = (value: number) => Math.min(Math.max(value, 0), 100);

export type CollectionView = "accrual" | "cash";
export type ScenarioName = "Kötümser" | "Baz" | "İyimser";

export type ProjectionYear = {
  year: string;
  stage: string;
  netSales: number;
  accrualSales: number;
  cashCollected: number;
  collectionGap: number;
  variableCost: number;
  grossProfit: number;
  grossMarginRate: number;
  opex: number;
  opexSource: "ledger" | "fixedCost" | "none";
  ebitda: number;
  ebitdaMarginRate: number;
  amortization: number;
  financialCost: number;
  pretaxProfit: number;
  tax: number;
  netProfit: number;
  netMarginRate: number;
  operatingCash: number;
  investingCash: number;
  financingCash: number;
  openingCash: number;
  closingCash: number;
  debtBalance: number;
  netDebt: number;
  netDebtToEbitda: number | null;
};

export type ProjectionScenario = {
  name: ScenarioName;
  revenueDelta: number;
  costDelta: number;
  years: ProjectionYear[];
};

export type UnitEconomicsCard = {
  segment: string;
  ltv: number | null;
  cac: number | null;
  ltvToCac: number | null;
  paybackMonths: number | null;
  note: string;
};

const b2cTierPattern = /(ebeveyn|basic|premium|b2c)/i;
const institutionTierPattern = /(kurum|okul|belediye|b2b2c)/i;

const yearOf = (label: string) => {
  const match = label.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
};

export type ProjectionModel = ReturnType<typeof computeProjection>;

export function computeProjection(input: ReportInput) {
  const settings = input.projection;
  const feasibility = computeFeasibility(input.feasibility);
  const acquisition = computeAcquisition(input.acquisition);

  const startYear = settings.startYear || 2027;
  const endYear = Math.max(settings.endYear || startYear, startYear);
  const warnings: string[] = [];

  /** Katman filtreleri: doğrulanmadıkça B2C ve kurum geliri ana senaryoya girmez. */
  const isIncludedTier = (name: string) => {
    if (!settings.includeB2cRevenue && b2cTierPattern.test(name)) return false;
    if (!settings.includeInstitutionRevenue && institutionTierPattern.test(name)) return false;
    return true;
  };
  const excludedTierNames = feasibility.tiers
    .map((tier) => tier.name)
    .filter((name) => name.trim() && !isIncludedTier(name));

  /** Ham gider defterinden yıl bazlı faaliyet gideri ve satışların maliyeti. */
  const ledgerFor = (year: number) => {
    const lines = acquisition.ledger.filter((line) => yearOf(line.period) === year);
    const cogs = lines
      .filter((line) => line.bucket === "Ürün COGS")
      .reduce((sum, line) => sum + line.attributedAmount, 0);
    const opex = lines
      .filter((line) => line.bucket !== "Ürün COGS")
      .reduce((sum, line) => sum + line.attributedAmount, 0);
    return { cogs, opex, count: lines.length };
  };

  /** İlk yıl defterindeki aktifleştirilen kalemlerin yıl bazlı amortismanı. */
  const amortizationFor = (year: number) =>
    feasibility.firstYearCosts.lines
      .filter((line) => line.capitalized && line.amortizationYears > 0)
      .filter((line) => year >= startYear && year < startYear + line.amortizationYears)
      .reduce((sum, line) => sum + line.amount / line.amortizationYears, 0);

  const capexFor = (year: number) =>
    settings.capexByYear
      .filter((row) => yearOf(row.year) === year)
      .reduce((sum, row) => sum + row.amount, 0);

  const financingFor = (year: number) => {
    const rows = settings.financingByYear.filter((row) => yearOf(row.year) === year);
    return {
      debtBalance: rows.reduce((sum, row) => sum + row.debtBalance, 0),
      interest: rows.reduce((sum, row) => sum + (row.debtBalance * clampRate(row.interestRate)) / 100, 0),
      principalRepayment: rows.reduce((sum, row) => sum + row.principalRepayment, 0),
      newFinancing: rows.reduce((sum, row) => sum + row.newFinancing, 0),
      hasRow: rows.length > 0,
    };
  };

  const collectedFor = (year: number) =>
    feasibility.cashCollections
      .filter((row) => yearOf(row.period) === year)
      .reduce((sum, row) => sum + row.pilot + row.annual, 0);

  const yearsInPlan = feasibility.periods
    .map((period) => ({ period, year: yearOf(period.period) }))
    .filter((item): item is { period: (typeof feasibility.periods)[number]; year: number } =>
      item.year !== null && item.year >= startYear && item.year <= endYear,
    )
    .sort((a, b) => a.year - b.year);

  const buildYears = (
    revenueDelta: number,
    costDelta: number,
    view: CollectionView,
    collectWarnings: boolean,
  ): ProjectionYear[] => {
    let openingCash = settings.openingCash;
    return yearsInPlan.map(({ period, year }) => {
      const includedTiers = period.tiers.filter((tier) => isIncludedTier(tier.name));
      const includedArr = includedTiers.reduce((sum, tier) => sum + tier.revenue, 0);
      /** Dönem geliri / ARR oranı: yıl içi aktiflik veya belgeli tutar korunur. */
      const recognitionRatio = period.arr > 0 ? safeDiv(period.subscriptionRevenue, period.arr) : 1;
      const subscription = includedArr * recognitionRatio;
      const accrualSales = subscription + period.otherRevenue;
      const cashCollected = collectedFor(year);
      const baseSales = view === "cash" && cashCollected > 0 ? cashCollected : accrualSales;
      const netSales = baseSales * (1 + revenueDelta / 100);

      const tierVariable = includedTiers.reduce(
        (sum, tier) => sum + tier.accounts * tier.unitVariableCost,
        0,
      );
      const ledger = ledgerFor(year);
      const variableCost = (tierVariable + ledger.cogs) * (1 + costDelta / 100);

      const grossProfit = netSales - variableCost;
      const opexSource: ProjectionYear["opexSource"] =
        ledger.opex > 0 ? "ledger" : period.fixedCost > 0 ? "fixedCost" : "none";
      const rawOpex = opexSource === "ledger" ? ledger.opex : opexSource === "fixedCost" ? period.fixedCost : 0;
      const opex = rawOpex * (1 + costDelta / 100);
      const ebitda = grossProfit - opex;

      const amortization = amortizationFor(year);
      const financing = financingFor(year);
      const pretaxProfit = ebitda - amortization - financing.interest;
      const taxRate = clampRate(settings.corporateTaxRate);
      const tax = pretaxProfit > 0 ? (pretaxProfit * taxRate) / 100 : 0;
      const netProfit = pretaxProfit - tax;

      const investingCash = -capexFor(year);
      const financingCash = financing.newFinancing - financing.principalRepayment;
      const operatingCash = ebitda - financing.interest - tax;
      const closingCash = openingCash + operatingCash + investingCash + financingCash;
      const netDebt = financing.debtBalance - closingCash;

      if (collectWarnings) {
        if (opexSource === "ledger" && period.fixedCost > 0) {
          warnings.push(
            `${period.period}: faaliyet gideri ham gider defterinden alındı (${Math.round(ledger.opex)} TL); Tablo 4.4-3 sabit maliyeti de ${Math.round(period.fixedCost)} TL. Aynı kalem iki yerde olmasın.`,
          );
        }
        if (opexSource === "none") {
          warnings.push(`${period.period}: faaliyet gideri ölçülmedi — ham gider defterine bu yıl için satır girin.`);
        }
        if (view === "cash" && cashCollected === 0 && accrualSales > 0) {
          warnings.push(`${period.period}: tahsilat takibinde bu yıl için kayıt yok; nakit görünümünde gelir tahakkuku kullanıldı.`);
        }
        if (!financing.hasRow) {
          warnings.push(`${period.period}: borç bakiyesi ve faiz oranı girilmedi — finansal maliyet 0 kabul edildi.`);
        }
        if (capexFor(year) === 0) {
          warnings.push(`${period.period}: CAPEX satırı girilmedi — yatırım nakit çıkışı 0 kabul edildi.`);
        }
      }

      const result: ProjectionYear = {
        year: period.period,
        stage: period.stage,
        netSales,
        accrualSales,
        cashCollected,
        collectionGap: accrualSales - cashCollected,
        variableCost,
        grossProfit,
        grossMarginRate: safeDiv(grossProfit, netSales) * 100,
        opex,
        opexSource,
        ebitda,
        ebitdaMarginRate: safeDiv(ebitda, netSales) * 100,
        amortization,
        financialCost: financing.interest,
        pretaxProfit,
        tax,
        netProfit,
        netMarginRate: safeDiv(netProfit, netSales) * 100,
        operatingCash,
        investingCash,
        financingCash,
        openingCash,
        closingCash,
        debtBalance: financing.debtBalance,
        netDebt,
        netDebtToEbitda: ebitda > 0 ? netDebt / ebitda : null,
      };
      openingCash = closingCash;
      return result;
    });
  };

  const makeScenarios = (view: CollectionView): ProjectionScenario[] => [
    {
      name: "Kötümser",
      revenueDelta: settings.worstRevenueDelta,
      costDelta: settings.worstCostDelta,
      years: buildYears(settings.worstRevenueDelta, settings.worstCostDelta, view, false),
    },
    { name: "Baz", revenueDelta: 0, costDelta: 0, years: buildYears(0, 0, view, true) },
    {
      name: "İyimser",
      revenueDelta: settings.bestRevenueDelta,
      costDelta: settings.bestCostDelta,
      years: buildYears(settings.bestRevenueDelta, settings.bestCostDelta, view, false),
    },
  ];

  const scenariosAccrual = makeScenarios("accrual");
  const scenariosCash = makeScenarios("cash");

  if (clampRate(settings.corporateTaxRate) === 0) {
    warnings.push("Kurumlar vergisi oranı girilmedi — vergi 0 kabul edildi, net kâr vergi öncesi tutara eşit.");
  }
  if (settings.openingCash === 0) {
    warnings.push("Plan başlangıcındaki nakit girilmedi — dönem sonu nakit yalnızca dönem içi hareketleri gösterir.");
  }
  if (excludedTierNames.length > 0) {
    warnings.push(
      `Ana senaryodan çıkarılan gelir katmanları: ${excludedTierNames.join(", ")}. Doğrulandığında üstteki anahtarı açın.`,
    );
  }

  /** B2B ve B2C birim ekonomisi ayrı kartlar; tek karma değere zorlanmaz. */
  const b2bLicense = input.acquisition.b2bLicense;
  const b2bAnnualContribution =
    acquisition.b2b.licensePrice - acquisition.b2b.fullCostBeforeCac;
  const b2bChurn = clampRate(b2bLicense.annualChurnRate);
  const b2bLifetimeYears = b2bChurn > 0 ? 100 / b2bChurn : 0;
  const b2bCac = acquisition.b2b.weightedB2bCac;
  const b2bLtv = b2bLifetimeYears > 0 ? b2bAnnualContribution * b2bLifetimeYears : null;
  const b2cCac = acquisition.measuredPaidCac > 0 ? acquisition.measuredPaidCac : acquisition.b2cPlan.paidCac;
  const b2cLtv = acquisition.blendedLtv;

  const unitEconomics: UnitEconomicsCard[] = [
    {
      segment: "B2B lisans",
      ltv: b2bLtv,
      cac: b2bCac > 0 ? b2bCac : null,
      ltvToCac: b2bLtv !== null && b2bCac > 0 ? b2bLtv / b2bCac : null,
      paybackMonths:
        b2bCac > 0 && b2bAnnualContribution > 0 ? b2bCac / (b2bAnnualContribution / 12) : null,
      note:
        b2bChurn === 0
          ? "Yıllık lisans kaybı (%) ölçülmedi — LTV hesaplanamıyor."
          : `Yıllık katkı ${Math.round(b2bAnnualContribution)} TL × ${b2bLifetimeYears.toFixed(1)} yıl ömür.`,
    },
    {
      segment: "B2C abonelik",
      ltv: b2cLtv > 0 ? b2cLtv : null,
      cac: b2cCac > 0 ? b2cCac : null,
      ltvToCac: b2cLtv > 0 && b2cCac > 0 ? b2cLtv / b2cCac : null,
      paybackMonths:
        b2cCac > 0 && acquisition.blendedContribution > 0
          ? b2cCac / acquisition.blendedContribution
          : null,
      note:
        acquisition.measuredPaidCac > 0
          ? "Ölçülen ücretli CAC kullanıldı."
          : "Plandaki ücretli CAC kullanıldı; ölçüm geldiğinde gerçek CAC'e döner.",
    },
  ];

  const referenceBlendedLtvToCac =
    unitEconomics[0].ltvToCac !== null && unitEconomics[1].ltvToCac !== null
      ? (unitEconomics[0].ltvToCac + unitEconomics[1].ltvToCac) / 2
      : null;

  return {
    hasProjectionData: yearsInPlan.length > 0,
    startYear,
    endYear,
    years: yearsInPlan.map(({ period }) => period.period),
    settings,
    scenariosAccrual,
    scenariosCash,
    unitEconomics,
    referenceBlendedLtvToCac,
    excludedTierNames,
    warnings: [...new Set(warnings)],
  };
}

/** Seçili senaryo ve tahsilat görünümü için yıl satırlarını döndürür. */
export function selectScenario(
  model: ProjectionModel,
  scenario: ScenarioName,
  view: CollectionView,
): ProjectionScenario {
  const list = view === "cash" ? model.scenariosCash : model.scenariosAccrual;
  return list.find((row) => row.name === scenario) ?? list[1];
}
