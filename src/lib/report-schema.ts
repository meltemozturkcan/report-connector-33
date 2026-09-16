import { z } from "zod";

/**
 * Rapor giriş modeli.
 * Kullanıcı yalnızca "ham" verileri girer; oranlar, sapmalar, marjlar ve
 * senaryolar report-calc.ts içindeki hesaplama metotlarıyla türetilir.
 * Para tutarları bin TL, oranlar yüzde (%) olarak girilir.
 */

const num = z.coerce.number().finite();
const text = z.string().trim();

/**
 * Gider kalemlerinin gidebileceği yerler. Bir kalem yalnızca bir yere yazılır;
 * yalnızca CAC kovaları müşteri kazanım maliyetine girer.
 */
export const cacBuckets = [
  "B2C CAC",
  "B2B CAC",
  "Yönlendirme CAC",
  "Ürün COGS",
  "Ürün operasyon",
  "Ar-Ge / ürün OPEX",
  "Genel yönetim",
  "Uzman hizmet maliyeti",
] as const;

export const cacBucketNames: string[] = ["B2C CAC", "B2B CAC", "Yönlendirme CAC"];

export const monthlyInputSchema = z.object({
  month: text.min(1, "Ay adı gerekli"),
  sales: num,
  budgetSales: num,
  cogs: num,
  budgetCogs: num,
  opex: num,
  budgetOpex: num,
  depreciation: num,
  financialExpense: num,
  tax: num,
  operatingCash: num,
  investingCash: num,
  financingCash: num,
  cash: num,
  receivables: num,
  inventory: num,
  payables: num,
  debt: num,
});
export type MonthlyInput = z.infer<typeof monthlyInputSchema>;

export const unitEconomicsInputSchema = z.object({
  month: text.min(1, "Ay adı gerekli"),
  newCustomers: num,
  marketingSpend: num,
  salesSpend: num,
  arpu: num,
  churnRate: num,
  grossMarginRate: num,
});
export type UnitEconomicsInput = z.infer<typeof unitEconomicsInputSchema>;

export const reportInputSchema = z.object({
  meta: z.object({
    company: text.default(""),
    period: text.default(""),
    previousPeriod: text.default(""),
    currencyNote: text.default("Tutarlar bin TL"),
  }),
  monthly: z.array(monthlyInputSchema).default([]),
  sales: z.object({
    byProduct: z
      .array(z.object({ name: text, current: num, previous: num, budget: num }))
      .default([]),
    byRegion: z.array(z.object({ name: text, current: num, previous: num })).default([]),
    volumeEffect: num.default(0),
    priceEffect: num.default(0),
    mixEffect: num.default(0),
    topCustomerShare: num.default(0),
  }),
  budget: z.object({
    reasons: z.array(z.object({ item: text, reason: text })).default([]),
  }),
  workingCapital: z.object({
    targetReceivableDays: num.default(0),
    targetInventoryDays: num.default(0),
    targetPayableDays: num.default(0),
  }),
  financing: z.object({
    shortTerm: num.default(0),
    longTerm: num.default(0),
    averageRate: num.default(0),
    annualDebtService: num.default(0),
    lines: z.array(z.object({ bank: text, limit: num, used: num })).default([]),
    maturities: z.array(z.object({ period: text, amount: num })).default([]),
  }),
  capex: z.object({
    annualBudget: num.default(0),
    ytdBudget: num.default(0),
    monthActual: num.default(0),
    projects: z
      .array(z.object({ name: text, budget: num, actual: num, status: text.default("Devam ediyor") }))
      .default([]),
  }),
  forecast: z.object({
    budgetFullYearSales: num.default(0),
    budgetFullYearEbitda: num.default(0),
    budgetFullYearNetCash: num.default(0),
    remainingMonths: num.default(0),
    worstCaseDelta: num.default(-10),
    bestCaseDelta: num.default(10),
    drivers: z.array(z.object({ name: text, impact: text, note: text })).default([]),
  }),
  unitEconomics: z.array(unitEconomicsInputSchema).default([]),
  cac: z.object({
    targetPaybackMonths: num.default(12),
    /** Kanal tablosunun ait olduğu dönem etiketi (örn. "Mart 2028"). */
    channelPeriod: text.default(""),
    byChannel: z
      .array(
        z.object({
          channel: text,
          spend: num,
          /** Yeni uygun ücretsiz ebeveyn (freemium kayıt). */
          freeSignups: num.default(0),
          /** Yeni ücretli ebeveyn. */
          newCustomers: num,
        }),
      )
      .default([]),
    funnel: z.array(z.object({ stage: text, count: num })).default([]),
  }),
  ltv: z.object({
    netRevenueRetention: num.default(0),
    logoRetention: num.default(0),
    cohorts: z.array(z.object({ cohort: text, month12Retention: num, ltv: num })).default([]),
    bySegment: z
      .array(z.object({ segment: text, arpu: num, churnRate: num, grossMarginRate: num, cac: num }))
      .default([]),
  }),
  /**
   * Fizibilite / başa baş (BEP) modülü.
   * Tutarlar TL (bin TL değil), oranlar yüzde olarak girilir.
   */
  feasibility: z.object({
    method: z.enum(["blended", "weighted"]).default("weighted"),
    currencyNote: text.default("Tutarlar TL, oranlar %"),
    tiers: z.array(z.object({ name: text, unitPrice: num })).default([]),
    /**
     * Fiyat listesi (KDV hariç baz fiyatlar). Yalnızca referans kataloğudur;
     * BEP hesabı katman fiyatları ve abonelik dışı gelir kalemleri üzerinden yürür.
     */
    priceCatalog: z
      .array(
        z.object({
          name: text,
          price: num.default(0),
          unit: text.default(""),
          scope: text.default(""),
        }),
      )
      .default([]),
    /** Gelir kanalları haritası: kanal, başlangıç zamanı, gelir birimi ve ana sürücü. */
    revenueChannels: z
      .array(
        z.object({
          channel: text,
          start: text.default(""),
          unit: text.default(""),
          driver: text.default(""),
        }),
      )
      .default([]),
    /** Gelir olmayan veya geliri azaltan kalemler (ücretsiz pilot, indirimler, üçüncü taraf bedeli). */
    nonRevenueItems: z
      .array(
        z.object({
          name: text,
          nature: text.default(""),
          condition: text.default(""),
          amount: num.default(0),
        }),
      )
      .default([]),
    /** Nakit akışı / tahsilat takibi: o ay faturalandırılıp tahsil edilen adetler ve tutarlar. */
    cashCollections: z
      .array(
        z.object({
          period: text,
          pilotCount: num.default(0),
          pilot: num.default(0),
          annualCount: num.default(0),
          annual: num.default(0),
        }),
      )
      .default([]),
    periods: z
      .array(
        z.object({
          period: text,
          /** Yılın niteliği: "Ar-Ge, pilot ve ilk satış yılı" veya "Ticari yıl". */
          stage: text.default(""),
          /** Dönem SONU aktif lisans adedi. counts × fiyat = yıl sonu ARR'dir, yıl içi gelir değildir. */
          counts: z.array(num).default([]),
          /**
           * Yıl içi ortalama aktiflik oranı (%). Lisanslar yıl boyunca kazanılıyorsa
           * dönem geliri = ARR × bu oran. 0 bırakılırsa gelir ARR'ye eşitlenir ve uyarı verilir.
           */
          revenueRecognitionRate: num.default(0),
          /** Belgeli/tahsilat bazlı dönem abonelik geliri. Girilirse ARR ve oran yerine bu kullanılır. */
          recognizedRevenueOverride: num.default(0),
          otherRevenue: num.default(0),
          fixedCostOverride: num.default(0),
        }),
      )
      .default([]),
    otherRevenue: z
      .array(z.object({ name: text, volume: num, unitPrice: num, hypothesis: text.default("") }))
      .default([]),
    funnel: z
      .object({
        monthsPerPeriod: num.default(1),
        startingAccounts: num.default(0),
        monthlyLeads: num.default(0),
        demoRate: num.default(0),
        payingRate: num.default(0),
        monthlyChurnRate: num.default(0),
        targetAccounts: num.default(0),
        targetMonth: num.default(0),
      })
      .default({}),
    variable: z
      .object({
        supportHeadcount: num.default(0),
        annualCostPerSupportStaff: num.default(0),
        accountsPerStaff: num.default(0),
        annualCloudApiCost: num.default(0),
        cloudCostPerAccount: num.default(0),
        annualEnergyCost: num.default(0),
        energyNote: text.default("Bulut kullanımında malzeme maliyetine dahildir"),
        paymentCommissionRate: num.default(0),
        annualBillingSoftwareCost: num.default(0),
        otherVariablePerAccount: num.default(0),
      })
      .default({}),
    /**
     * İlk yıl maliyet defteri.
     * Her kalem TEK satırda girilir; Ar-Ge payı (%) kalemi Ar-Ge ile şirket
     * bütçesi arasında böler. Böylece aynı gider iki bütçede mükerrer yazılamaz.
     * amortizationYears = 0 → ilk yıl gider yazılır, > 0 → aktifleştirilip
     * faydalı ömre bölünür (ilk yıl yalnızca bir yıllık amortisman yüklenir).
     */
    firstYear: z
      .object({
        label: text.default("Yıl 1"),
        useForFirstPeriod: z.coerce.boolean().default(true),
        items: z
          .array(
            z.object({
              name: text,
              amount: num,
              rdShareRate: num.default(0),
              amortizationYears: num.default(0),
              note: text.default(""),
            }),
          )
          .default([]),
      })
      .default({}),
    fixed: z
      .object({
        equipmentInvestment: num.default(0),
        equipmentUsefulLifeYears: num.default(5),
        buildingInvestment: num.default(0),
        buildingUsefulLifeYears: num.default(50),
        annualRent: num.default(0),
        otherItems: z.array(z.object({ name: text, amount: num })).default([]),
      })
      .default({}),
  }),
  /**
   * Edinim (CAC) ekonomisi.
   * Mükerrerlik kuralı: her gider kalemi defterde TEK satırda girilir, bir
   * "yer" (bucket) seçilir ve atıf oranı (%) ile bölünür. Yalnızca CAC
   * kovalarındaki atfedilmiş paylar kanal CAC hesabına girer; kalan pay
   * dağıtılmamış olarak görünür. Tutarlar TL, oranlar %.
   */
  acquisition: z.object({
    spendLedger: z
      .array(
        z.object({
          name: text,
          bucket: text.default(cacBuckets[0]),
          amount: num.default(0),
          attributionRate: num.default(100),
          period: text.default(""),
          note: text.default(""),
        }),
      )
      .default([]),
    /** Cohort bazlı freemium kazanım tablosu (Mart, Nisan, Mayıs, Haziran ...). */
    b2cCohorts: z
      .array(
        z.object({
          cohort: text,
          channels: z
            .array(
              z.object({
                channel: text,
                spend: num.default(0),
                /** Onam + gelişim öyküsü + teknik kalite + paket ekranı görüntüleme. */
                eligibleFreeParents: num.default(0),
                paidParents: num.default(0),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
    b2cUnit: z
      .object({
        basicPrice: num.default(0),
        premiumPrice: num.default(0),
        paymentCommissionRate: num.default(0),
        techCostPerUser: num.default(0),
        supportCostPerUser: num.default(0),
        basicChurnRate: num.default(0),
        premiumChurnRate: num.default(0),
        /** Ücretli portföyde Basic payı (%); Premium payı 100 − Basic. */
        basicMixRate: num.default(0),
        /** Ölçülen ücretsizden ücretliye dönüşüm (%). */
        freeToPaidRate: num.default(0),
        conversionScenarios: z.array(num).default([10, 15, 20, 25, 30]),
      })
      .default({}),
    b2bLicense: z
      .object({
        licensePrice: num.default(0),
        reportsPerLicense: num.default(0),
        perReport: z.array(z.object({ name: text, unitCost: num.default(0) })).default([]),
        /** Çevrim içi tahsil edilen lisans payı (%); EFT/havale payına komisyon uygulanmaz. */
        onlineCollectionShare: num.default(100),
        paymentCommissionRate: num.default(0),
        annualSupportCost: num.default(0),
        /** Ocak–Aralık aktif lisans adedi; aktif lisans eşdeğeri = toplam ÷ 12. */
        monthlyActiveLicenses: z.array(num).default([]),
        fixedOps: z
          .array(
            z.object({
              name: text,
              annualAmount: num.default(0),
              /**
               * Karma kullanımlı kalemlerde ürüne atfedilen pay (%). Kanıt
               * (dağıtım anahtarı) ölçülmeden 0 kalır; senaryo olarak yazılmaz.
               */
              productShareRate: num.default(0),
              /** Payın hangi kanıtla belirleneceği (ör. saat kaydı, kullanım payı). */
              allocationKey: text.default(""),
            }),
          )
          .default([]),
        /** CAC alt kalemleri; kanal adı cacChannels ile eşleşir. */
        cacItems: z
          .array(z.object({ name: text, channel: text.default(""), amount: num.default(0) }))
          .default([]),
        cacChannels: z
          .array(z.object({ channel: text, newLicenses: num.default(0) }))
          .default([]),
      })
      .default({}),
    /** Ana maliyet katmanları: hangi katman B2C CAC'e girer. */
    costLayers: z
      .array(z.object({ layer: text, scope: text.default(""), cacTreatment: text.default("") }))
      .default([]),
    /** Sabit işletme bütçesi grupları (yıllık). */
    fixedOpexGroups: z
      .array(z.object({ group: text, content: text.default(""), annualAmount: num.default(0) }))
      .default([]),
    /** Kalem → doğru maliyet yeri eşlemesi (ör. chatbot kalemleri). */
    costPlacements: z
      .array(z.object({ item: text, costPlace: text.default("") }))
      .default([]),
    /** Kanal başına ölçülecek metrik tanımı. */
    channelMetrics: z.array(z.object({ channel: text, metric: text.default("") })).default([]),
    /** B2C ürün COGS katmanı (CAC'ten ayrı izlenir). */
    b2cCogs: z
      .array(z.object({ item: text, calculation: text.default(""), layer: text.default("") }))
      .default([]),
    /**
     * Aylık B2C edinim planı (ör. Mart 2028). Ortak maliyetler uygun ücretsiz
     * ebeveyn hedefi payına göre kanallara dağıtılır; kanala atanmış kalemler
     * doğrudan maliyet sayılır. Aynı kalem yalnız bir satırda durur.
     */
    b2cPlan: z
      .object({
        period: text.default(""),
        /** Hedeflenen üst sınır freemium CAC (TL). */
        cacTarget: num.default(0),
        /** Mağaza içi tahsilat komisyonu (%); web tahsilatına uygulanmaz. */
        storeCommissionRate: num.default(0),
        channels: z
          .array(z.object({ channel: text, eligibleTarget: num.default(0) }))
          .default([]),
        poolItems: z
          .array(
            z.object({
              name: text,
              calculation: text.default(""),
              /** Boş = ortak maliyet, dolu = o kanalın doğrudan maliyeti. */
              channel: text.default(""),
              pnlAmount: num.default(0),
              cashAmount: num.default(0),
            }),
          )
          .default([]),
        actuals: z
          .array(
            z.object({
              channel: text,
              actualSpend: num.default(0),
              actualEligible: num.default(0),
              chatbotAssistedCompletion: num.default(0),
            }),
          )
          .default([]),
      })
      .default({}),
  }),
  narrative: z.object({
    notes: z.array(z.object({ text: text })).default([]),
    actions: z.array(z.object({ action: text, owner: text, due: text })).default([]),
  }),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
export type FeasibilityInput = ReportInput["feasibility"];

export const emptyReportInput: ReportInput = reportInputSchema.parse({
  meta: {},
  monthly: [],
  sales: {},
  budget: {},
  workingCapital: {},
  financing: {},
  capex: {},
  forecast: {},
  unitEconomics: [],
  cac: {},
  ltv: {},
  feasibility: {},
  acquisition: {},
  narrative: {},
});

export const emptySpendLedgerRow = {
  name: "",
  bucket: cacBuckets[0],
  amount: 0,
  attributionRate: 100,
  period: "",
  note: "",
};
export const emptyCohortChannelRow = {
  channel: "",
  spend: 0,
  eligibleFreeParents: 0,
  paidParents: 0,
};
export const emptyPerReportCostRow = { name: "", unitCost: 0 };
export const emptyFixedOpsRow = {
  name: "",
  annualAmount: 0,
  productShareRate: 0,
  allocationKey: "",
};
export const emptyCacItemRow = { name: "", channel: "", amount: 0 };
export const emptyCacChannelRow = { channel: "", newLicenses: 0 };
export const emptyCostLayerRow = { layer: "", scope: "", cacTreatment: "" };
export const emptyFixedOpexGroupRow = { group: "", content: "", annualAmount: 0 };
export const emptyCostPlacementRow = { item: "", costPlace: "" };
export const emptyChannelMetricRow = { channel: "", metric: "" };
export const emptyB2cCogsRow = { item: "", calculation: "", layer: "" };
export const emptyPlanChannelRow = { channel: "", eligibleTarget: 0 };
export const emptyPlanPoolItemRow = {
  name: "",
  calculation: "",
  channel: "",
  pnlAmount: 0,
  cashAmount: 0,
};
export const emptyPlanActualRow = {
  channel: "",
  actualSpend: 0,
  actualEligible: 0,
  chatbotAssistedCompletion: 0,
};

export const emptyTierRow = { name: "", unitPrice: 0 };
export const emptyPriceCatalogRow = { name: "", price: 0, unit: "", scope: "" };
export const emptyNonRevenueRow = { name: "", nature: "", condition: "", amount: 0 };
export const emptyRevenueChannelRow = { channel: "", start: "", unit: "", driver: "" };
export const emptyCashCollectionRow = { period: "", pilotCount: 0, pilot: 0, annualCount: 0, annual: 0 };
export const emptyOtherRevenueRow = { name: "", volume: 0, unitPrice: 0, hypothesis: "" };
export const emptyFixedItemRow = { name: "", amount: 0 };
export const emptyFirstYearCostRow = {
  name: "",
  amount: 0,
  rdShareRate: 0,
  amortizationYears: 0,
  note: "",
};


export const emptyMonthlyRow: MonthlyInput = {
  month: "",
  sales: 0,
  budgetSales: 0,
  cogs: 0,
  budgetCogs: 0,
  opex: 0,
  budgetOpex: 0,
  depreciation: 0,
  financialExpense: 0,
  tax: 0,
  operatingCash: 0,
  investingCash: 0,
  financingCash: 0,
  cash: 0,
  receivables: 0,
  inventory: 0,
  payables: 0,
  debt: 0,
};

export const emptyUnitEconomicsRow: UnitEconomicsInput = {
  month: "",
  newCustomers: 0,
  marketingSpend: 0,
  salesSpend: 0,
  arpu: 0,
  churnRate: 0,
  grossMarginRate: 0,
};

/** Kaydedilmiş ham JSON'u güvenli biçimde giriş modeline dönüştürür. */
export function parseReportInput(value: unknown): ReportInput {
  // Kayıt kısmi olabilir (yalnızca bir bölüm doldurulmuş olabilir); eksik
  // bölümler boş varsayılanlarla tamamlanır, böylece girilen veri kaybolmaz.
  const raw = (value ?? {}) as Record<string, unknown>;
  const filled: Record<string, unknown> = { ...raw };
  for (const key of Object.keys(emptyReportInput)) {
    if (filled[key] === undefined || filled[key] === null) {
      filled[key] = (emptyReportInput as Record<string, unknown>)[key];
    }
  }

  const result = reportInputSchema.safeParse(filled);
  return result.success ? result.data : emptyReportInput;
}
