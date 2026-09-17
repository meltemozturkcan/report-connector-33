import type { ReportModel } from "@/lib/report-calc";

/**
 * Otomatik yorum metinleri.
 *
 * Her fonksiyon verinin yönüne göre cümle üretir; sabit metin yazılmaz.
 * Veri yoksa ya da bölünen sıfırsa "ölçülmedi" cümlesi döner; hiçbir durumda
 * NaN / Infinity / undefined üretilmez.
 */

const isNum = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(isNum(value) ? value : 0);

const pctChange = (current: number, previous: number) =>
  previous === 0 || !isNum(previous) || !isNum(current)
    ? 0
    : ((current - previous) / Math.abs(previous)) * 100;

const NO_DATA = "Bu bölüm için yeterli veri girilmedi.";

const twoMonths = (model: ReportModel) => {
  const list = model.monthly;
  if (list.length === 0) return null;
  const current = list[list.length - 1]!;
  const previous = list[list.length - 2] ?? current;
  const currentMargin = model.margins[model.margins.length - 1]!;
  const previousMargin = model.margins[model.margins.length - 2] ?? currentMargin;
  return { current, previous, currentMargin, previousMargin };
};

/** Satış hareketi kârlılığa yansıdı mı? */
export function salesProfitInsight(model: ReportModel): string {
  const points = twoMonths(model);
  if (!points) return NO_DATA;
  const { current, previous, currentMargin, previousMargin } = points;
  const change = pctChange(current.sales, previous.sales);
  const marginDelta = currentMargin.ebitda - previousMargin.ebitda;
  const effects = `fiyat etkisi %${fmt(model.salesBreakdown.volumePriceEffect.priceEffect, 1)}, hacim etkisi %${fmt(model.salesBreakdown.volumePriceEffect.volumeEffect, 1)}, karma etkisi %${fmt(model.salesBreakdown.volumePriceEffect.mixEffect, 1)}`;

  if (change > 0) {
    const head = `Net satış %${fmt(change, 1)} arttı (${effects}).`;
    return marginDelta < 0
      ? `${head} FAVÖK marjı ${fmt(Math.abs(marginDelta), 1)} puan geriledi: büyüme kârlılığa yansımadı.`
      : `${head} FAVÖK marjı ${fmt(marginDelta, 1)} puan iyileşti; büyüme kârlılığa da geçti.`;
  }
  if (change < 0) {
    return `Net satış %${fmt(Math.abs(change), 1)} azaldı (${effects}). FAVÖK marjı ${fmt(marginDelta, 1)} puan değişti.`;
  }
  return `Net satış önceki aya göre yatay (${effects}). FAVÖK marjı ${fmt(marginDelta, 1)} puan değişti.`;
}

/** Kâr nakde döndü mü? */
export function profitToCashInsight(model: ReportModel): string {
  const points = twoMonths(model);
  if (!points) return NO_DATA;
  const netProfit = points.current.netProfit;
  const operating = model.cashFlow.operating;
  const gap = netProfit - operating;
  if (gap > 0) {
    return `Net kâr ${fmt(netProfit)} bin TL, faaliyet nakdi ${fmt(operating)} bin TL: ${fmt(gap)} bin TL kâr henüz nakde dönmedi.`;
  }
  if (gap < 0) {
    return `Faaliyet nakdi ${fmt(operating)} bin TL, net kârın ${fmt(Math.abs(gap))} bin TL üzerinde; tahsilat ve işletme sermayesi kâra destek verdi.`;
  }
  return `Net kâr ${fmt(netProfit)} bin TL ile faaliyet nakdi aynı seviyede.`;
}

/** Nakit işletme sermayesinde bağlandı mı, serbest mi kaldı? */
export function cashTiedInsight(model: ReportModel): string {
  const [rec, inv, pay] = model.workingCapital;
  if (!rec || !inv || !pay) return NO_DATA;
  const delta =
    rec.current - rec.previous + (inv.current - inv.previous) - (pay.current - pay.previous);
  const detail = `alacak ${rec.days} gün (hedef ${rec.targetDays}), stok ${inv.days} gün (hedef ${inv.targetDays}), ticari borç ${pay.days} gün (hedef ${pay.targetDays})`;
  if (delta > 0) {
    return `Nakit işletme sermayesinde bağlandı: net etki ${fmt(delta)} bin TL çıkış; ${detail}.`;
  }
  if (delta < 0) {
    return `İşletme sermayesi ${fmt(Math.abs(delta))} bin TL nakit serbest bıraktı; ${detail}.`;
  }
  return `İşletme sermayesi nakit dengesini değiştirmedi; ${detail}.`;
}

/** Bütçe sapması nereden geliyor? */
export function budgetInsight(model: ReportModel): string {
  if (model.budgetVariance.length === 0) return NO_DATA;
  const sales = model.budgetVariance.find((row) => row.item === "Net satış");
  const ebitda = model.budgetVariance.find((row) => row.item === "FAVÖK");
  if (!sales || !ebitda) return NO_DATA;
  const salesGap = sales.actual - sales.budget;
  const ebitdaGap = ebitda.actual - ebitda.budget;
  const direction = (value: number) => (value >= 0 ? "üzerinde" : "altında");
  const reasons = model.varianceReasons
    .filter((row) => row.reason.trim())
    .map((row) => `${row.item}: ${row.reason}`);
  const head = `Net satış bütçenin ${fmt(Math.abs(salesGap))} bin TL ${direction(salesGap)}, FAVÖK ${fmt(Math.abs(ebitdaGap))} bin TL ${direction(ebitdaGap)}.`;
  return reasons.length > 0 ? `${head} Gerekçeler — ${reasons.join("; ")}.` : head;
}

/** Borç ve geri ödeme kapasitesi. */
export function debtInsight(model: ReportModel): string {
  if (!model.hasReportData) return NO_DATA;
  const debt = model.debt;
  const leverage = debt.leverageMeasurable
    ? `net borç/FAVÖK ${fmt(debt.netDebtToEbitda, 2)}x`
    : "net borç/FAVÖK ölçülemiyor (yıllıklandırılmış FAVÖK sıfır veya negatif)";
  const dscr = debt.dscrMeasurable
    ? `DSCR ${fmt(debt.dscr, 2)}x`
    : "DSCR ölçülemiyor (FAVÖK veya borç servisi girilmedi)";
  const delta = debt.total - debt.previous;
  const move =
    delta > 0
      ? `Finansal borç ${fmt(delta)} bin TL arttı`
      : delta < 0
        ? `Finansal borç ${fmt(Math.abs(delta))} bin TL azaldı`
        : "Finansal borç yatay";
  return `${move}; net borç ${fmt(debt.net)} bin TL, ${leverage}, ${dscr}.`;
}

/** "Neredeyiz? Neden buradayız? Ne yapacağız?" zinciri tek cümlede. */
export function executiveChain(model: ReportModel): string {
  if (!model.hasReportData) return NO_DATA;
  const margin = model.currentMargin;
  const scenario = model.baseScenario;
  return `Neredeyiz: FAVÖK marjı %${fmt(margin.ebitda, 1)}, net kâr marjı %${fmt(margin.net, 1)}, dönem sonu nakit ${fmt(model.cashFlow.closing)} bin TL. Neden: ${salesProfitInsight(model)} ${cashTiedInsight(model)} Ne yapacağız: baz senaryoda yıl sonu satış ${fmt(scenario.sales)} bin TL, FAVÖK ${fmt(scenario.ebitda)} bin TL; ${model.narrative.next.length} aksiyon takip ediliyor.`;
}

/** CAC eğilimi. */
export function cacTrendInsight(model: ReportModel): string {
  const current = model.currentUnitEconomics;
  const previous = model.previousUnitEconomics;
  if (!current || current.cac === 0) {
    return "Müşteri kazanım maliyeti ölçülmedi — yeni müşteri adedi ve pazarlama/satış harcaması girilmeli.";
  }
  const change = pctChange(current.cac, previous?.cac ?? current.cac);
  const direction = change > 0 ? "arttı" : change < 0 ? "azaldı" : "yatay";
  const payback = current.paybackMonths > 0 ? `${fmt(current.paybackMonths, 1)} ay` : "ölçülmedi";
  return `CAC ${fmt(current.cac)} TL; önceki döneme göre %${fmt(Math.abs(change), 1)} ${direction}. Geri ödeme ${payback}, hedef ${fmt(model.cacDetail.targetPaybackMonths, 1)} ay.`;
}

/** LTV eğilimi. */
export function ltvTrendInsight(model: ReportModel): string {
  const ltv = model.ltvDetail;
  if (ltv.currentLtv === 0) {
    return "LTV ölçülmedi — ARPU, brüt marj ve kayıp oranı girilmeli.";
  }
  const change = pctChange(ltv.currentLtv, ltv.previousLtv || ltv.currentLtv);
  const direction = change > 0 ? "arttı" : change < 0 ? "geriledi" : "yatay";
  const ratio = ltv.ltvToCac > 0 ? `${fmt(ltv.ltvToCac, 2)}x` : "ölçülmedi";
  return `LTV ${fmt(ltv.currentLtv)} TL, önceki döneme göre %${fmt(Math.abs(change), 1)} ${direction}. Ortalama ömür ${fmt(ltv.averageLifetimeMonths, 1)} ay, kayıp oranı %${fmt(ltv.churnRate, 1)}, LTV/CAC ${ratio}.`;
}

/** Segment bazlı birim ekonomi. */
export function segmentInsight(model: ReportModel): string {
  const segments = model.ltvDetail.bySegment.filter((row) => row.segment.trim());
  if (segments.length === 0) {
    return "Segment bazlı birim ekonomi girilmedi.";
  }
  const sorted = [...segments].sort((a, b) => b.ltvToCac - a.ltvToCac);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  if (segments.length === 1) {
    return `${best.segment} segmentinde LTV ${fmt(best.ltv)} TL, CAC ${fmt(best.cac)} TL, LTV/CAC ${fmt(best.ltvToCac, 2)}x.`;
  }
  return `En verimli segment ${best.segment} (LTV/CAC ${fmt(best.ltvToCac, 2)}x), en zayıf segment ${worst.segment} (${fmt(worst.ltvToCac, 2)}x); bütçe farkı bu iki segment arasında yönetilmeli.`;
}

/** Cohort kalitesi. */
export function cohortInsight(model: ReportModel): string {
  const cohorts = model.ltvDetail.cohorts.filter((row) => row.cohort.trim());
  if (cohorts.length < 2) {
    return "Cohort karşılaştırması için en az iki dönem girilmeli.";
  }
  const first = cohorts[0]!;
  const last = cohorts[cohorts.length - 1]!;
  const retentionDelta = last.month12Retention - first.month12Retention;
  const ltvChange = pctChange(last.ltv, first.ltv);
  const quality =
    retentionDelta < 0
      ? "yeni cohort'lar daha hızlı kaybediliyor; kazanım kalitesi düşüyor"
      : retentionDelta > 0
        ? "yeni cohort'lar daha iyi tutuluyor; kazanım kalitesi iyileşiyor"
        : "cohort tutundurması yatay";
  return `${first.cohort} → ${last.cohort}: 12. ay tutundurma ${fmt(retentionDelta, 1)} puan, LTV %${fmt(ltvChange, 1)} değişti — ${quality}.`;
}
