/**
 * Rapor veri seti.
 * Demo veriler temizlendi — gerçek muhasebe kayıtları bu yapıya göre doldurulmalıdır.
 * Tüm tutarlar bin TL cinsindendir.
 */

export const reportMeta = {
  company: "",
  period: "",
  previousPeriod: "",
  currencyNote: "Tutarlar bin TL",
  isDemoData: false,
};

export type Trend = "up" | "down" | "flat";

export type MonthlyPoint = {
  month: string;
  sales: number;
  budgetSales: number;
  grossProfit: number;
  ebitda: number;
  netProfit: number;
  operatingCash: number;
};

export const monthly: MonthlyPoint[] = [];

export const salesBreakdown = {
  byProduct: [] as { name: string; current: number; previous: number; budget: number }[],
  byRegion: [] as { name: string; current: number; previous: number }[],
  volumePriceEffect: {
    volumeEffect: 0,
    priceEffect: 0,
    mixEffect: 0,
  },
  topCustomerShare: 0,
};

export type VarianceRow = { item: string; budget: number; actual: number };
export const budgetVariance: VarianceRow[] = [];

export const varianceReasons: { item: string; variance: number; reason: string }[] = [];

export type MarginPoint = { month: string; gross: number; ebitda: number; net: number };
export const margins: MarginPoint[] = [];

export const cashFlow = {
  opening: 0,
  operating: 0,
  investing: 0,
  financing: 0,
  closing: 0,
  bridge: [] as { name: string; value: number }[],
};

export type WorkingCapitalRow = {
  name: string;
  current: number;
  previous: number;
  days: number;
  targetDays: number;
};
export const workingCapital: WorkingCapitalRow[] = [];

export const cashConversionCycle: { month: string; days: number }[] = [];

export const debt = {
  total: 0,
  previous: 0,
  net: 0,
  shortTerm: 0,
  longTerm: 0,
  averageRate: 0,
  netDebtToEbitda: 0,
  dscr: 0,
  lines: [] as { bank: string; limit: number; used: number }[],
  maturities: [] as { period: string; amount: number }[],
};

export const capex = {
  annualBudget: 0,
  ytdBudget: 0,
  ytdActual: 0,
  monthActual: 0,
  projects: [] as { name: string; budget: number; actual: number; status: string }[],
};

export type Scenario = { name: string; sales: number; ebitda: number; netCash: number };
export const forecast = {
  scenarios: [] as Scenario[],
  budgetFullYear: { sales: 0, ebitda: 0, netCash: 0 },
  drivers: [] as { name: string; impact: string; note: string }[],
  path: [] as { month: string; sales: number; ebitda: number }[],
};

export const narrative = {
  where: [] as string[],
  why: [] as string[],
  next: [] as { action: string; owner: string; due: string }[],
};

/** Rapor verisi girilmiş mi? */
export const hasReportData = monthly.length > 0;

/** Türetilmiş kısayollar (indeks erişimini tek noktada toplar). */
export const currentMonth = monthly[monthly.length - 1] as MonthlyPoint;
export const previousMonth = monthly[monthly.length - 2] as MonthlyPoint;

export const currentMargin = margins[margins.length - 1] as MarginPoint;
export const previousMargin = margins[margins.length - 2] as MarginPoint;

export const netProfitVariance = budgetVariance.find((r) => r.item === "Net kâr") as VarianceRow;

export const receivables = workingCapital[0] as WorkingCapitalRow;
export const inventory = workingCapital[1] as WorkingCapitalRow;
export const payables = workingCapital[2] as WorkingCapitalRow;

export const baseScenario = forecast.scenarios[1] as Scenario;
export const worstScenario = forecast.scenarios[0] as Scenario;
export const bestScenario = forecast.scenarios[2] as Scenario;

/** Girişim (startup) birim ekonomisi — CAC ve LTV. Tutarlar TL / müşteri bazındadır. */
export type UnitEconomicsPoint = {
  month: string;
  newCustomers: number;
  marketingSpend: number; // bin TL
  salesSpend: number; // bin TL
  cac: number; // TL
  ltv: number; // TL
  churnRate: number; // %
  arpu: number; // TL / ay
};

export const unitEconomics: UnitEconomicsPoint[] = [];

export const cacDetail = {
  paybackMonths: 0,
  targetPaybackMonths: 0,
  blendedCac: 0,
  paidCac: 0,
  organicCac: 0,
  byChannel: [] as { channel: string; spend: number; newCustomers: number; cac: number; share: number }[],
  funnel: [] as { stage: string; count: number }[],
};

export const ltvDetail = {
  currentLtv: 0,
  previousLtv: 0,
  grossMarginRate: 0,
  averageLifetimeMonths: 0,
  netRevenueRetention: 0,
  logoRetention: 0,
  cohorts: [] as { cohort: string; month12Retention: number; ltv: number }[],
  bySegment: [] as { segment: string; ltv: number; cac: number; churnRate: number }[],
};

export const currentUnitEconomics = unitEconomics[unitEconomics.length - 1] as UnitEconomicsPoint;
export const previousUnitEconomics = unitEconomics[unitEconomics.length - 2] as UnitEconomicsPoint;
