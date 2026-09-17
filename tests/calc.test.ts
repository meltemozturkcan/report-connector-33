/**
 * Hesaplama motoru doğrulama testleri.
 * Çalıştırma: `bun test`
 *
 * Her test elle hesaplanabilen küçük bir örnek kurar ve formülün beklenen
 * sonucu verdiğini kontrol eder. Formül değişirse test hangi varsayımın
 * kırıldığını gösterir.
 */
import { describe, expect, test } from "bun:test";

import { computeAcquisition } from "../src/lib/acquisition-calc";
import { computeFeasibility } from "../src/lib/feasibility-calc";
import * as insights from "../src/lib/insights";
import {
  buildNetProfitBridge,
  computeProjection,
  selectScenario,
} from "../src/lib/projection-calc";
import { computeReport } from "../src/lib/report-calc";
import {
  emptyMonthlyRow,
  emptyReportInput,
  parseReportInputDetailed,
  type ReportInput,
} from "../src/lib/report-schema";

const clone = (): ReportInput => structuredClone(emptyReportInput);
const close = (actual: number, expected: number, digits = 6) =>
  expect(actual).toBeCloseTo(expected, digits);

/* ------------------------------------------------------------------ */
/* Kayıt okuma                                                         */
/* ------------------------------------------------------------------ */
describe("parseReportInputDetailed", () => {
  test("hatalı bir bölüm diğer bölümleri silmez", () => {
    const saved = {
      meta: { company: "Morvoilab", period: "Mayıs 2027" },
      monthly: [{ ...emptyMonthlyRow, month: "Ocak", sales: 100 }],
      financing: { shortTerm: "bozuk-değer" },
    };
    const { input, invalidSections } = parseReportInputDetailed(saved);
    expect(invalidSections).toEqual(["financing"]);
    expect(input.meta.company).toBe("Morvoilab");
    expect(input.monthly).toHaveLength(1);
    expect(input.monthly[0]?.sales).toBe(100);
    expect(input.financing.shortTerm).toBe(0);
  });

  test("boş veya geçersiz kayıt boş modele döner", () => {
    expect(parseReportInputDetailed(null).invalidSections).toEqual([]);
    expect(parseReportInputDetailed("x").input.monthly).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Aylık rapor: kârlılık, borç, senaryo, CAC / LTV                      */
/* ------------------------------------------------------------------ */
describe("computeReport", () => {
  const month = (over: Partial<typeof emptyMonthlyRow>) => ({ ...emptyMonthlyRow, ...over });

  test("brüt kâr → FAVÖK → net kâr zinciri", () => {
    const input = clone();
    input.monthly = [
      month({
        month: "Ocak",
        sales: 1000,
        cogs: 400,
        opex: 300,
        depreciation: 50,
        financialExpense: 20,
        tax: 30,
      }),
    ];
    const model = computeReport(input);
    const m = model.monthly[0]!;
    expect(m.grossProfit).toBe(600);
    expect(m.ebitda).toBe(300);
    expect(m.ebit).toBe(250);
    expect(m.netProfit).toBe(200);
    expect(model.currentMargin.gross).toBe(60);
    expect(model.currentMargin.ebitda).toBe(30);
    expect(model.currentMargin.net).toBe(20);
  });

  test("negatif FAVÖK'te kötümser senaryo baz senaryodan kötüdür", () => {
    const input = clone();
    input.monthly = [month({ month: "Ocak", sales: 100, cogs: 50, opex: 150 })];
    input.forecast.worstCaseDelta = -10;
    input.forecast.bestCaseDelta = 10;
    const model = computeReport(input);
    expect(model.baseScenario.ebitda).toBe(-100);
    expect(model.worstScenario.ebitda).toBe(-110);
    expect(model.bestScenario.ebitda).toBe(-90);
  });

  test("FAVÖK ≤ 0 iken net borç/FAVÖK ve DSCR ölçülemez olarak işaretlenir", () => {
    const input = clone();
    input.monthly = [
      month({ month: "Ocak", sales: 100, cogs: 50, opex: 150, debt: 500, cash: 100 }),
    ];
    input.financing.annualDebtService = 120;
    const model = computeReport(input);
    expect(model.debt.leverageMeasurable).toBe(false);
    expect(model.debt.dscrMeasurable).toBe(false);
    expect(model.debt.netDebtToEbitda).toBe(0);
  });

  test("pozitif FAVÖK'te net borç/FAVÖK yıllıklandırılmış FAVÖK ile hesaplanır", () => {
    const input = clone();
    input.monthly = [
      month({ month: "Ocak", sales: 100, cogs: 40, opex: 40, debt: 600, cash: 120 }),
      month({ month: "Şubat", sales: 100, cogs: 40, opex: 40, debt: 600, cash: 120 }),
    ];
    input.financing.annualDebtService = 120;
    const model = computeReport(input);
    // Aylık FAVÖK 20 → yıllık 240. Net borç 480 → 2,0x. DSCR 240/120 = 2,0x.
    expect(model.debt.annualisedEbitda).toBe(240);
    expect(model.debt.netDebtToEbitda).toBe(2);
    expect(model.debt.dscr).toBe(2);
  });

  test("yıl sonu bütçesi aylık bütçe sütunlarından ve Projeksiyon sekmesindeki kalan aydan türetilir", () => {
    const input = clone();
    input.monthly = [
      month({ month: "Ocak", sales: 90, budgetSales: 100, budgetCogs: 40, budgetOpex: 30 }),
      month({ month: "Şubat", sales: 110, budgetSales: 100, budgetCogs: 40, budgetOpex: 30 }),
    ];
    input.projection.remainingMonths = 10;
    const model = computeReport(input);
    expect(model.forecast.remainingMonths).toBe(10);
    expect(model.forecast.budgetFullYear.sales).toBe(1200);
    expect(model.forecast.budgetFullYear.ebitda).toBe(360);
    expect(model.baseScenario.sales).toBe(1200);
  });

  test("aylık birim ekonomisi: CAC, LTV, geri ödeme", () => {
    const input = clone();
    input.monthly = [month({ month: "Ocak", sales: 1 })];
    input.unitEconomics = [
      {
        month: "Ocak",
        newCustomers: 50,
        marketingSpend: 20, // bin TL
        salesSpend: 5, // bin TL
        arpu: 400,
        churnRate: 4,
        grossMarginRate: 75,
      },
    ];
    const ue = computeReport(input).unitEconomics[0]!;
    // CAC = 25.000 TL / 50 = 500 TL
    expect(ue.cac).toBe(500);
    // Aylık brüt kâr 300 TL, ömür 25 ay → LTV 7.500 TL
    expect(ue.lifetimeMonths).toBe(25);
    expect(ue.ltv).toBe(7500);
    expect(ue.ltvToCac).toBe(15);
    close(ue.paybackMonths, 1.7, 1);
  });
});

/* ------------------------------------------------------------------ */
/* Edinim: freemium / ücretli CAC, Basic-Premium LTV, B2B maliyet kartı  */
/* ------------------------------------------------------------------ */
describe("computeAcquisition", () => {
  const base = () => clone().acquisition;

  test("atıf oranı kalemi böler; serbest yazılmış kova adı normalize edilir", () => {
    const input = base();
    input.spendLedger = [
      {
        name: "Pazarlama personeli",
        mainClass: "",
        bucket: " b2c  cac ",
        channel: "",
        amount: 10000,
        attributionRate: 30,
        period: "2028",
        note: "",
      },
      {
        name: "GPU",
        mainClass: "",
        bucket: "Ürün COGS",
        channel: "",
        amount: 4000,
        attributionRate: 100,
        period: "2028",
        note: "",
      },
    ];
    const model = computeAcquisition(input);
    expect(model.ledger[0]!.bucket).toBe("B2C CAC");
    expect(model.b2cCacPool).toBe(3000);
    expect(model.ledger[0]!.unallocatedAmount).toBe(7000);
    expect(model.excludedPool).toBe(4000);
    expect(model.rawOpexTotal).toBe(14000);
  });

  test("tanınmayan kova uyarı üretir", () => {
    const input = base();
    input.spendLedger = [
      {
        name: "Reklam",
        mainClass: "",
        bucket: "Pazarlama",
        channel: "",
        amount: 100,
        attributionRate: 100,
        period: "",
        note: "",
      },
    ];
    const model = computeAcquisition(input);
    expect(
      model.warnings.some((w) => w.includes('"Pazarlama" geçerli bir maliyet yeri değil')),
    ).toBe(true);
  });

  test("cohort freemium CAC, ücretli CAC ve karma LTV", () => {
    const input = base();
    input.b2cCohorts = [
      {
        cohort: "Mart 2028",
        channels: [
          { channel: "Meta", spend: 6000, eligibleFreeParents: 60, paidParents: 12 },
          { channel: "Okul", spend: 4000, eligibleFreeParents: 40, paidParents: 8 },
        ],
      },
    ];
    input.b2cUnit = {
      ...input.b2cUnit,
      basicPrice: 200,
      premiumPrice: 400,
      paymentCommissionRate: 5,
      techCostPerUser: 20,
      supportCostPerUser: 10,
      basicChurnRate: 10,
      premiumChurnRate: 5,
      basicMixRate: 60,
      freeToPaidRate: 0, // cohort'tan ölçülsün
    };
    const model = computeAcquisition(input);
    // Freemium CAC = 10.000 / 100 = 100 TL; dönüşüm 20/100 = %20 → ücretli CAC 500 TL
    expect(model.blendedFreemiumCac).toBe(100);
    expect(model.measuredConversionRate).toBe(20);
    close(model.measuredPaidCac, 500);
    // Basic: net 190, katkı 160, ömür 10 ay, LTV 1.600
    // Premium: net 380, katkı 350, ömür 20 ay, LTV 7.000
    const [basic, premium] = model.packages;
    close(basic!.contribution, 160);
    close(basic!.ltv, 1600);
    close(premium!.ltv, 7000);
    // Karma: 0,6×1.600 + 0,4×7.000 = 3.760; katkı 0,6×160 + 0,4×350 = 236
    close(model.blendedLtv, 3760);
    close(model.b2cLtvToCac, 7.52);
    close(model.b2cPaybackMonths, 500 / 236);
  });

  test("plan dönüşümü elle girilmediyse cohort'tan ölçülen oranı kullanır (ücretli CAC 0 görünmez)", () => {
    const input = base();
    input.b2cCohorts = [
      {
        cohort: "Mart",
        channels: [{ channel: "Meta", spend: 1000, eligibleFreeParents: 100, paidParents: 20 }],
      },
    ];
    input.b2cPlan = {
      ...input.b2cPlan,
      channels: [{ channel: "Meta", eligibleTarget: 100 }],
      poolItems: [
        { name: "Reklam", calculation: "", channel: "Meta", pnlAmount: 5000, cashAmount: 5000 },
      ],
    };
    const plan = computeAcquisition(input).b2cPlan;
    expect(plan.conversionRate).toBe(20);
    expect(plan.paidParents).toBe(20);
    expect(plan.paidCac).toBe(250);
  });

  test("defter ↔ cohort mutabakatı yalnızca aynı dönemde uyarı verir", () => {
    const input = base();
    input.b2cCohorts = [
      {
        cohort: "Mart 2028",
        channels: [{ channel: "Meta", spend: 1000, eligibleFreeParents: 10, paidParents: 1 }],
      },
    ];
    // Yıllık defter satırı: aylık cohort'la karşılaştırılmamalı
    input.spendLedger = [
      {
        name: "Dijital reklam",
        mainClass: "",
        bucket: "B2C CAC",
        channel: "",
        amount: 12000,
        attributionRate: 100,
        period: "2028",
        note: "",
      },
    ];
    expect(computeAcquisition(input).warnings.some((w) => w.includes("fark kanallara"))).toBe(
      false,
    );

    input.spendLedger.push({
      name: "Mart reklamı",
      mainClass: "",
      bucket: "B2C CAC",
      channel: "",
      amount: 1500,
      attributionRate: 100,
      period: "mart 2028",
      note: "",
    });
    expect(computeAcquisition(input).warnings.some((w) => w.includes("Mart 2028: defterden"))).toBe(
      true,
    );
  });

  test("B2B lisans tam maliyet kartı ve ağırlıklı CAC (defter + alt kalem, mükerrersiz)", () => {
    const input = base();
    input.spendLedger = [
      {
        name: "Fuar",
        mainClass: "",
        bucket: "B2B CAC",
        channel: "Doğrudan",
        amount: 20000,
        attributionRate: 50,
        period: "2028",
        note: "",
      },
    ];
    input.b2bLicense = {
      ...input.b2bLicense,
      licensePrice: 12000,
      reportsPerLicense: 100,
      perReport: [
        { name: "GPU", unitCost: 3 },
        { name: "Depolama", unitCost: 1 },
      ],
      onlineCollectionShare: 50,
      paymentCommissionRate: 2,
      annualSupportCost: 10000,
      monthlyActiveLicenses: Array.from({ length: 12 }, () => 10),
      fixedOps: [
        { name: "Muhasebe", annualAmount: 20000, productShareRate: 25, allocationKey: "saat" },
      ],
      cacItems: [{ name: "Demo seyahati", channel: "Doğrudan", amount: 5000 }],
      cacChannels: [
        { channel: "Doğrudan", newLicenses: 5 },
        { channel: "Yönlendirme", newLicenses: 5 },
      ],
      annualChurnRate: 20,
    };
    const b2b = computeAcquisition(input).b2b;
    expect(b2b.techCogs).toBe(400);
    expect(b2b.paymentCommission).toBe(120); // 12.000 × %50 × %2
    expect(b2b.activeLicenseEquivalent).toBe(10);
    expect(b2b.supportPerLicense).toBe(1000);
    expect(b2b.directAccountCost).toBe(1520);
    expect(b2b.fixedOpsPerLicense).toBe(500); // 20.000 × %25 / 10
    expect(b2b.fullCostBeforeCac).toBe(2020);
    // Doğrudan kanal: defterden 10.000 + alt kalem 5.000 = 15.000 / 5 = 3.000
    expect(b2b.cacChannels[0]!.spend).toBe(15000);
    expect(b2b.cacChannels[0]!.cac).toBe(3000);
    // Ağırlıklı CAC = 15.000 / 10 lisans = 1.500
    expect(b2b.weightedB2bCac).toBe(1500);
  });
});

/* ------------------------------------------------------------------ */
/* Projeksiyon: net kâr köprüsü                                        */
/* ------------------------------------------------------------------ */
describe("computeProjection — net kâr köprüsü", () => {
  const withRevenue = () => {
    const input = clone();
    input.projection.startYear = 2027;
    input.projection.endYear = 2029;
    input.feasibility.tiers = [{ name: "Klinik", unitPrice: 10000 }];
    input.feasibility.periods = ["2027", "2028", "2029"].map((period, index) => ({
      period,
      stage: "",
      counts: [[10, 30, 60][index]!],
      revenueRecognitionRate: 100,
      recognizedRevenueOverride: 0,
      otherRevenue: 0,
      fixedCostOverride: 0,
    }));
    return input;
  };

  test("defterdeki kalemin tamamı faaliyet giderine yazılır (yalnız atfedilen pay değil)", () => {
    const input = withRevenue();
    input.acquisition.spendLedger = [
      {
        name: "Pazarlama personeli",
        mainClass: "",
        bucket: "B2C CAC",
        channel: "",
        amount: 50000,
        attributionRate: 30,
        period: "2027",
        note: "",
      },
    ];
    const row = selectScenario(computeProjection(input), "Baz", "accrual").years[0]!;
    expect(row.opexSource).toBe("ledger");
    expect(row.opex).toBe(50000);
  });

  test("Tablo 4.4-3 amortismanı FAVÖK'ten önce ve sonra iki kez düşülmez", () => {
    const input = withRevenue();
    input.feasibility.fixed.equipmentInvestment = 50000;
    input.feasibility.fixed.equipmentUsefulLifeYears = 5; // yıllık 10.000
    input.feasibility.fixed.annualRent = 30000;
    const row = selectScenario(computeProjection(input), "Baz", "accrual").years[0]!;
    // Sabit maliyet 40.000 = kira 30.000 + amortisman 10.000
    expect(row.opexSource).toBe("fixedCost");
    expect(row.opex).toBe(30000);
    expect(row.amortization).toBe(10000);
    expect(row.ebitda).toBe(100000 - row.variableCost - 30000);
    expect(row.pretaxProfit).toBe(row.ebitda - 10000);
  });

  test("geçmiş yıl zararı sonraki yıllarda vergi matrahından düşülür", () => {
    const input = withRevenue();
    input.projection.corporateTaxRate = 25;
    input.feasibility.periods = input.feasibility.periods.map((p, index) => ({
      ...p,
      fixedCostOverride: [200000, 200000, 200000][index]!,
    }));
    // Gelir: 100.000 / 300.000 / 600.000 → vergi öncesi −100.000 / +100.000 / +400.000
    const years = selectScenario(computeProjection(input), "Baz", "accrual").years;
    expect(years.map((y) => y.pretaxProfit)).toEqual([-100000, 100000, 400000]);
    expect(years[0]!.tax).toBe(0);
    expect(years[1]!.lossOffset).toBe(100000);
    expect(years[1]!.tax).toBe(0);
    expect(years[2]!.lossOffset).toBe(0);
    expect(years[2]!.tax).toBe(100000);
    expect(years[2]!.netProfit).toBe(300000);
  });

  test("köprüdeki her toplam satırı üstündeki satırların toplamına eşittir", () => {
    const input = withRevenue();
    input.projection.corporateTaxRate = 25;
    input.projection.financingByYear = [
      {
        year: "2028",
        debtBalance: 100000,
        interestRate: 30,
        principalRepayment: 20000,
        newFinancing: 0,
      },
    ];
    input.feasibility.firstYear.items = [
      { name: "Sunucu", amount: 60000, rdShareRate: 50, amortizationYears: 3, note: "" },
    ];
    for (const scenario of ["Kötümser", "Baz", "İyimser"] as const) {
      for (const view of ["accrual", "cash"] as const) {
        for (const year of selectScenario(computeProjection(input), scenario, view).years) {
          let running = 0;
          for (const line of buildNetProfitBridge(year)) {
            if (line.kind === "total") {
              if (line.label !== "Net satış") close(line.amount, running, 4);
              running = line.amount;
            } else {
              running += line.amount;
            }
          }
        }
      }
    }
  });

  test("nakit: dönem sonu = dönem başı + faaliyet + yatırım + finansman ve yıllar zincirlenir", () => {
    const input = withRevenue();
    input.projection.openingCash = 250000;
    input.projection.capexByYear = [{ year: "2027", amount: 40000, note: "" }];
    input.projection.financingByYear = [
      {
        year: "2027",
        debtBalance: 0,
        interestRate: 0,
        principalRepayment: 0,
        newFinancing: 100000,
      },
    ];
    const years = selectScenario(computeProjection(input), "Baz", "accrual").years;
    const first = years[0]!;
    close(first.closingCash, 250000 + first.operatingCash - 40000 + 100000);
    expect(years[1]!.openingCash).toBe(first.closingCash);
  });

  test("karma LTV/CAC yeni müşteri adedine göre ağırlıklandırılır", () => {
    const input = withRevenue();
    const acq = input.acquisition;
    acq.b2bLicense = {
      ...acq.b2bLicense,
      licensePrice: 10000,
      monthlyActiveLicenses: Array.from({ length: 12 }, () => 10),
      annualChurnRate: 50, // ömür 2 yıl → LTV 20.000
      cacItems: [{ name: "Satış", channel: "D", amount: 10000 }],
      cacChannels: [{ channel: "D", newLicenses: 2 }], // CAC 5.000
    };
    acq.b2cCohorts = [
      {
        cohort: "M",
        channels: [{ channel: "X", spend: 10000, eligibleFreeParents: 100, paidParents: 20 }],
      },
    ];
    acq.b2cUnit = { ...acq.b2cUnit, basicPrice: 100, basicChurnRate: 10, basicMixRate: 100 }; // LTV 1.000, CAC 500
    const model = computeProjection(input);
    // (20.000×2 + 1.000×20) / (5.000×2 + 500×20) = 60.000 / 20.000 = 3,0x
    close(model.referenceBlendedLtvToCac ?? 0, 3);
  });
});

describe("computeFeasibility", () => {
  test("başa baş adedi = sabit maliyet ÷ katkı payı", () => {
    const input = clone().feasibility;
    input.method = "blended";
    input.tiers = [{ name: "Klinik", unitPrice: 12000 }];
    input.variable.otherVariablePerAccount = 2000;
    input.fixed.annualRent = 100000;
    input.periods = [
      {
        period: "2028",
        stage: "",
        counts: [20],
        revenueRecognitionRate: 100,
        recognizedRevenueOverride: 0,
        otherRevenue: 0,
        fixedCostOverride: 0,
      },
    ];
    const period = computeFeasibility(input).periods[0]!;
    expect(period.contribution).toBe(10000);
    expect(period.bepAccounts).toBe(10);
    expect(period.bepRevenue).toBe(120000);
    expect(period.profit).toBe(240000 - 100000 - 40000);
    expect(period.marginOfSafety).toBe(50);
  });
});

/* ------------------------------------------------------------------ */
/* Yorumlar: sabit cümle değil, verinin yönüne göre                     */
/* ------------------------------------------------------------------ */
describe("insights", () => {
  const month = (over: Partial<typeof emptyMonthlyRow>) => ({ ...emptyMonthlyRow, ...over });

  test("satış arttı ama FAVÖK düştüyse bunu söyler; tersinde söylemez", () => {
    const input = clone();
    input.monthly = [
      month({ month: "Ocak", sales: 100, cogs: 40, opex: 30 }),
      month({ month: "Şubat", sales: 120, cogs: 60, opex: 40 }),
    ];
    input.sales.priceEffect = 15;
    input.sales.volumeEffect = 5;
    const text = insights.salesProfitInsight(computeReport(input));
    expect(text).toContain("%20,0 arttı");
    expect(text).toContain("fiyat etkisi");
    expect(text).toContain("yansımadı");

    input.monthly[1] = month({ month: "Şubat", sales: 90, cogs: 30, opex: 20 });
    const down = insights.salesProfitInsight(computeReport(input));
    expect(down).toContain("azaldı");
    expect(down).not.toContain("yansımadı");
  });

  test("işletme sermayesi nakit serbest bıraktıysa 'bağlandı' demez", () => {
    const input = clone();
    input.monthly = [
      month({ month: "Ocak", sales: 100, receivables: 50, inventory: 30, payables: 20, cash: 10 }),
      month({
        month: "Şubat",
        sales: 100,
        receivables: 30,
        inventory: 30,
        payables: 20,
        cash: 30,
        operatingCash: 20,
      }),
    ];
    const text = insights.cashTiedInsight(computeReport(input));
    expect(text).toContain("serbest bıraktı");
  });

  test("hiçbir yorum eksik veya uç veride NaN / Infinity üretmez", () => {
    const cases: ReportInput[] = [];
    const empty = clone();
    empty.monthly = [month({ month: "Ocak" })];
    cases.push(empty);
    const zeros = clone();
    zeros.monthly = [month({ month: "Ocak" }), month({ month: "Şubat" })];
    zeros.unitEconomics = [
      {
        month: "Ocak",
        newCustomers: 0,
        marketingSpend: 0,
        salesSpend: 0,
        arpu: 0,
        churnRate: 0,
        grossMarginRate: 0,
      },
      {
        month: "Şubat",
        newCustomers: 0,
        marketingSpend: 0,
        salesSpend: 0,
        arpu: 0,
        churnRate: 0,
        grossMarginRate: 0,
      },
    ];
    zeros.ltv.cohorts = [
      { cohort: "A", month12Retention: 0, ltv: 0 },
      { cohort: "B", month12Retention: 0, ltv: 0 },
    ];
    cases.push(zeros);
    const negative = clone();
    negative.monthly = [
      month({ month: "Ocak", sales: 10, opex: 100, debt: 50 }),
      month({ month: "Şubat", sales: 5, opex: 120, debt: 80, operatingCash: -60 }),
    ];
    cases.push(negative);

    for (const input of cases) {
      const model = computeReport(input);
      const all = [
        insights.salesProfitInsight(model),
        insights.profitToCashInsight(model),
        insights.cashTiedInsight(model),
        insights.budgetInsight(model),
        insights.debtInsight(model),
        insights.executiveChain(model),
        insights.cacTrendInsight(model),
        insights.ltvTrendInsight(model),
        insights.segmentInsight(model),
        insights.cohortInsight(model),
        ...model.narrative.where,
        ...model.narrative.why,
      ].join("\n");
      expect(all).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
