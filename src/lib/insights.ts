import type { ReportModel } from "@/lib/report-calc";

/**
 * Rapor sayfalarındaki yorum kutuları.
 *
 * Önceki sürümde yorumlar sabit cümlelerdi ("büyümenin büyük bölümü fiyat
 * artışından geliyor", "faaliyet nakdi negatife döndü", "kurumsal segment en
 * yüksek oran" gibi); rakamlar değişse de sonuç cümlesi aynı kalıyordu. Burada
 * her cümle girilen verinin yönüne göre kurulur. Veri yetersizse bunu söyler.
 */

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const pctChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

const signed = (value: number, digits = 0) => `${value > 0 ? "+" : ""}${fmt(value, digits)}`;

/** Satış arttıysa kârlılığa ne oldu? */
export function salesProfitInsight(model: ReportModel): string {
  if (model.monthly.length < 2) {
    return "Karşılaştırma için en az iki aylık veri gerekli.";
  }
  const cur = model.currentMonth;
  const prev = model.previousMonth;
  const salesPct = pctChange(cur.sales, prev.sales);
  const grossDelta = model.currentMargin.gross - model.previousMargin.gross;
  const ebitdaDelta = cur.ebitda - prev.ebitda;

  const direction =
    salesPct === null
      ? "değişti"
      : salesPct > 0
        ? `%${fmt(salesPct, 1)} arttı`
        : salesPct < 0
          ? `%${fmt(Math.abs(salesPct), 1)} azaldı`
          : "değişmedi";

  const effects = model.salesBreakdown.volumePriceEffect;
  const sources = [
    { name: "hacim", value: effects.volumeEffect },
    { name: "fiyat", value: effects.priceEffect },
    { name: "ürün karması", value: effects.mixEffect },
  ].filter((row) => row.value !== 0);
  const leader = [...sources].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  const sourceText = leader
    ? ` Değişimin en büyük kaynağı ${leader.name} etkisi (${signed(leader.value)}).`
    : " Hacim / fiyat / karma etkisi girilmediği için kaynağı ayrıştırılamıyor.";

  const marginText =
    Math.abs(grossDelta) < 0.05
      ? `Brüt marj %${fmt(model.currentMargin.gross, 1)} ile yatay kaldı`
      : `Brüt marj %${fmt(model.previousMargin.gross, 1)} seviyesinden %${fmt(model.currentMargin.gross, 1)} seviyesine ${grossDelta > 0 ? "yükseldi" : "geriledi"}`;

  const ebitdaText =
    ebitdaDelta === 0
      ? "FAVÖK değişmedi"
      : `FAVÖK ${fmt(Math.abs(ebitdaDelta))} ${ebitdaDelta > 0 ? "arttı" : "azaldı"}`;

  const verdict =
    salesPct !== null && salesPct > 0 && ebitdaDelta < 0
      ? " Büyüme kârlılığa yansımadı: maliyet ve gider satıştan hızlı arttı."
      : salesPct !== null && salesPct > 0 && ebitdaDelta > 0
        ? " Büyüme kârlılığa da yansıdı."
        : salesPct !== null && salesPct < 0 && ebitdaDelta < 0
          ? " Satış kaybı kâra doğrudan yansıdı; sabit gider yükü kontrol edilmeli."
          : "";

  return `Satış önceki aya göre ${direction}.${sourceText} ${marginText}; ${ebitdaText}.${verdict}`;
}

/** Kâr arttıysa nakde yansıdı mı? */
export function profitToCashInsight(model: ReportModel): string {
  const cur = model.currentMonth;
  const operating = model.cashFlow.operating;
  if (cur.ebitda <= 0) {
    return `FAVÖK ${fmt(cur.ebitda)} (sıfır veya negatif); faaliyet nakit akışı ${fmt(operating)}. Kârın nakde dönüşümünden önce FAVÖK'ün pozitife dönmesi gerekiyor.`;
  }
  const conversion = (operating / cur.ebitda) * 100;
  if (conversion >= 80) {
    return `Evet. FAVÖK ${fmt(cur.ebitda)}, faaliyet nakit akışı ${fmt(operating)}: kârın %${fmt(conversion, 0)}'i nakde döndü.`;
  }
  const gap = cur.ebitda - operating;
  return `Kısmen. FAVÖK ${fmt(cur.ebitda)} iken faaliyet nakit akışı ${fmt(operating)}; nakde dönüşüm %${fmt(conversion, 0)}. Aradaki ${fmt(gap)} büyük olasılıkla işletme sermayesi, vergi veya faiz ödemelerinde bağlandı — ayrıntı Nakit sayfasında.`;
}

/** Nakit azaldıysa nerede bağlandı? */
export function cashTiedInsight(model: ReportModel): string {
  const [rec, inv, pay] = [model.receivables, model.inventory, model.payables];
  if (!rec || !inv || !pay) return "İşletme sermayesi verisi yok.";
  const recDelta = rec.current - rec.previous;
  const invDelta = inv.current - inv.previous;
  const payDelta = pay.current - pay.previous;
  const wcDelta = recDelta + invDelta - payDelta;
  const cashChange = model.cashFlow.closing - model.cashFlow.opening;

  const parts = [
    `alacaklar ${signed(recDelta)}`,
    `stoklar ${signed(invDelta)}`,
    `ticari borçlar ${signed(payDelta)}`,
  ].join(", ");

  if (wcDelta > 0) {
    const biggest = [
      { name: "alacak", value: recDelta },
      { name: "stok", value: invDelta },
      { name: "ticari borç azalışı", value: -payDelta },
    ].sort((a, b) => b.value - a.value)[0];
    return `Dönemde nakit ${signed(cashChange)} değişti. İşletme sermayesi ${fmt(wcDelta)} nakit bağladı (${parts}); en büyük pay ${biggest?.name ?? "—"} kaleminde. Yatırım ${fmt(model.cashFlow.investing)}, finansman ${fmt(model.cashFlow.financing)}.`;
  }
  return `Dönemde nakit ${signed(cashChange)} değişti. İşletme sermayesi nakit bağlamadı, ${fmt(Math.abs(wcDelta))} serbest bıraktı (${parts}). Nakit değişimi faaliyet ${fmt(model.cashFlow.operating)}, yatırım ${fmt(model.cashFlow.investing)} ve finansman ${fmt(model.cashFlow.financing)} hareketlerinden geliyor.`;
}

/** Bütçeden sapıldıysa yıl sonu tahmini ne olacak? */
export function budgetInsight(model: ReportModel): string {
  const np = model.netProfitVariance;
  const variance = np.actual - np.budget;
  const npText =
    np.budget === 0
      ? `Net kâr ${fmt(np.actual)}; bu ay için bütçe girilmediğinden sapma oranı hesaplanamıyor.`
      : `Net kâr bütçeye göre ${signed(variance)} (${signed((variance / Math.abs(np.budget)) * 100, 1)}%) saptı.`;

  const worst = [...model.budgetVariance]
    .filter((row) => row.item !== "Net kâr" && row.item !== "Brüt kâr" && row.item !== "FAVÖK")
    .map((row) => ({
      item: row.item,
      // Maliyet ve gider kalemlerinde bütçenin üstü olumsuzdur.
      impact: row.item === "Net satış" ? row.actual - row.budget : row.budget - row.actual,
    }))
    .sort((a, b) => a.impact - b.impact)[0];
  const driverText =
    worst && worst.impact < 0
      ? ` Kârı en çok aşağı çeken kalem: ${worst.item} (${fmt(worst.impact)}).`
      : "";

  const fy = model.forecast;
  const forecastText =
    fy.remainingMonths > 0 && fy.budgetFullYear.ebitda !== 0
      ? ` Mevcut gidişle yıl sonu FAVÖK ${fmt(model.baseScenario.ebitda)}, bütçe ${fmt(fy.budgetFullYear.ebitda)}; fark ${signed(model.baseScenario.ebitda - fy.budgetFullYear.ebitda)}.`
      : " Yıl sonu tahmini için Veri Girişi → Projeksiyon sekmesinde kalan ay sayısını girin.";

  return `${npText}${driverText}${forecastText}`;
}

/** Borç arttıysa geri ödeme kapasitesi nasıl değişti? */
export function debtInsight(model: ReportModel): string {
  const debt = model.debt;
  const delta = debt.total - debt.previous;
  const deltaText =
    delta > 0
      ? `Finansal borç ${fmt(delta)} arttı`
      : delta < 0
        ? `Finansal borç ${fmt(Math.abs(delta))} azaldı`
        : "Finansal borç değişmedi";

  const capacity = !debt.leverageMeasurable
    ? "FAVÖK sıfır veya negatif olduğu için borç faaliyetten ödenemiyor; geri ödeme nakit rezervi ya da yeni finansmana bağlı."
    : `Net borç / FAVÖK ${fmt(debt.netDebtToEbitda, 2)}x (${debt.netDebtToEbitda > 3 ? "3,0x eşiğinin üstünde" : "3,0x eşiğinin altında"})${
        debt.dscrMeasurable
          ? `, DSCR ${fmt(debt.dscr, 2)}x (${debt.dscr >= 1.3 ? "1,30 hedefini karşılıyor" : "1,30 hedefinin altında"})`
          : ""
      }.`;

  const cause =
    delta > 0
      ? model.cashFlow.operating < 0
        ? ` Faaliyet nakit akışı ${fmt(model.cashFlow.operating)}; borç artışı faaliyet açığını finanse ediyor.`
        : model.cashFlow.investing < 0
          ? ` Dönemde ${fmt(Math.abs(model.cashFlow.investing))} yatırım nakit çıkışı var; borç artışı yatırımla ilişkili olabilir.`
          : ""
      : "";

  const nearMaturity = (debt.maturities[0]?.amount ?? 0) + (debt.maturities[1]?.amount ?? 0);
  const maturityText =
    nearMaturity > 0 ? ` İlk iki vade diliminde ${fmt(nearMaturity)} ödeme var.` : "";

  return `${deltaText}. ${capacity}${cause}${maturityText}`;
}

/** Tek paragraflık yönetici özeti zinciri: satış → kâr → nakit → borç → yıl sonu. */
export function executiveChain(model: ReportModel): string {
  if (model.monthly.length < 2) {
    return "Zincir yorumu için en az iki aylık veri gerekli.";
  }
  const cur = model.currentMonth;
  const prev = model.previousMonth;
  const salesUp = cur.sales > prev.sales;
  const profitUp = cur.ebitda > prev.ebitda;
  const cashOk = cur.ebitda > 0 && model.cashFlow.operating >= cur.ebitda * 0.8;
  const debtUp = model.debt.total > model.debt.previous;
  const wcDelta =
    model.workingCapital.length === 3
      ? model.workingCapital[0]!.current -
        model.workingCapital[0]!.previous +
        (model.workingCapital[1]!.current - model.workingCapital[1]!.previous) -
        (model.workingCapital[2]!.current - model.workingCapital[2]!.previous)
      : 0;

  const steps = [
    salesUp ? "satış arttı" : "satış artmadı",
    salesUp === profitUp
      ? profitUp
        ? "kâr da arttı"
        : "kâr da artmadı"
      : profitUp
        ? "buna rağmen kâr arttı"
        : "kâr artmadı",
    cashOk
      ? "kâr nakde döndü"
      : wcDelta > 0
        ? "kâr nakde dönmedi, işletme sermayesinde bağlandı"
        : "kâr nakde tam dönmedi",
    debtUp
      ? model.debt.leverageMeasurable && model.debt.netDebtToEbitda <= 3
        ? "borç arttı ama kaldıraç eşiğin altında"
        : "borç arttı, geri ödeme kapasitesi baskı altında"
      : "borç artmadı",
  ];
  const budgetGap = model.baseScenario.ebitda - model.forecast.budgetFullYear.ebitda;
  const tail =
    model.forecast.remainingMonths > 0 && model.forecast.budgetFullYear.ebitda !== 0
      ? ` Bu gidişle yıl sonu FAVÖK bütçenin ${fmt(Math.abs(budgetGap))} bin TL ${budgetGap >= 0 ? "üstünde" : "altında"} kapanır.`
      : "";
  const sentence = steps.join("; ");
  return `Kısaca: ${sentence.charAt(0).toLocaleUpperCase("tr-TR")}${sentence.slice(1)}.${tail}`;
}

/** Harcama arttıysa kazanım verimi ne oldu? */
export function cacTrendInsight(model: ReportModel): string {
  const rows = model.unitEconomics;
  if (rows.length < 2) return "CAC eğilimi için en az iki aylık birim ekonomisi verisi gerekli.";
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const cacPct = pctChange(last.cac, first.cac);
  const customerPct = pctChange(last.newCustomers, first.newCustomers);
  const spend = last.marketingSpend + last.salesSpend;
  const firstSpend = first.marketingSpend + first.salesSpend;
  const period = `${rows.length} ayda (${first.month} → ${last.month})`;

  if (cacPct === null || customerPct === null) {
    return `Son ay kazanım harcaması ${fmt(spend)} bin TL, CAC ${fmt(last.cac)} TL.`;
  }
  const verdict =
    cacPct > 5 && customerPct > 0
      ? "Yeni müşteri artıyor ama her ek müşteri daha pahalıya geliyor: büyüme ölçeklenmiyor."
      : cacPct > 5
        ? "Hem müşteri başına maliyet arttı hem kazanım hacmi büyümedi: kanal verimi düşüyor."
        : cacPct < -5
          ? "Müşteri başına maliyet düştü: kazanım verimi iyileşiyor."
          : "Müşteri başına maliyet yatay.";
  return `Kazanım harcaması ${fmt(firstSpend)} → ${fmt(spend)} bin TL; ${period} CAC ${signed(cacPct, 1)}%, yeni müşteri ${signed(customerPct, 1)}% değişti. ${verdict}`;
}

/** LTV neden değişiyor? */
export function ltvTrendInsight(model: ReportModel): string {
  const cur = model.currentUnitEconomics;
  const prev = model.previousUnitEconomics;
  if (!cur || !prev || model.unitEconomics.length < 2) {
    return "LTV eğilimi için en az iki aylık birim ekonomisi verisi gerekli.";
  }
  const ltvDelta = cur.ltv - prev.ltv;
  const arpuDelta = cur.arpu - prev.arpu;
  const churnDelta = cur.churnRate - prev.churnRate;
  const marginDelta = cur.grossMarginRate - prev.grossMarginRate;
  const drivers = [
    arpuDelta !== 0 ? `ARPU ${signed(arpuDelta)} TL` : null,
    churnDelta !== 0 ? `churn ${signed(churnDelta, 1)} puan` : null,
    marginDelta !== 0 ? `brüt marj ${signed(marginDelta, 1)} puan` : null,
  ].filter(Boolean);
  const direction = ltvDelta > 0 ? "yükseldi" : ltvDelta < 0 ? "geriledi" : "değişmedi";
  const main =
    churnDelta > 0 && ltvDelta < 0
      ? " Ana neden churn artışı: ortalama ömür kısalıyor."
      : churnDelta < 0 && ltvDelta > 0
        ? " Churn düşüşü ortalama ömrü uzattı."
        : "";
  return `LTV önceki aya göre ${signed(ltvDelta)} TL ${direction}${drivers.length ? ` (${drivers.join(", ")})` : ""}.${main}`;
}

/** Hangi segment sürdürülebilir? */
export function segmentInsight(model: ReportModel): string {
  const segments = model.ltvDetail.bySegment.filter((row) => row.cac > 0 && row.ltv > 0);
  if (segments.length === 0)
    return "Segment bazlı ARPU, churn, brüt marj ve CAC girildiğinde karşılaştırma burada görünür.";
  const sorted = [...segments].sort((a, b) => b.ltvToCac - a.ltvToCac);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  const below = segments.filter((row) => row.ltvToCac < 3).map((row) => row.segment);
  const belowText = below.length
    ? ` 3,0x hedefinin altındaki segmentler: ${below.join(", ")}.`
    : " Tüm segmentler 3,0x hedefinin üzerinde.";
  return sorted.length === 1
    ? `${best.segment} LTV/CAC ${fmt(best.ltvToCac, 1)}x.${belowText}`
    : `En yüksek LTV/CAC ${best.segment} (${fmt(best.ltvToCac, 1)}x), en düşük ${worst.segment} (${fmt(worst.ltvToCac, 1)}x). Kazanım bütçesini oranı yüksek segmente kaydırmak karma oranı yükseltir.${belowText}`;
}

/** Kohortlar eskileri kadar uzun kalıyor mu? */
export function cohortInsight(model: ReportModel): string {
  const cohorts = model.ltvDetail.cohorts;
  if (cohorts.length < 2) return "Kohort karşılaştırması için en az iki kohort gerekli.";
  const first = cohorts[0]!;
  const last = cohorts[cohorts.length - 1]!;
  const delta = last.month12Retention - first.month12Retention;
  return `12. ay elde tutma ${first.cohort} kohortunda %${fmt(first.month12Retention, 1)}, ${last.cohort} kohortunda %${fmt(last.month12Retention, 1)} (${signed(delta, 1)} puan). ${
    delta < 0
      ? "Yeni kohortlar daha hızlı ayrılıyor: kazanım kalitesi düşüyor olabilir."
      : delta > 0
        ? "Yeni kohortlar daha uzun kalıyor: kazanım kalitesi iyileşiyor."
        : "Kohort kalitesi yatay."
  }`;
}
