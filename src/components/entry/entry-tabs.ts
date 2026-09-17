import type { ReportInput } from "@/lib/report-schema";

/**
 * Veri girişi sekmeleri ile rapor sayfaları arasındaki bağlantı haritası.
 * Tek kaynak: hem veri girişindeki "Raporda gör" bağlantıları hem de rapor
 * sayfalarındaki "Veri kaynağı" bağlantıları buradan üretilir.
 */

export type ReportRoute =
  | "/"
  | "/satis"
  | "/butce"
  | "/karlilik"
  | "/nakit"
  | "/finansman"
  | "/tahmin"
  | "/cac"
  | "/ltv"
  | "/edinim"
  | "/fizibilite";

export const reportRouteLabels: Record<ReportRoute, string> = {
  "/": "Yönetici Özeti",
  "/satis": "Satış Performansı",
  "/butce": "Bütçe – Gerçekleşen",
  "/karlilik": "Kârlılık",
  "/nakit": "Nakit ve İşletme Sermayesi",
  "/finansman": "Borç, Kredi ve CAPEX",
  "/tahmin": "Projeksiyon 2027–2032",
  "/cac": "CAC",
  "/ltv": "LTV",
  "/edinim": "Edinim ve Birim Maliyet",
  "/fizibilite": "Fizibilite / BEP",
};

export type EntryTabId =
  | "genel"
  | "aylik"
  | "satis"
  | "fiyat"
  | "butce"
  | "nakit"
  | "finansman"
  | "tahmin"
  | "birim"
  | "fizibilite"
  | "ilkyil"
  | "giderler"
  | "edinim"
  | "b2b"
  | "yorum";

export type EntryTab = {
  id: EntryTabId;
  label: string;
  /** Bu sekmedeki verinin sonuçlarının göründüğü rapor sayfaları. */
  reports: ReportRoute[];
  /** Sekmenin dolu sayılıp sayılmadığı (sekme başlığındaki gösterge için). */
  hasData: (input: ReportInput) => boolean;
};

export const entryTabs: EntryTab[] = [
  {
    id: "genel",
    label: "Genel",
    reports: ["/"],
    hasData: (i) => Boolean(i.meta.company || i.meta.period),
  },
  {
    id: "aylik",
    label: "Aylık veriler",
    reports: ["/", "/satis", "/butce", "/karlilik", "/nakit", "/finansman"],
    hasData: (i) => i.monthly.length > 0,
  },
  {
    id: "satis",
    label: "Satış",
    reports: ["/satis", "/karlilik"],
    hasData: (i) => i.sales.byProduct.length > 0 || i.sales.byRegion.length > 0,
  },
  {
    id: "fiyat",
    label: "Fiyat ve gelir kanalları",
    reports: ["/fizibilite"],
    hasData: (i) =>
      i.feasibility.priceCatalog.length > 0 ||
      i.feasibility.revenueChannels.length > 0 ||
      i.feasibility.nonRevenueItems.length > 0,
  },
  {
    id: "butce",
    label: "Bütçe",
    reports: ["/butce", "/"],
    hasData: (i) => i.budget.reasons.length > 0,
  },
  {
    id: "nakit",
    label: "İşletme sermayesi",
    reports: ["/nakit", "/fizibilite", "/tahmin"],
    hasData: (i) =>
      i.workingCapital.targetReceivableDays > 0 || i.feasibility.cashCollections.length > 0,
  },
  {
    id: "finansman",
    label: "Borç ve CAPEX",
    reports: ["/finansman", "/"],
    hasData: (i) =>
      i.financing.lines.length > 0 || i.capex.projects.length > 0 || i.financing.shortTerm > 0,
  },
  {
    id: "tahmin",
    label: "Projeksiyon",
    reports: ["/tahmin", "/karlilik"],
    hasData: (i) =>
      i.projection.capexByYear.length > 0 ||
      i.projection.financingByYear.length > 0 ||
      i.projection.corporateTaxRate > 0 ||
      i.projection.openingCash > 0,
  },
  {
    id: "birim",
    label: "CAC / LTV",
    reports: ["/cac", "/ltv"],
    hasData: (i) => i.unitEconomics.length > 0 || i.cac.byChannel.length > 0,
  },
  {
    id: "fizibilite",
    label: "Fizibilite / BEP",
    reports: ["/fizibilite", "/tahmin", "/"],
    hasData: (i) => i.feasibility.tiers.length > 0 || i.feasibility.periods.length > 0,
  },
  {
    id: "ilkyil",
    label: "İlk yıl Ar-Ge / şirket",
    reports: ["/fizibilite", "/tahmin"],
    hasData: (i) => i.feasibility.firstYear.items.length > 0,
  },
  {
    id: "giderler",
    label: "Faaliyet giderleri",
    reports: ["/edinim", "/tahmin", "/karlilik"],
    hasData: (i) => i.acquisition.spendLedger.length > 0,
  },
  {
    id: "edinim",
    label: "Edinim (B2C)",
    reports: ["/edinim", "/cac", "/ltv", "/tahmin"],
    hasData: (i) =>
      i.acquisition.b2cCohorts.length > 0 ||
      i.acquisition.b2cPlan.channels.length > 0 ||
      i.acquisition.b2cUnit.basicPrice > 0,
  },
  {
    id: "b2b",
    label: "B2B lisans maliyeti",
    reports: ["/edinim", "/ltv", "/tahmin"],
    hasData: (i) => i.acquisition.b2bLicense.licensePrice > 0,
  },
  {
    id: "yorum",
    label: "Yorum ve aksiyon",
    reports: ["/"],
    hasData: (i) => i.narrative.notes.length > 0 || i.narrative.actions.length > 0,
  },
];

export const entryTabIds = entryTabs.map((tab) => tab.id);

export const isEntryTabId = (value: unknown): value is EntryTabId =>
  typeof value === "string" && (entryTabIds as string[]).includes(value);

export const entryTabLabel = (id: EntryTabId) =>
  entryTabs.find((tab) => tab.id === id)?.label ?? id;

/** Bir rapor sayfasını besleyen veri girişi sekmeleri (ters harita). */
export const sourceTabsFor = (route: ReportRoute): EntryTabId[] =>
  entryTabs.filter((tab) => tab.reports.includes(route)).map((tab) => tab.id);
