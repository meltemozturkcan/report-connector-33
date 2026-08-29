import type { ReportInput } from "@/lib/report-schema";

/**
 * Hesaplama motoru.
 * Ham girişlerden (satış, maliyet, gider, nakit, bilanço kalemleri, borç, CAPEX,
 * birim ekonomisi) raporun tüm türetilmiş göstergelerini üretir.
 */

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (a: number, b: number) => safeDiv(a, b) * 100;
const round = (v: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export type MonthlyPoint = {
  month: string;
  sales: number;
  budgetSales: number;
  cogs: number;
  opex: number;
  grossProfit: number;
  ebitda: number;
  ebit: number;
  netProfit: number;
  operatingCash: number;
  cash: number;
  receivables: number;
  inventory: number;
  payables: number;
  debt: number;
};

export type MarginPoint = { month: string; gross: number; ebitda: number; net: number };
export type VarianceRow = { item: string; budget: number; actual: number };
export type WorkingCapitalRow = {
  name: string;
  current: number;
  previous: number;
  days: number;
  targetDays: number;
};
export type Scenario = { name: string; sales: number; ebitda: number; netCash: number };

export type ReportModel = ReturnType<typeof computeReport>;

export function computeReport(input: ReportInput) {
  const monthly: MonthlyPoint[] = input.monthly.map((m) => {
    const grossProfit = m.sales - m.cogs;
    const ebitda = grossProfit - m.opex;
    const ebit = ebitda - m.depreciation;
    const netProfit = ebit - m.financialExpense - m.tax;
    return {
      month: m.month,
      sales: m.sales,
      budgetSales: m.budgetSales,
      cogs: m.cogs,
      opex: m.opex,
      grossProfit,
      ebitda,
      ebit,
      netProfit,
      operatingCash: m.operatingCash,
      cash: m.cash,
      receivables: m.receivables,
      inventory: m.inventory,
      payables: m.payables,
      debt: m.debt,
    };
  });

  const hasReportData = monthly.length > 0;
  const last = monthly.length - 1;
  const currentMonth = monthly[last];
  const previousMonth = monthly[last - 1] ?? currentMonth;
  const currentRaw = input.monthly[last];
  const previousRaw = input.monthly[last - 1] ?? currentRaw;

  const margins: MarginPoint[] = monthly.map((m) => ({
    month: m.month,
    gross: round(pct(m.grossProfit, m.sales)),
    ebitda: round(pct(m.ebitda, m.sales)),
    net: round(pct(m.netProfit, m.sales)),
  }));
  const currentMargin = margins[last];
  const previousMargin = margins[last - 1] ?? currentMargin;

  // --- Bütçe – gerçekleşen sapmaları (cari ay) ---
  const budgetVariance: VarianceRow[] = currentRaw
    ? [
        { item: "Net satış", budget: currentRaw.budgetSales, actual: currentRaw.sales },
        { item: "Satışların maliyeti", budget: currentRaw.budgetCogs, actual: currentRaw.cogs },
        {
          item: "Brüt kâr",
          budget: currentRaw.budgetSales - currentRaw.budgetCogs,
          actual: currentRaw.sales - currentRaw.cogs,
        },
        { item: "Faaliyet gideri", budget: currentRaw.budgetOpex, actual: currentRaw.opex },
        {
          item: "FAVÖK",
          budget: currentRaw.budgetSales - currentRaw.budgetCogs - currentRaw.budgetOpex,
          actual: currentMonth ? currentMonth.ebitda : 0,
        },
        {
          item: "Net kâr",
          budget:
            currentRaw.budgetSales -
            currentRaw.budgetCogs -
            currentRaw.budgetOpex -
            currentRaw.depreciation -
            currentRaw.financialExpense -
            currentRaw.tax,
          actual: currentMonth ? currentMonth.netProfit : 0,
        },
      ]
    : [];

  const varianceReasons = input.budget.reasons.map((r) => {
    const row = budgetVariance.find((v) => v.item === r.item);
    return { item: r.item, variance: row ? row.actual - row.budget : 0, reason: r.reason };
  });

  const netProfitVariance =
    budgetVariance.find((r) => r.item === "Net kâr") ?? { item: "Net kâr", budget: 0, actual: 0 };

  // --- Satış kırılımı ---
  const salesBreakdown = {
    byProduct: input.sales.byProduct,
    byRegion: input.sales.byRegion,
    volumePriceEffect: {
      volumeEffect: input.sales.volumeEffect,
      priceEffect: input.sales.priceEffect,
      mixEffect: input.sales.mixEffect,
    },
    topCustomerShare: input.sales.topCustomerShare,
  };

  // --- Nakit akışı ---
  const operating = currentRaw?.operatingCash ?? 0;
  const investing = currentRaw?.investingCash ?? 0;
  const financing = currentRaw?.financingCash ?? 0;
  const closing = currentRaw?.cash ?? 0;
  const opening = closing - operating - investing - financing;
  const cashFlow = {
    opening,
    operating,
    investing,
    financing,
    closing,
    bridge: hasReportData
      ? [
          { name: "Açılış nakdi", value: opening },
          { name: "Faaliyet", value: operating },
          { name: "Yatırım", value: investing },
          { name: "Finansman", value: financing },
          { name: "Kapanış nakdi", value: closing },
        ]
      : [],
  };

  // --- İşletme sermayesi ve nakit döngüsü ---
  const days = 30;
  const dso = (r: number, sales: number) => round(safeDiv(r, sales) * days, 0);
  const workingCapital: WorkingCapitalRow[] = currentRaw
    ? [
        {
          name: "Ticari alacaklar",
          current: currentRaw.receivables,
          previous: previousRaw.receivables,
          days: dso(currentRaw.receivables, currentRaw.sales),
          targetDays: input.workingCapital.targetReceivableDays,
        },
        {
          name: "Stoklar",
          current: currentRaw.inventory,
          previous: previousRaw.inventory,
          days: dso(currentRaw.inventory, currentRaw.cogs),
          targetDays: input.workingCapital.targetInventoryDays,
        },
        {
          name: "Ticari borçlar",
          current: currentRaw.payables,
          previous: previousRaw.payables,
          days: dso(currentRaw.payables, currentRaw.cogs),
          targetDays: input.workingCapital.targetPayableDays,
        },
      ]
    : [];

  const [receivables, inventory, payables] = workingCapital;

  const cashConversionCycle = input.monthly.map((m) => ({
    month: m.month,
    days:
      dso(m.receivables, m.sales) + dso(m.inventory, m.cogs) - dso(m.payables, m.cogs),
  }));

  // --- Finansman borçları ---
  const ttm = input.monthly.slice(-12);
  const ttmEbitda = ttm.reduce(
    (sum, m) => sum + (m.sales - m.cogs - m.opex),
    0,
  );
  const annualisedEbitda = ttm.length > 0 ? safeDiv(ttmEbitda, ttm.length) * 12 : 0;
  const totalDebt = currentRaw?.debt ?? 0;
  const netDebt = totalDebt - (currentRaw?.cash ?? 0);
  const debt = {
    total: totalDebt,
    previous: previousRaw?.debt ?? 0,
    net: netDebt,
    shortTerm: input.financing.shortTerm,
    longTerm: input.financing.longTerm,
    averageRate: input.financing.averageRate,
    netDebtToEbitda: round(safeDiv(netDebt, annualisedEbitda), 2),
    dscr: round(safeDiv(annualisedEbitda, input.financing.annualDebtService), 2),
    annualisedEbitda: round(annualisedEbitda, 0),
    lines: input.financing.lines,
    maturities: input.financing.maturities,
    totalLimit: input.financing.lines.reduce((s, l) => s + l.limit, 0),
    usedLimit: input.financing.lines.reduce((s, l) => s + l.used, 0),
  };

  // --- CAPEX ---
  const ytdActual = input.capex.projects.reduce((s, p) => s + p.actual, 0);
  const capex = {
    annualBudget: input.capex.annualBudget,
    ytdBudget: input.capex.ytdBudget,
    ytdActual,
    monthActual: input.capex.monthActual,
    realisationRate: round(pct(ytdActual, input.capex.ytdBudget)),
    projects: input.capex.projects,
  };

  // --- Yıl sonu tahmini ---
  const ytdSales = monthly.reduce((s, m) => s + m.sales, 0);
  const ytdEbitda = monthly.reduce((s, m) => s + m.ebitda, 0);
  const ytdNetCash = monthly.reduce(
    (s, m, i) => s + m.operatingCash + (input.monthly[i]?.investingCash ?? 0),
    0,
  );
  const remaining = input.forecast.remainingMonths;
  const runRate = (total: number) => safeDiv(total, monthly.length || 1) * remaining;

  const baseSales = round(ytdSales + runRate(ytdSales), 0);
  const baseEbitda = round(ytdEbitda + runRate(ytdEbitda), 0);
  const baseNetCash = round(ytdNetCash + runRate(ytdNetCash), 0);
  const scale = (v: number, deltaPct: number) => round(v * (1 + deltaPct / 100), 0);

  const worstScenario: Scenario = {
    name: "Kötümser",
    sales: scale(baseSales, input.forecast.worstCaseDelta),
    ebitda: scale(baseEbitda, input.forecast.worstCaseDelta),
    netCash: scale(baseNetCash, input.forecast.worstCaseDelta),
  };
  const baseScenario: Scenario = {
    name: "Baz",
    sales: baseSales,
    ebitda: baseEbitda,
    netCash: baseNetCash,
  };
  const bestScenario: Scenario = {
    name: "İyimser",
    sales: scale(baseSales, input.forecast.bestCaseDelta),
    ebitda: scale(baseEbitda, input.forecast.bestCaseDelta),
    netCash: scale(baseNetCash, input.forecast.bestCaseDelta),
  };

  const forecast = {
    scenarios: hasReportData ? [worstScenario, baseScenario, bestScenario] : [],
    budgetFullYear: {
      sales: input.forecast.budgetFullYearSales,
      ebitda: input.forecast.budgetFullYearEbitda,
      netCash: input.forecast.budgetFullYearNetCash,
    },
    drivers: input.forecast.drivers,
    path: monthly.map((m) => ({ month: m.month, sales: m.sales, ebitda: m.ebitda })),
    ytd: { sales: ytdSales, ebitda: ytdEbitda, netCash: ytdNetCash },
  };

  // --- Birim ekonomisi (CAC / LTV) ---
  const unitEconomics = input.unitEconomics.map((u) => {
    const spend = (u.marketingSpend + u.salesSpend) * 1000;
    const cac = round(safeDiv(spend, u.newCustomers), 0);
    const monthlyGrossProfit = u.arpu * (u.grossMarginRate / 100);
    const lifetimeMonths = u.churnRate > 0 ? 100 / u.churnRate : 0;
    const ltv = round(monthlyGrossProfit * lifetimeMonths, 0);
    return {
      month: u.month,
      newCustomers: u.newCustomers,
      marketingSpend: u.marketingSpend,
      salesSpend: u.salesSpend,
      arpu: u.arpu,
      churnRate: u.churnRate,
      grossMarginRate: u.grossMarginRate,
      cac,
      ltv,
      lifetimeMonths: round(lifetimeMonths, 1),
      ltvToCac: round(safeDiv(ltv, cac), 2),
      paybackMonths: round(safeDiv(cac, monthlyGrossProfit), 1),
    };
  });
  const uLast = unitEconomics.length - 1;
  const currentUnitEconomics = unitEconomics[uLast];
  const previousUnitEconomics = unitEconomics[uLast - 1] ?? currentUnitEconomics;

  const channelSpend = input.cac.byChannel.reduce((s, c) => s + c.spend, 0);
  const cacDetail = {
    blendedCac: currentUnitEconomics?.cac ?? 0,
    paybackMonths: currentUnitEconomics?.paybackMonths ?? 0,
    targetPaybackMonths: input.cac.targetPaybackMonths,
    byChannel: input.cac.byChannel.map((c) => ({
      channel: c.channel,
      spend: c.spend,
      newCustomers: c.newCustomers,
      cac: round(safeDiv(c.spend * 1000, c.newCustomers), 0),
      share: round(pct(c.spend, channelSpend)),
    })),
    funnel: input.cac.funnel.map((f, i, arr) => ({
      stage: f.stage,
      count: f.count,
      conversion: i === 0 ? 100 : round(pct(f.count, arr[i - 1]?.count ?? 0)),
    })),
    totalSpend: channelSpend,
  };

  const ltvDetail = {
    currentLtv: currentUnitEconomics?.ltv ?? 0,
    previousLtv: previousUnitEconomics?.ltv ?? 0,
    grossMarginRate: currentUnitEconomics?.grossMarginRate ?? 0,
    averageLifetimeMonths: currentUnitEconomics?.lifetimeMonths ?? 0,
    churnRate: currentUnitEconomics?.churnRate ?? 0,
    ltvToCac: currentUnitEconomics?.ltvToCac ?? 0,
    netRevenueRetention: input.ltv.netRevenueRetention,
    logoRetention: input.ltv.logoRetention,
    cohorts: input.ltv.cohorts,
    bySegment: input.ltv.bySegment.map((s) => {
      const lifetime = s.churnRate > 0 ? 100 / s.churnRate : 0;
      const ltv = round(s.arpu * (s.grossMarginRate / 100) * lifetime, 0);
      return {
        segment: s.segment,
        arpu: s.arpu,
        churnRate: s.churnRate,
        cac: s.cac,
        ltv,
        ltvToCac: round(safeDiv(ltv, s.cac), 2),
      };
    }),
  };

  const narrative = buildNarrative({
    monthly,
    margins,
    cashFlow,
    workingCapital,
    debt,
    netProfitVariance,
    baseScenario,
    forecast,
    unitEconomics,
    notes: input.narrative.notes.map((n) => n.text).filter(Boolean),
    actions: input.narrative.actions,
  });

  return {
    reportMeta: { ...input.meta, isDemoData: false },
    hasReportData,
    monthly,
    currentMonth,
    previousMonth,
    margins,
    currentMargin,
    previousMargin,
    budgetVariance,
    varianceReasons,
    netProfitVariance,
    salesBreakdown,
    cashFlow,
    workingCapital,
    receivables,
    inventory,
    payables,
    cashConversionCycle,
    debt,
    capex,
    forecast,
    baseScenario,
    worstScenario,
    bestScenario,
    unitEconomics,
    currentUnitEconomics,
    previousUnitEconomics,
    cacDetail,
    ltvDetail,
    narrative,
  };
}

type NarrativeArgs = {
  monthly: MonthlyPoint[];
  margins: MarginPoint[];
  cashFlow: { operating: number; closing: number; opening: number };
  workingCapital: WorkingCapitalRow[];
  debt: { total: number; previous: number; net: number; netDebtToEbitda: number; dscr: number };
  netProfitVariance: VarianceRow;
  baseScenario: Scenario;
  forecast: { budgetFullYear: { ebitda: number } };
  unitEconomics: { cac: number; ltv: number; ltvToCac: number; paybackMonths: number }[];
  notes: string[];
  actions: { action: string; owner: string; due: string }[];
};

const fmt = (v: number, digits = 0) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

/** Rakamlar arasındaki bağlantıyı kuran otomatik yorum üretimi. */
function buildNarrative(args: NarrativeArgs) {
  const { monthly, margins, cashFlow, workingCapital, debt, netProfitVariance } = args;
  const where: string[] = [];
  const why: string[] = [];

  if (monthly.length === 0) {
    return { where, why, next: args.actions };
  }

  const cur = monthly[monthly.length - 1]!;
  const prev = monthly[monthly.length - 2] ?? cur;
  const curM = margins[margins.length - 1]!;
  const prevM = margins[margins.length - 2] ?? curM;

  const salesChange = prev.sales === 0 ? 0 : ((cur.sales - prev.sales) / Math.abs(prev.sales)) * 100;
  const salesVsBudget =
    cur.budgetSales === 0 ? 0 : ((cur.sales - cur.budgetSales) / Math.abs(cur.budgetSales)) * 100;

  where.push(
    `Net satış ${fmt(cur.sales)} bin TL; önceki aya göre ${fmt(salesChange, 1)}%, bütçeye göre ${fmt(salesVsBudget, 1)}% sapma var.`,
  );
  where.push(
    `Brüt kâr marjı %${fmt(curM.gross, 1)}, FAVÖK marjı %${fmt(curM.ebitda, 1)}, net kâr marjı %${fmt(curM.net, 1)}.`,
  );
  where.push(
    `Faaliyet nakit akışı ${fmt(cashFlow.operating)} bin TL, dönem sonu nakit ${fmt(cashFlow.closing)} bin TL.`,
  );
  where.push(
    `Net finansal borç ${fmt(debt.net)} bin TL; net borç/FAVÖK ${fmt(debt.netDebtToEbitda, 2)}x, DSCR ${fmt(debt.dscr, 2)}x.`,
  );

  const marginDelta = curM.ebitda - prevM.ebitda;
  if (salesChange > 0 && marginDelta < 0) {
    why.push(
      `Satış ${fmt(salesChange, 1)}% arttı ancak FAVÖK marjı ${fmt(Math.abs(marginDelta), 1)} puan geriledi: büyüme maliyet ve gider artışıyla dengelendi, kârlılığa yansımadı.`,
    );
  } else if (salesChange > 0 && marginDelta >= 0) {
    why.push(
      `Satış artışı ${fmt(salesChange, 1)}% ile birlikte FAVÖK marjı ${fmt(marginDelta, 1)} puan iyileşti; büyüme kârlılığa da yansıdı.`,
    );
  } else if (salesChange <= 0) {
    why.push(
      `Satış ${fmt(salesChange, 1)}% değişti; sabit gider yükü nedeniyle FAVÖK marjı ${fmt(marginDelta, 1)} puan etkilendi.`,
    );
  }

  if (cur.netProfit > 0 && cashFlow.operating < cur.netProfit) {
    const gap = cur.netProfit - cashFlow.operating;
    why.push(
      `Net kâr ${fmt(cur.netProfit)} bin TL olmasına rağmen faaliyet nakdi ${fmt(cashFlow.operating)} bin TL; ${fmt(gap)} bin TL kâr nakde dönüşmedi.`,
    );
  }

  const rec = workingCapital[0];
  const inv = workingCapital[1];
  const pay = workingCapital[2];
  if (rec && inv && pay) {
    const wcDelta =
      rec.current - rec.previous + (inv.current - inv.previous) - (pay.current - pay.previous);
    if (wcDelta > 0) {
      why.push(
        `Nakit işletme sermayesinde bağlandı: alacak ${fmt(rec.current - rec.previous)}, stok ${fmt(inv.current - inv.previous)} bin TL arttı; ticari borç değişimi ${fmt(pay.current - pay.previous)} bin TL. Net etki ${fmt(wcDelta)} bin TL nakit çıkışı.`,
      );
    } else {
      why.push(
        `İşletme sermayesi ${fmt(Math.abs(wcDelta))} bin TL nakit yarattı; alacak ${rec.days} gün, stok ${inv.days} gün, ticari borç ${pay.days} gün seviyesinde.`,
      );
    }
  }

  const debtDelta = debt.total - debt.previous;
  if (debtDelta > 0) {
    why.push(
      `Nakit açığı ${fmt(debtDelta)} bin TL ilave borçlanmayla kapatıldı; geri ödeme kapasitesi DSCR ${fmt(debt.dscr, 2)}x ve net borç/FAVÖK ${fmt(debt.netDebtToEbitda, 2)}x ile izlenmelidir.`,
    );
  } else if (debtDelta < 0) {
    why.push(`Finansal borç ${fmt(Math.abs(debtDelta))} bin TL azaldı; kaldıraç geriliyor.`);
  }

  const npVariance = netProfitVariance.actual - netProfitVariance.budget;
  if (npVariance !== 0) {
    why.push(
      `Net kârda bütçeye göre ${fmt(npVariance)} bin TL sapma var; bu sapma yıl sonu FAVÖK tahminini baz senaryoda ${fmt(args.baseScenario.ebitda)} bin TL seviyesine taşıyor (bütçe ${fmt(args.forecast.budgetFullYear.ebitda)} bin TL).`,
    );
  }

  const ue = args.unitEconomics[args.unitEconomics.length - 1];
  if (ue && ue.cac > 0) {
    why.push(
      `Birim ekonomisi: CAC ${fmt(ue.cac)} TL, LTV ${fmt(ue.ltv)} TL, LTV/CAC ${fmt(ue.ltvToCac, 2)}x, geri ödeme ${fmt(ue.paybackMonths, 1)} ay.`,
    );
  }

  return { where: [...where, ...args.notes], why, next: args.actions };
}
