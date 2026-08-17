/**
 * DEMO DATA — örnek amaçlı üretilmiş sayısal veri seti.
 * Gerçek muhasebe kayıtlarıyla değiştirilmelidir.
 * Tüm tutarlar bin TL cinsindendir.
 */

export const reportMeta = {
  company: "Örnek Sanayi A.Ş.",
  period: "Ağustos 2026",
  previousPeriod: "Temmuz 2026",
  currencyNote: "Tutarlar bin TL",
  isDemoData: true,
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

export const monthly: MonthlyPoint[] = [
  { month: "Oca", sales: 41200, budgetSales: 40000, grossProfit: 12360, ebitda: 6180, netProfit: 3296, operatingCash: 4100 },
  { month: "Şub", sales: 43800, budgetSales: 42000, grossProfit: 12702, ebitda: 6132, netProfit: 3066, operatingCash: 3520 },
  { month: "Mar", sales: 47500, budgetSales: 45000, grossProfit: 13775, ebitda: 6650, netProfit: 3325, operatingCash: 2980 },
  { month: "Nis", sales: 46100, budgetSales: 46000, grossProfit: 12888, ebitda: 5993, netProfit: 2766, operatingCash: 2140 },
  { month: "May", sales: 49800, budgetSales: 48000, grossProfit: 13944, ebitda: 6474, netProfit: 2988, operatingCash: 1860 },
  { month: "Haz", sales: 52400, budgetSales: 50000, grossProfit: 14672, ebitda: 6812, netProfit: 3144, operatingCash: 1420 },
  { month: "Tem", sales: 54900, budgetSales: 52000, grossProfit: 15372, ebitda: 6588, netProfit: 2745, operatingCash: 980 },
  { month: "Ağu", sales: 58600, budgetSales: 54000, grossProfit: 15822, ebitda: 6446, netProfit: 2344, operatingCash: -640 },
];

export const salesBreakdown = {
  byProduct: [
    { name: "Ana ürün grubu", current: 32100, previous: 30800, budget: 30000 },
    { name: "Yan ürünler", current: 15400, previous: 13900, budget: 14000 },
    { name: "Servis / bakım", current: 7300, previous: 6900, budget: 6500 },
    { name: "Proje satışları", current: 3800, previous: 3300, budget: 3500 },
  ],
  byRegion: [
    { name: "Marmara", current: 24600, previous: 23100 },
    { name: "İç Anadolu", current: 12800, previous: 11900 },
    { name: "Ege", current: 9700, previous: 9200 },
    { name: "İhracat", current: 11500, previous: 10700 },
  ],
  volumePriceEffect: {
    volumeEffect: 1400,
    priceEffect: 2300,
    mixEffect: -200,
  },
  topCustomerShare: 0.23,
};

export const budgetVariance = [
  { item: "Net satış", budget: 54000, actual: 58600 },
  { item: "Satışların maliyeti", budget: -37800, actual: -42778 },
  { item: "Brüt kâr", budget: 16200, actual: 15822 },
  { item: "Faaliyet giderleri", budget: -9450, actual: -9376 },
  { item: "FAVÖK", budget: 6750, actual: 6446 },
  { item: "Finansman gideri", budget: -2100, actual: -2860 },
  { item: "Net kâr", budget: 3200, actual: 2344 },
];

export const varianceReasons = [
  {
    item: "Satışların maliyeti",
    variance: -4978,
    reason: "Hammadde fiyat artışı ve düşük marjlı proje satışlarının payının yükselmesi.",
  },
  {
    item: "Finansman gideri",
    variance: -760,
    reason: "Artan işletme sermayesi ihtiyacının kısa vadeli kredi ile fonlanması.",
  },
  {
    item: "Net satış",
    variance: 4600,
    reason: "Fiyat artışı ve ihracat hacminin bütçe üzerinde gerçekleşmesi.",
  },
];

export const margins = [
  { month: "Mar", gross: 29.0, ebitda: 14.0, net: 7.0 },
  { month: "Nis", gross: 28.0, ebitda: 13.0, net: 6.0 },
  { month: "May", gross: 28.0, ebitda: 13.0, net: 6.0 },
  { month: "Haz", gross: 28.0, ebitda: 13.0, net: 6.0 },
  { month: "Tem", gross: 28.0, ebitda: 12.0, net: 5.0 },
  { month: "Ağu", gross: 27.0, ebitda: 11.0, net: 4.0 },
];

export const cashFlow = {
  opening: 8400,
  operating: -640,
  investing: -3200,
  financing: 2600,
  closing: 7160,
  bridge: [
    { name: "Açılış nakit", value: 8400 },
    { name: "FAVÖK", value: 6446 },
    { name: "İşletme sermayesi", value: -6086 },
    { name: "Vergi ve faiz", value: -1000 },
    { name: "Yatırım (CAPEX)", value: -3200 },
    { name: "Finansman", value: 2600 },
    { name: "Kapanış nakit", value: 7160 },
  ],
};

export const workingCapital = [
  { name: "Ticari alacaklar", current: 46800, previous: 42100, days: 74, targetDays: 60 },
  { name: "Stoklar", current: 31400, previous: 27600, days: 66, targetDays: 55 },
  { name: "Ticari borçlar", current: 28900, previous: 28200, days: 48, targetDays: 55 },
];

export const cashConversionCycle = [
  { month: "Nis", days: 74 },
  { month: "May", days: 78 },
  { month: "Haz", days: 83 },
  { month: "Tem", days: 88 },
  { month: "Ağu", days: 92 },
];

export const debt = {
  total: 62400,
  previous: 58900,
  net: 55240,
  shortTerm: 38700,
  longTerm: 23700,
  averageRate: 0.42,
  netDebtToEbitda: 3.4,
  dscr: 1.15,
  lines: [
    { bank: "A Bankası", limit: 30000, used: 24500 },
    { bank: "B Bankası", limit: 20000, used: 18200 },
    { bank: "C Bankası", limit: 15000, used: 12300 },
    { bank: "Leasing", limit: 10000, used: 7400 },
  ],
  maturities: [
    { period: "0-3 ay", amount: 14800 },
    { period: "3-6 ay", amount: 11600 },
    { period: "6-12 ay", amount: 12300 },
    { period: "1+ yıl", amount: 23700 },
  ],
};

export const capex = {
  annualBudget: 24000,
  ytdBudget: 16000,
  ytdActual: 13900,
  monthActual: 3200,
  projects: [
    { name: "Üretim hattı modernizasyonu", budget: 12000, actual: 8600, status: "Devam ediyor" },
    { name: "Depo otomasyonu", budget: 6000, actual: 3100, status: "Devam ediyor" },
    { name: "ERP yenileme", budget: 4000, actual: 2200, status: "Devam ediyor" },
    { name: "Enerji verimliliği", budget: 2000, actual: 0, status: "Ertelendi" },
  ],
};

export const forecast = {
  scenarios: [
    { name: "Kötümser", sales: 690000, ebitda: 71000, netCash: 2100 },
    { name: "Baz", sales: 726000, ebitda: 79500, netCash: 6400 },
    { name: "İyimser", sales: 754000, ebitda: 86000, netCash: 11800 },
  ],
  budgetFullYear: { sales: 700000, ebitda: 87500, netCash: 12000 },
  drivers: [
    { name: "Fiyat artışının sürmesi", impact: "+", note: "Satış tarafını bütçe üzerinde tutuyor." },
    { name: "Hammadde maliyeti", impact: "-", note: "Brüt marjı yaklaşık 2 puan aşağı çekiyor." },
    { name: "Tahsilat süresi", impact: "-", note: "14 gün uzama nakit akışını baskılıyor." },
    { name: "Faiz seviyesi", impact: "-", note: "Finansman gideri bütçeyi aşıyor." },
  ],
  path: [
    { month: "Eyl", sales: 60000, ebitda: 6800 },
    { month: "Eki", sales: 62000, ebitda: 7100 },
    { month: "Kas", sales: 63500, ebitda: 7300 },
    { month: "Ara", sales: 66000, ebitda: 7600 },
  ],
};

export const narrative = {
  where: [
    "Satış bütçenin %8,5 üzerinde, geçen yılın aynı ayına göre büyüme sürüyor.",
    "FAVÖK marjı 12 ayın en düşük seviyesinde: %11,0.",
    "Faaliyetlerden nakit akışı bu ay ilk kez negatif: -640.",
    "Net borç / FAVÖK 3,4x seviyesine yükseldi, DSCR 1,15.",
  ],
  why: [
    "Ciro büyümesi fiyat kaynaklı; ancak hammadde maliyeti daha hızlı arttığı için brüt marj 2 puan geriledi.",
    "Kâr nakde dönmedi: alacak ve stok artışı işletme sermayesinde 6.086 bağladı.",
    "Nakit ihtiyacı kısa vadeli krediyle karşılandı, finansman gideri bütçeyi 760 aştı.",
    "CAPEX bütçenin altında kalmasına rağmen nakit çıkışı 3.200 oldu.",
  ],
  next: [
    { action: "Tahsilat süresini 74 günden 65 güne indirmek için vade politikası sıkılaştırılacak.", owner: "Finans", due: "30 Eylül" },
    { action: "Yavaş dönen stoklar için hedefli indirim ve üretim planı revizyonu yapılacak.", owner: "Operasyon", due: "15 Eylül" },
    { action: "Ana ürün grubunda fiyat güncellemesi ile brüt marj 1,5 puan iyileştirilecek.", owner: "Satış", due: "1 Ekim" },
    { action: "Kısa vadeli kredilerin bir kısmı uzun vadeye çevrilecek, DSCR 1,30 hedeflenecek.", owner: "Finans", due: "31 Ekim" },
    { action: "Enerji verimliliği yatırımı yıl sonuna ertelenerek nakit korunacak.", owner: "Yönetim", due: "Karar alındı" },
  ],
};
