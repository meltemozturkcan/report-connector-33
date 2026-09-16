import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { NumberField, RepeatTable, TextField } from "@/components/entry/fields";
import { TierPeriodGrid } from "@/components/entry/TierPeriodGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useReportInput } from "@/hooks/useReport";
import { computeAcquisition } from "@/lib/acquisition-calc";
import { computeFeasibility, computeFirstYearCosts } from "@/lib/feasibility-calc";
import { computeReport } from "@/lib/report-calc";
import {
  cacBuckets,
  emptyCacChannelRow,
  emptyCacItemRow,
  emptyCohortChannelRow,
  emptyFixedOpsRow,
  emptyPerReportCostRow,
  emptySpendLedgerRow,
  emptyCostLayerRow,
  emptyFixedOpexGroupRow,
  emptyCostPlacementRow,
  emptyChannelMetricRow,
  emptyB2cCogsRow,
  emptyPlanChannelRow,
  emptyPlanPoolItemRow,
  emptyPlanActualRow,
  emptyFirstYearCostRow,
  emptyFixedItemRow,
  emptyMonthlyRow,
  emptyCapexYearRow,
  emptyCashCollectionRow,
  emptyFinancingYearRow,

  emptyNonRevenueRow,
  emptyRevenueChannelRow,
  emptyOtherRevenueRow,
  emptyPriceCatalogRow,
  emptyTierRow,
  emptyUnitEconomicsRow,
  reportInputSchema,
  type ReportInput,
} from "@/lib/report-schema";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

const monthLabels = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const Route = createFileRoute("/veri-girisi")({
  head: () => ({
    meta: [
      { title: "Veri Girişi — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Satış, maliyet, nakit, işletme sermayesi, borç, CAPEX ve birim ekonomisi verilerini girin; rapor göstergeleri otomatik hesaplansın.",
      },
      { property: "og:title", content: "Veri Girişi — Aylık Yönetim Raporu" },
      {
        property: "og:description",
        content: "Ham verileri girin, marj, sapma, nakit döngüsü ve yıl sonu tahmini otomatik hesaplansın.",
      },
    ],
  }),
  component: DataEntryPage,
});

function DataEntryPage() {
  const { session, isLoading: authLoading } = useAuth();
  const { input, isLoading, save, isSaving } = useReportInput();
  const [draft, setDraft] = useState<ReportInput>(input);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !loaded) {
      setDraft(input);
      setLoaded(true);
    }
  }, [input, isLoading, loaded]);

  const preview = computeReport(draft);
  const feasibilityPreview = computeFeasibility(draft.feasibility);
  const firstYearPreview = computeFirstYearCosts(draft.feasibility);
  const acquisitionPreview = computeAcquisition(draft.acquisition);

  const patch = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    const parsed = reportInputSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Veriler doğrulanamadı");
      return;
    }
    try {
      await save(parsed.data);
      toast.success("Rapor verileri kaydedildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    }
  };

  if (!authLoading && !session) {
    return (
      <AppShell>
        <PageHeader
          title="Veri Girişi"
          description="Rapor verilerinizi girmek için oturum açmanız gerekiyor."
        />
        <div className="border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Veriler hesabınıza özel olarak saklanır ve yalnızca sizin tarafınızdan görülebilir.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Giriş yap</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Veri Girişi"
        description="Yalnızca ham verileri girin. Marjlar, bütçe sapmaları, nakit köprüsü, işletme sermayesi gün sayıları, net borç/FAVÖK, DSCR, yıl sonu senaryoları ve birim ekonomisi otomatik hesaplanır. Tutarlar bin TL, oranlar yüzde olarak girilir."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">FAVÖK marjı</dt>
            <dd className="font-medium tabular-nums">
              {preview.currentMargin ? formatPercent(preview.currentMargin.ebitda) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Net borç / FAVÖK</dt>
            <dd className="font-medium tabular-nums">{formatRatio(preview.debt.netDebtToEbitda, 2)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Dönem sonu nakit</dt>
            <dd className="font-medium tabular-nums">{formatAmount(preview.cashFlow.closing)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">LTV / CAC</dt>
            <dd className="font-medium tabular-nums">{formatRatio(preview.ltvDetail.ltvToCac, 2)}</dd>
          </div>
        </dl>
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>

      <Tabs defaultValue="genel" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="aylik">Aylık veriler</TabsTrigger>
          <TabsTrigger value="satis">Satış</TabsTrigger>
          <TabsTrigger value="fiyat">Fiyat ve gelir kanalları</TabsTrigger>

          <TabsTrigger value="butce">Bütçe</TabsTrigger>
          <TabsTrigger value="nakit">İşletme sermayesi</TabsTrigger>
          <TabsTrigger value="finansman">Borç ve CAPEX</TabsTrigger>
          <TabsTrigger value="tahmin">Projeksiyon</TabsTrigger>
          <TabsTrigger value="birim">CAC / LTV</TabsTrigger>
          <TabsTrigger value="fizibilite">Fizibilite / BEP</TabsTrigger>
          <TabsTrigger value="ilkyil">İlk yıl Ar-Ge / şirket</TabsTrigger>
          <TabsTrigger value="giderler">Faaliyet giderleri</TabsTrigger>
          <TabsTrigger value="edinim">Edinim (B2C)</TabsTrigger>
          <TabsTrigger value="b2b">B2B lisans maliyeti</TabsTrigger>
          <TabsTrigger value="yorum">Yorum ve aksiyon</TabsTrigger>

        </TabsList>

        <TabsContent value="genel" className="space-y-4 border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              id="company"
              label="Şirket"
              value={draft.meta.company}
              onChange={(value) => patch("meta", { ...draft.meta, company: value })}
            />
            <TextField
              id="period"
              label="Rapor dönemi"
              placeholder="Örn. Mayıs 2026"
              value={draft.meta.period}
              onChange={(value) => patch("meta", { ...draft.meta, period: value })}
            />
            <TextField
              id="previousPeriod"
              label="Karşılaştırma dönemi"
              placeholder="Örn. Nisan 2026"
              value={draft.meta.previousPeriod}
              onChange={(value) => patch("meta", { ...draft.meta, previousPeriod: value })}
            />
            <TextField
              id="currencyNote"
              label="Para birimi notu"
              value={draft.meta.currencyNote}
              onChange={(value) => patch("meta", { ...draft.meta, currencyNote: value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="aylik" className="space-y-4 border border-border bg-card p-4">
          <RepeatTable
            label="Aylık gelir tablosu, nakit ve bilanço verileri"
            description="Son ay raporun cari dönemidir. Brüt kâr, FAVÖK, net kâr, marjlar, nakit köprüsü ve gün sayıları bu satırlardan hesaplanır."
            rows={draft.monthly}
            emptyRow={emptyMonthlyRow}
            onChange={(rows) => patch("monthly", rows)}
            addLabel="Ay ekle"
            columns={[
              { key: "month", label: "Ay", type: "text", width: "120px" },
              { key: "sales", label: "Net satış" },
              { key: "budgetSales", label: "Bütçe satış" },
              { key: "cogs", label: "SMM" },
              { key: "budgetCogs", label: "Bütçe SMM" },
              { key: "opex", label: "Faaliyet gideri" },
              { key: "budgetOpex", label: "Bütçe gideri" },
              { key: "depreciation", label: "Amortisman" },
              { key: "financialExpense", label: "Finansman gideri" },
              { key: "tax", label: "Vergi" },
              { key: "operatingCash", label: "Faaliyet nakdi" },
              { key: "investingCash", label: "Yatırım nakdi" },
              { key: "financingCash", label: "Finansman nakdi" },
              { key: "cash", label: "Dönem sonu nakit" },
              { key: "receivables", label: "Ticari alacak" },
              { key: "inventory", label: "Stok" },
              { key: "payables", label: "Ticari borç" },
              { key: "debt", label: "Finansal borç" },
            ]}
          />
        </TabsContent>

        <TabsContent value="satis" className="space-y-6 border border-border bg-card p-4">
          <RepeatTable
            label="Ürün / hizmet kırılımı"
            rows={draft.sales.byProduct}
            emptyRow={{ name: "", current: 0, previous: 0, budget: 0 }}
            onChange={(rows) => patch("sales", { ...draft.sales, byProduct: rows })}
            columns={[
              { key: "name", label: "Ürün", type: "text", width: "35%" },
              { key: "current", label: "Cari ay" },
              { key: "previous", label: "Önceki ay" },
              { key: "budget", label: "Bütçe" },
            ]}
          />
          <RepeatTable
            label="Bölge kırılımı"
            rows={draft.sales.byRegion}
            emptyRow={{ name: "", current: 0, previous: 0 }}
            onChange={(rows) => patch("sales", { ...draft.sales, byRegion: rows })}
            columns={[
              { key: "name", label: "Bölge", type: "text", width: "50%" },
              { key: "current", label: "Cari ay" },
              { key: "previous", label: "Önceki ay" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="volumeEffect"
              label="Miktar etkisi"
              value={draft.sales.volumeEffect}
              onChange={(value) => patch("sales", { ...draft.sales, volumeEffect: value })}
            />
            <NumberField
              id="priceEffect"
              label="Fiyat etkisi"
              value={draft.sales.priceEffect}
              onChange={(value) => patch("sales", { ...draft.sales, priceEffect: value })}
            />
            <NumberField
              id="mixEffect"
              label="Ürün karması etkisi"
              value={draft.sales.mixEffect}
              onChange={(value) => patch("sales", { ...draft.sales, mixEffect: value })}
            />
            <NumberField
              id="topCustomerShare"
              label="En büyük müşteri payı (%)"
              value={draft.sales.topCustomerShare}
              onChange={(value) => patch("sales", { ...draft.sales, topCustomerShare: value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="butce" className="space-y-4 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Bütçe – gerçekleşen sapmaları aylık verilerden otomatik hesaplanır. Burada yalnızca sapma
            nedenlerini açıklarsınız.
          </p>
          <RepeatTable
            label="Sapma nedenleri"
            description="Kalem adı, hesaplanan sapma tablosundaki adla aynı olmalıdır: Net satış, Satışların maliyeti, Brüt kâr, Faaliyet gideri, FAVÖK, Net kâr."
            rows={draft.budget.reasons}
            emptyRow={{ item: "", reason: "" }}
            onChange={(rows) => patch("budget", { reasons: rows })}
            columns={[
              { key: "item", label: "Kalem", type: "text", width: "30%" },
              { key: "reason", label: "Neden", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="nakit" className="space-y-4 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Alacak, stok ve ticari borç tutarları aylık veriler sekmesinden gelir. Gün sayıları
            hesaplanır; burada hedef gün sayılarını tanımlarsınız.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="targetReceivableDays"
              label="Hedef alacak gün sayısı"
              value={draft.workingCapital.targetReceivableDays}
              onChange={(value) =>
                patch("workingCapital", { ...draft.workingCapital, targetReceivableDays: value })
              }
            />
            <NumberField
              id="targetInventoryDays"
              label="Hedef stok gün sayısı"
              value={draft.workingCapital.targetInventoryDays}
              onChange={(value) =>
                patch("workingCapital", { ...draft.workingCapital, targetInventoryDays: value })
              }
            />
            <NumberField
              id="targetPayableDays"
              label="Hedef ticari borç gün sayısı"
              value={draft.workingCapital.targetPayableDays}
              onChange={(value) =>
                patch("workingCapital", { ...draft.workingCapital, targetPayableDays: value })
              }
            />
          </div>

          <RepeatTable
            label="Nakit akışı / tahsilat takibi"
            description="Yalnızca o ay faturalandırılan ve tahsil edilen tutarlar yazılır; toplam tahsilat otomatik hesaplanır."
            rows={draft.feasibility.cashCollections}
            emptyRow={emptyCashCollectionRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, cashCollections: rows })}
            addLabel="Dönem ekle"
            columns={[
              { key: "period", label: "Dönem", type: "text", width: "22%" },
              { key: "pilotCount", label: "Yeni ücretli pilot (adet)" },
              { key: "pilot", label: "Pilot tahsilatı (TL)" },
              { key: "annualCount", label: "Yeni yıllık abonelik (adet)" },
              { key: "annual", label: "Yıllık abonelik tahsilatı (TL)" },
            ]}
          />
        </TabsContent>


        <TabsContent value="finansman" className="space-y-6 border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="shortTerm"
              label="Kısa vadeli borç"
              value={draft.financing.shortTerm}
              onChange={(value) => patch("financing", { ...draft.financing, shortTerm: value })}
            />
            <NumberField
              id="longTerm"
              label="Uzun vadeli borç"
              value={draft.financing.longTerm}
              onChange={(value) => patch("financing", { ...draft.financing, longTerm: value })}
            />
            <NumberField
              id="averageRate"
              label="Ortalama faiz (%)"
              value={draft.financing.averageRate}
              onChange={(value) => patch("financing", { ...draft.financing, averageRate: value })}
            />
            <NumberField
              id="annualDebtService"
              label="Yıllık borç servisi (anapara + faiz)"
              hint="DSCR = yıllıklandırılmış FAVÖK / borç servisi"
              value={draft.financing.annualDebtService}
              onChange={(value) =>
                patch("financing", { ...draft.financing, annualDebtService: value })
              }
            />
          </div>
          <RepeatTable
            label="Kredi limitleri"
            rows={draft.financing.lines}
            emptyRow={{ bank: "", limit: 0, used: 0 }}
            onChange={(rows) => patch("financing", { ...draft.financing, lines: rows })}
            columns={[
              { key: "bank", label: "Banka", type: "text", width: "50%" },
              { key: "limit", label: "Limit" },
              { key: "used", label: "Kullanılan" },
            ]}
          />
          <RepeatTable
            label="Vade dağılımı"
            rows={draft.financing.maturities}
            emptyRow={{ period: "", amount: 0 }}
            onChange={(rows) => patch("financing", { ...draft.financing, maturities: rows })}
            columns={[
              { key: "period", label: "Dönem", type: "text", width: "50%" },
              { key: "amount", label: "Tutar" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="capexAnnualBudget"
              label="Yıllık CAPEX bütçesi"
              value={draft.capex.annualBudget}
              onChange={(value) => patch("capex", { ...draft.capex, annualBudget: value })}
            />
            <NumberField
              id="capexYtdBudget"
              label="Yılbaşından bugüne CAPEX bütçesi"
              value={draft.capex.ytdBudget}
              onChange={(value) => patch("capex", { ...draft.capex, ytdBudget: value })}
            />
            <NumberField
              id="capexMonthActual"
              label="Cari ay CAPEX"
              value={draft.capex.monthActual}
              onChange={(value) => patch("capex", { ...draft.capex, monthActual: value })}
            />
          </div>
          <RepeatTable
            label="CAPEX projeleri"
            description="Yılbaşından bugüne gerçekleşme, proje satırlarının toplamıdır."
            rows={draft.capex.projects}
            emptyRow={{ name: "", budget: 0, actual: 0, status: "Devam ediyor" }}
            onChange={(rows) => patch("capex", { ...draft.capex, projects: rows })}
            columns={[
              { key: "name", label: "Proje", type: "text", width: "35%" },
              { key: "budget", label: "Bütçe" },
              { key: "actual", label: "Gerçekleşen" },
              { key: "status", label: "Durum", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="tahmin" className="space-y-6 border border-border bg-card p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Yıl sonu satış, FAVÖK ve nakit sonuçları elle girilmez; satış, maliyet, edinim ve finansman
            sürücülerinden hesaplanır. Burada yalnızca sürücüleri girin. Ölçülmemiş girdiler sonuca yüklenmez,
            Projeksiyon sayfasında "ölçülmeli" uyarısı olarak görünür.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              id="projectionStartYear"
              label="Plan başlangıç yılı"
              value={draft.projection.startYear}
              onChange={(value) => patch("projection", { ...draft.projection, startYear: value })}
            />
            <NumberField
              id="projectionEndYear"
              label="Plan bitiş yılı"
              value={draft.projection.endYear}
              onChange={(value) => patch("projection", { ...draft.projection, endYear: value })}
            />
            <NumberField
              id="corporateTaxRate"
              label="Kurumlar vergisi oranı (%)"
              hint="Girilmezse vergi 0 kabul edilir ve net kâr vergi öncesi tutara eşittir."
              value={draft.projection.corporateTaxRate}
              onChange={(value) => patch("projection", { ...draft.projection, corporateTaxRate: value })}
            />
            <NumberField
              id="openingCash"
              label="Plan başındaki nakit (TL)"
              value={draft.projection.openingCash}
              onChange={(value) => patch("projection", { ...draft.projection, openingCash: value })}
            />
            <NumberField
              id="projectionRemainingMonths"
              label="Kalan ay sayısı"
              hint="Yalnızca içinde bulunulan yıl seçiliyken gösterilir."
              value={draft.projection.remainingMonths}
              onChange={(value) => patch("projection", { ...draft.projection, remainingMonths: value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="worstRevenueDelta"
              label="Kötümser — gelir sapması (%)"
              value={draft.projection.worstRevenueDelta}
              onChange={(value) => patch("projection", { ...draft.projection, worstRevenueDelta: value })}
            />
            <NumberField
              id="worstCostDelta"
              label="Kötümser — maliyet sapması (%)"
              value={draft.projection.worstCostDelta}
              onChange={(value) => patch("projection", { ...draft.projection, worstCostDelta: value })}
            />
            <NumberField
              id="bestRevenueDelta"
              label="İyimser — gelir sapması (%)"
              value={draft.projection.bestRevenueDelta}
              onChange={(value) => patch("projection", { ...draft.projection, bestRevenueDelta: value })}
            />
            <NumberField
              id="bestCostDelta"
              label="İyimser — maliyet sapması (%)"
              value={draft.projection.bestCostDelta}
              onChange={(value) => patch("projection", { ...draft.projection, bestCostDelta: value })}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Ana senaryoya dahil gelir kalemleri</legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 border-border"
                checked={draft.projection.includeB2cRevenue}
                onChange={(event) =>
                  patch("projection", { ...draft.projection, includeB2cRevenue: event.target.checked })
                }
              />
              B2C (ebeveyn) geliri ana senaryoya dahil
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 border-border"
                checked={draft.projection.includeInstitutionRevenue}
                onChange={(event) =>
                  patch("projection", { ...draft.projection, includeInstitutionRevenue: event.target.checked })
                }
              />
              Kurum lisansı geliri ana senaryoya dahil
            </label>
            <p className="text-xs text-muted-foreground">
              Doğrulanmadıkça kapalı kalır; kapalıyken bu katmanların geliri ve değişken maliyeti ana senaryodan
              çıkarılır.
            </p>
          </fieldset>
          <RepeatTable
            label="Yıl bazlı CAPEX"
            description="Yatırım nakit çıkışı; girilmeyen yıl için 0 kabul edilir."
            rows={draft.projection.capexByYear}
            emptyRow={emptyCapexYearRow}
            onChange={(rows) => patch("projection", { ...draft.projection, capexByYear: rows })}
            columns={[
              { key: "year", label: "Yıl", type: "text", width: "15%" },
              { key: "amount", label: "Tutar (TL)" },
              { key: "note", label: "Not", type: "text" },
            ]}
          />
          <RepeatTable
            label="Yıl bazlı finansman ve borç"
            description="Finansal maliyet = borç bakiyesi × faiz oranı. Girilmeyen yıl için finansal maliyet 0 kabul edilir."
            rows={draft.projection.financingByYear}
            emptyRow={emptyFinancingYearRow}
            onChange={(rows) => patch("projection", { ...draft.projection, financingByYear: rows })}
            columns={[
              { key: "year", label: "Yıl", type: "text", width: "15%" },
              { key: "debtBalance", label: "Borç bakiyesi (TL)" },
              { key: "interestRate", label: "Faiz oranı (%)" },
              { key: "principalRepayment", label: "Anapara ödemesi (TL)" },
              { key: "newFinancing", label: "Yeni finansman (TL)" },
            ]}
          />
        </TabsContent>


        <TabsContent value="birim" className="space-y-6 border border-border bg-card p-4">
          <RepeatTable
            label="Aylık birim ekonomisi"
            description="CAC = (pazarlama + satış gideri) / yeni müşteri. LTV = ARPU × brüt marj × (100 / churn). Geri ödeme = CAC / aylık brüt kâr."
            rows={draft.unitEconomics}
            emptyRow={emptyUnitEconomicsRow}
            onChange={(rows) => patch("unitEconomics", rows)}
            addLabel="Ay ekle"
            columns={[
              { key: "month", label: "Ay", type: "text", width: "120px" },
              { key: "newCustomers", label: "Yeni müşteri" },
              { key: "marketingSpend", label: "Pazarlama gideri" },
              { key: "salesSpend", label: "Satış gideri" },
              { key: "arpu", label: "ARPU (TL/ay)" },
              { key: "churnRate", label: "Aylık churn (%)" },
              { key: "grossMarginRate", label: "Brüt marj (%)" },
            ]}
          />
          <NumberField
            id="targetPaybackMonths"
            label="Hedef geri ödeme süresi (ay)"
            value={draft.cac.targetPaybackMonths}
            onChange={(value) => patch("cac", { ...draft.cac, targetPaybackMonths: value })}
          />
          <TextField
            id="channelPeriod"
            label="Kanal tablosu dönemi"
            value={draft.cac.channelPeriod}
            onChange={(value) => patch("cac", { ...draft.cac, channelPeriod: value })}
          />
          <RepeatTable
            label="Kanal bazlı kazanım"
            description="Her kanal için harcama, yeni uygun ücretsiz ebeveyn ve yeni ücretli ebeveyn adedi. Freemium ve ücretli kazanım maliyetleri otomatik hesaplanır."
            rows={draft.cac.byChannel}
            emptyRow={{ channel: "", spend: 0, freeSignups: 0, newCustomers: 0 }}
            onChange={(rows) => patch("cac", { ...draft.cac, byChannel: rows })}
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "34%" },
              { key: "spend", label: "Harcama" },
              { key: "freeSignups", label: "Yeni uygun ücretsiz ebeveyn" },
              { key: "newCustomers", label: "Yeni ücretli ebeveyn" },
            ]}
          />
          <RepeatTable
            label="Dönüşüm hunisi"
            rows={draft.cac.funnel}
            emptyRow={{ stage: "", count: 0 }}
            onChange={(rows) => patch("cac", { ...draft.cac, funnel: rows })}
            columns={[
              { key: "stage", label: "Aşama", type: "text", width: "50%" },
              { key: "count", label: "Adet" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="netRevenueRetention"
              label="Net gelir tutundurma (%)"
              value={draft.ltv.netRevenueRetention}
              onChange={(value) => patch("ltv", { ...draft.ltv, netRevenueRetention: value })}
            />
            <NumberField
              id="logoRetention"
              label="Müşteri tutundurma (%)"
              value={draft.ltv.logoRetention}
              onChange={(value) => patch("ltv", { ...draft.ltv, logoRetention: value })}
            />
          </div>
          <RepeatTable
            label="Kohortlar"
            rows={draft.ltv.cohorts}
            emptyRow={{ cohort: "", month12Retention: 0, ltv: 0 }}
            onChange={(rows) => patch("ltv", { ...draft.ltv, cohorts: rows })}
            columns={[
              { key: "cohort", label: "Kohort", type: "text", width: "40%" },
              { key: "month12Retention", label: "12. ay tutundurma (%)" },
              { key: "ltv", label: "LTV (TL)" },
            ]}
          />
          <RepeatTable
            label="Segment bazlı birim ekonomisi"
            description="Segment LTV ve LTV/CAC oranı girilen ARPU, churn ve brüt marjdan hesaplanır."
            rows={draft.ltv.bySegment}
            emptyRow={{ segment: "", arpu: 0, churnRate: 0, grossMarginRate: 0, cac: 0 }}
            onChange={(rows) => patch("ltv", { ...draft.ltv, bySegment: rows })}
            columns={[
              { key: "segment", label: "Segment", type: "text", width: "28%" },
              { key: "arpu", label: "ARPU (TL/ay)" },
              { key: "churnRate", label: "Churn (%)" },
              { key: "grossMarginRate", label: "Brüt marj (%)" },
              { key: "cac", label: "CAC (TL)" },
            ]}
          />
        </TabsContent>

        <TabsContent value="fiyat" className="space-y-6 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Fiyatlar KDV hariç, 2026 baz fiyatlarıdır. Bu sekme referans kataloğudur; başa baş
            hesabını doğrudan değiştirmez, katman fiyatları Fizibilite / BEP sekmesinde girilir.
          </p>

          <RepeatTable
            label="Fiyat listesi (KDV hariç, 2026 baz)"
            description="Gelir kalemi, fiyat, birim/dönem ve kapsam koşulu."
            rows={draft.feasibility.priceCatalog}
            emptyRow={emptyPriceCatalogRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, priceCatalog: rows })}
            addLabel="Fiyat kalemi ekle"
            columns={[
              { key: "name", label: "Gelir kalemi", type: "text", width: "28%" },
              { key: "price", label: "Fiyat (TL)" },
              { key: "unit", label: "Birim / dönem", type: "text", width: "20%" },
              { key: "scope", label: "Kapsam ve koşul", type: "text", width: "32%" },
            ]}
          />

          <RepeatTable
            label="Gelir kanalları haritası"
            description="Her gelir kanalının başlangıç zamanı, gelir birimi ve ana sürücüsü."
            rows={draft.feasibility.revenueChannels}
            emptyRow={emptyRevenueChannelRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, revenueChannels: rows })}
            addLabel="Kanal ekle"
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "24%" },
              { key: "start", label: "Başlangıç", type: "text", width: "20%" },
              { key: "unit", label: "Gelir birimi", type: "text", width: "24%" },
              { key: "driver", label: "Ana sürücü", type: "text", width: "32%" },
            ]}
          />

          <RepeatTable
            label="Gelir olmayan veya indirime yol açan kalemler"
            description="Ücretsiz pilot, freemium akış, indirimler ve Morvoi geliri olmayan üçüncü taraf bedelleri burada ayrı izlenir."
            rows={draft.feasibility.nonRevenueItems}
            emptyRow={emptyNonRevenueRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, nonRevenueItems: rows })}
            addLabel="Kalem ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "26%" },
              { key: "nature", label: "Finansal niteliği", type: "text", width: "22%" },
              { key: "condition", label: "Koşul", type: "text", width: "36%" },
              { key: "amount", label: "Tutar / etki (TL)" },
            ]}
          />
        </TabsContent>

        <TabsContent value="fizibilite" className="space-y-6 border border-border bg-card p-4">

          <div className="border-l-2 border-accent-foreground/40 bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Bu bölümdeki tutarlar <strong className="text-foreground">TL</strong> (bin TL değil), oranlar
            yüzde olarak girilir. Katkı payı, başa baş adedi, başa baş cirosu ve dönem kâr/zararı
            otomatik hesaplanır.
          </div>

          <div className="flex flex-wrap items-center gap-3 border border-dashed border-border bg-muted/40 px-4 py-3">
            <div className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Altı sütunlu model</strong> — 2027 “Ar-Ge, pilot ve ilk
              satış yılı” olarak ayrı tutulur; 2028–2032 ticari yıllardır. Düğme yalnızca yıl sütunlarını ve
              niteliklerini açar, mevcut adetleri korur. Adet, gelir ve maliyet alanlarını kendiniz girersiniz.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const tierCount = Math.max(draft.feasibility.tiers.length, 1);
                const yearRows = ["2027", "2028", "2029", "2030", "2031", "2032"].map((year) => {
                  const existing = draft.feasibility.periods.find((row) => row.period === year);
                  return {
                    period: year,
                    stage:
                      year === "2027" ? "Ar-Ge, pilot ve ilk satış yılı" : "Ticari yıl",
                    counts: Array.from(
                      { length: tierCount },
                      (_, index) => existing?.counts[index] ?? 0,
                    ),
                    revenueRecognitionRate: existing?.revenueRecognitionRate ?? 0,
                    recognizedRevenueOverride: existing?.recognizedRevenueOverride ?? 0,
                    otherRevenue: existing?.otherRevenue ?? 0,
                    fixedCostOverride: existing?.fixedCostOverride ?? 0,
                  };
                });
                patch("feasibility", { ...draft.feasibility, periods: yearRows });
              }}
            >
              2027 + 2028–2032 sütunlarını kur
            </Button>
          </div>

          <RepeatTable
            label="Tablo 4.4-1 · Katman fiyat listesi"
            description="Her katmanın yıllık liste fiyatı. Harmanlanmış fiyat = Σ(adet × fiyat) / toplam adet olarak her dönem yeniden hesaplanır."
            rows={draft.feasibility.tiers}
            emptyRow={emptyTierRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, tiers: rows })}
            addLabel="Katman ekle"
            columns={[
              { key: "name", label: "Katman", type: "text", width: "50%" },
              { key: "unitPrice", label: "Yıllık birim fiyat (TL)" },
            ]}
          />

          <TierPeriodGrid
            tierNames={draft.feasibility.tiers.map((tier) => tier.name)}
            rows={draft.feasibility.periods}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, periods: rows })}
          />

          <RepeatTable
            label="Tablo 4.4-1 · Abonelik dışı gelirler"
            description="Her alt kalem hacim × birim fiyat mantığıyla hesaplanır. Doğrulanmamış kalemler için hipotez notu girin."
            rows={draft.feasibility.otherRevenue}
            emptyRow={emptyOtherRevenueRow}
            onChange={(rows) => patch("feasibility", { ...draft.feasibility, otherRevenue: rows })}
            addLabel="Gelir kalemi ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "30%" },
              { key: "volume", label: "Hacim" },
              { key: "unitPrice", label: "Birim fiyat (TL)" },
              { key: "hypothesis", label: "Hipotez notu", type: "text", width: "30%" },
            ]}
          />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Fiyat listesi, gelir kanalları haritası ve gelir olmayan kalemler genel tablolardır;{" "}
            <strong className="text-foreground">Fiyat ve gelir kanalları</strong> sekmesinde girilir.
            Aylık tahsilat takibi ise <strong className="text-foreground">İşletme sermayesi</strong>{" "}
            sekmesindedir.
          </p>


          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Satış hunisi varsayımları</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Aylık yeni müşteri = lead × demo dönüşümü × ödeyene dönüşüm. Dönem sonu aktif hesap =
                önceki dönem + yeni − churn.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                id="monthsPerPeriod"
                label="Dönem uzunluğu (ay)"
                value={draft.feasibility.funnel.monthsPerPeriod}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, monthsPerPeriod: value },
                  })
                }
              />
              <NumberField
                id="startingAccounts"
                label="Başlangıç aktif hesap"
                value={draft.feasibility.funnel.startingAccounts}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, startingAccounts: value },
                  })
                }
              />
              <NumberField
                id="monthlyLeads"
                label="Aylık yeni lead"
                value={draft.feasibility.funnel.monthlyLeads}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, monthlyLeads: value },
                  })
                }
              />
              <NumberField
                id="demoRate"
                label="Demo/pilot dönüşümü (%)"
                value={draft.feasibility.funnel.demoRate}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, demoRate: value },
                  })
                }
              />
              <NumberField
                id="payingRate"
                label="Ödeyene dönüşüm (%)"
                value={draft.feasibility.funnel.payingRate}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, payingRate: value },
                  })
                }
              />
              <NumberField
                id="monthlyChurnRate"
                label="Aylık churn (%)"
                value={draft.feasibility.funnel.monthlyChurnRate}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, monthlyChurnRate: value },
                  })
                }
              />
              <NumberField
                id="targetAccounts"
                label="Hedef aktif lisans (çıpa)"
                value={draft.feasibility.funnel.targetAccounts}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, targetAccounts: value },
                  })
                }
              />
              <NumberField
                id="targetMonth"
                label="Hedef ay"
                value={draft.feasibility.funnel.targetMonth}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    funnel: { ...draft.feasibility.funnel, targetMonth: value },
                  })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Tablo 4.4-2 · Değişken maliyet girdileri
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Hesap başına maliyetler bu girdilerden türetilir: personel = (kişi × yıllık maliyet) ÷
                hesap sayısı, malzeme = bulut/API faturası ÷ hesap sayısı, dağıtım = komisyon oranı ×
                birim fiyat + faturalama yazılımı payı.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                id="supportHeadcount"
                label="Destek/CS personel sayısı"
                value={draft.feasibility.variable.supportHeadcount}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, supportHeadcount: value },
                  })
                }
              />
              <NumberField
                id="annualCostPerSupportStaff"
                label="Kişi başı yıllık maliyet (maaş + SGK)"
                value={draft.feasibility.variable.annualCostPerSupportStaff}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, annualCostPerSupportStaff: value },
                  })
                }
              />
              <NumberField
                id="accountsPerStaff"
                label="Personel başına hesap sayısı"
                hint="Dönem adedi girilmediğinde kullanılır"
                value={draft.feasibility.variable.accountsPerStaff}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, accountsPerStaff: value },
                  })
                }
              />
              <NumberField
                id="annualCloudApiCost"
                label="Yıllık toplam bulut + API maliyeti"
                value={draft.feasibility.variable.annualCloudApiCost}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, annualCloudApiCost: value },
                  })
                }
              />
              <NumberField
                id="cloudCostPerAccount"
                label="Hesap başına bulut maliyeti (varsa)"
                hint="Girilirse toplam fatura yerine bu kullanılır"
                value={draft.feasibility.variable.cloudCostPerAccount}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, cloudCostPerAccount: value },
                  })
                }
              />
              <NumberField
                id="annualEnergyCost"
                label="Yıllık enerji maliyeti"
                hint="Kendi donanımı yoksa 0 bırakın"
                value={draft.feasibility.variable.annualEnergyCost}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, annualEnergyCost: value },
                  })
                }
              />
              <NumberField
                id="paymentCommissionRate"
                label="Ödeme komisyon oranı (%)"
                value={draft.feasibility.variable.paymentCommissionRate}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, paymentCommissionRate: value },
                  })
                }
              />
              <NumberField
                id="annualBillingSoftwareCost"
                label="Yıllık faturalama yazılımı gideri"
                value={draft.feasibility.variable.annualBillingSoftwareCost}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, annualBillingSoftwareCost: value },
                  })
                }
              />
              <NumberField
                id="otherVariablePerAccount"
                label="Diğer değişken maliyet (hesap başına)"
                value={draft.feasibility.variable.otherVariablePerAccount}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    variable: { ...draft.feasibility.variable, otherVariablePerAccount: value },
                  })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Tablo 4.4-3 · Sabit maliyetler</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Yatırımlar faydalı ömre bölünerek amortisman olarak yazılır. Kullanımla artan bulut
                maliyeti buraya değil değişken maliyetlere girer.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                id="equipmentInvestment"
                label="Makine ve teçhizat yatırımı"
                value={draft.feasibility.fixed.equipmentInvestment}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    fixed: { ...draft.feasibility.fixed, equipmentInvestment: value },
                  })
                }
              />
              <NumberField
                id="equipmentUsefulLifeYears"
                label="Teçhizat faydalı ömür (yıl)"
                value={draft.feasibility.fixed.equipmentUsefulLifeYears}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    fixed: { ...draft.feasibility.fixed, equipmentUsefulLifeYears: value },
                  })
                }
              />
              <NumberField
                id="buildingInvestment"
                label="Bina / tadilat yatırımı"
                hint="Mülk yoksa 0"
                value={draft.feasibility.fixed.buildingInvestment}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    fixed: { ...draft.feasibility.fixed, buildingInvestment: value },
                  })
                }
              />
              <NumberField
                id="buildingUsefulLifeYears"
                label="Bina faydalı ömür (yıl)"
                value={draft.feasibility.fixed.buildingUsefulLifeYears}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    fixed: { ...draft.feasibility.fixed, buildingUsefulLifeYears: value },
                  })
                }
              />
              <NumberField
                id="annualRent"
                label="Yıllık kira ve taahhütlü altyapı"
                value={draft.feasibility.fixed.annualRent}
                onChange={(value) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    fixed: { ...draft.feasibility.fixed, annualRent: value },
                  })
                }
              />
            </div>
            <RepeatTable
              label="Diğer sabit maliyet kalemleri"
              description="Çekirdek ekip bordrosu, yazılım abonelikleri, hukuk/muhasebe, sigorta, KVKK uyum danışmanlığı."
              rows={draft.feasibility.fixed.otherItems}
              emptyRow={emptyFixedItemRow}
              onChange={(rows) =>
                patch("feasibility", {
                  ...draft.feasibility,
                  fixed: { ...draft.feasibility.fixed, otherItems: rows },
                })
              }
              addLabel="Kalem ekle"
              columns={[
                { key: "name", label: "Kalem", type: "text", width: "60%" },
                { key: "amount", label: "Yıllık tutar (TL)" },
              ]}
            />
          </section>

          <div className="border border-border bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Anlık BEP önizlemesi</h3>
            {feasibilityPreview.current ? (
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Harmanlanmış fiyat</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAmount(feasibilityPreview.current.blendedPrice)} TL
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Birim ürün maliyeti</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAmount(feasibilityPreview.current.variable.total)} TL
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Katkı payı</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAmount(feasibilityPreview.current.contribution)} TL
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">BEP</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAmount(feasibilityPreview.current.bepAccounts, 1)} lisans /{" "}
                    {formatAmount(feasibilityPreview.current.bepRevenue)} TL
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Dönem kâr/zararı</dt>
                  <dd className="font-medium tabular-nums">
                    {formatAmount(feasibilityPreview.current.profit)} TL
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Katman fiyatlarını ve en az bir dönem adedini girdiğinizde hesaplama burada görünür.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ilkyil" className="space-y-6 border border-border bg-card p-4">
          <div className="border-l-2 border-accent-foreground/40 bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            İlk yıl için <strong className="text-foreground">Ar-Ge maliyeti</strong> ve{" "}
            <strong className="text-foreground">şirket (işletme) maliyeti</strong> ayrı hesaplanır. Her
            kalemi <strong className="text-foreground">yalnızca bir satıra</strong> yazın ve Ar-Ge payını
            yüzde olarak belirtin; kalan kısım otomatik olarak şirket maliyetine gider. Ar-Ge payı + şirket
            payı = kalem tutarı olduğu için mükerrer kayıt oluşmaz. Tutarlar TL.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="firstYearLabel"
              label="Dönem adı"
              placeholder="Örn. Yıl 1"
              value={draft.feasibility.firstYear.label}
              onChange={(value) =>
                patch("feasibility", {
                  ...draft.feasibility,
                  firstYear: { ...draft.feasibility.firstYear, label: value },
                })
              }
            />
            <div className="flex items-start gap-3 pt-6">
              <Checkbox
                id="useForFirstPeriod"
                checked={draft.feasibility.firstYear.useForFirstPeriod}
                onCheckedChange={(checked) =>
                  patch("feasibility", {
                    ...draft.feasibility,
                    firstYear: {
                      ...draft.feasibility.firstYear,
                      useForFirstPeriod: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="useForFirstPeriod" className="text-xs leading-relaxed text-muted-foreground">
                İlk dönemin sabit maliyeti bu defterden gelsin (Tablo 4.4-3 yerine). Böylece ilk yıl Ar-Ge
                yükü iki kez sayılmaz.
              </Label>
            </div>
          </div>

          <RepeatTable
            label="İlk yıl maliyet defteri"
            description="Ar-Ge payı: %100 tamamen Ar-Ge, %0 tamamen şirket, arası paylaşımlı kalem. Amortisman yılı 0 ise tutar ilk yıl doğrudan gider yazılır; 0'dan büyükse aktifleştirilip faydalı ömre bölünür."
            rows={draft.feasibility.firstYear.items}
            emptyRow={emptyFirstYearCostRow}
            onChange={(rows) =>
              patch("feasibility", {
                ...draft.feasibility,
                firstYear: { ...draft.feasibility.firstYear, items: rows },
              })
            }
            addLabel="Maliyet kalemi ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "26%" },
              { key: "amount", label: "İlk yıl tutarı (TL)" },
              { key: "rdShareRate", label: "Ar-Ge payı (%)" },
              { key: "amortizationYears", label: "Amortisman (yıl)" },
              { key: "note", label: "Not", type: "text", width: "22%" },
            ]}
          />

          <div className="border border-border bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Anlık ayrım</h3>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Ar-Ge maliyeti</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(firstYearPreview.rdTotal)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Şirket maliyeti</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(firstYearPreview.companyTotal)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Toplam</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(firstYearPreview.grandTotal)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">İlk yıl gideri</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(firstYearPreview.firstYearCharge)} TL
                </dd>
              </div>
            </dl>
            {firstYearPreview.duplicateWarnings.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-destructive">
                {firstYearPreview.duplicateWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="giderler" className="space-y-6 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Bu defter genel bir tablodur: şirketin her harcaması burada tek satırda ve tek bir kez
            girilir. Atıf oranı kalemi böler — örneğin pazarlama personelinin %30'u B2C edinimine
            ayrılıyorsa yalnız %30'u CAC havuzuna girer. CAC'e girmeyen kalemleri de yazın; doğru
            yerde (Ürün COGS, Ürün operasyon, Ar-Ge / ürün OPEX, Genel yönetim, Uzman hizmet
            maliyeti) tutulduklarında kanal CAC'ine karışmazlar. B2B CAC / Yönlendirme CAC
            kovasındaki satırlarda kanal adını kanal tablosuyla aynı yazın; atfedilen pay kanal
            CAC'ine oradan gelir, ayrıca CAC alt kalemi eklemeyin. Geçerli yerler:{" "}
            {cacBuckets.join(", ")}. Tutarlar TL, oranlar %.
          </p>

          <RepeatTable
            label="Ham faaliyet gideri defteri"
            description="Her harcama bir kez girilir; buradan B2B CAC, B2C CAC, ürün operasyonu ve genel yönetime dağıtılır — aynı gider iki kez sayılmaz."
            rows={draft.acquisition.spendLedger}
            emptyRow={emptySpendLedgerRow}
            onChange={(rows) =>
              patch("acquisition", { ...draft.acquisition, spendLedger: rows })
            }
            addLabel="Harcama kalemi ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "20%" },
              { key: "mainClass", label: "Ana sınıf", type: "text", width: "14%" },
              { key: "bucket", label: "Yer", type: "text", width: "12%" },
              { key: "channel", label: "Kanal", type: "text", width: "12%" },
              { key: "period", label: "Dönem", type: "text", width: "8%" },
              { key: "amount", label: "Tutar (TL)" },
              { key: "attributionRate", label: "Atıf oranı (%)" },
              { key: "note", label: "Not", type: "text", width: "14%" },
            ]}
          />

          <RepeatTable
            label="Ana maliyet katmanları"
            description="Hangi katmanın B2C CAC'e girdiği burada tanımlanır."
            rows={draft.acquisition.costLayers}
            emptyRow={emptyCostLayerRow}
            onChange={(rows) => patch("acquisition", { ...draft.acquisition, costLayers: rows })}
            addLabel="Katman ekle"
            columns={[
              { key: "layer", label: "Katman", type: "text", width: "22%" },
              { key: "scope", label: "Kapsam", type: "text", width: "40%" },
              { key: "cacTreatment", label: "B2C CAC'e girer mi?", type: "text", width: "38%" },
            ]}
          />

          <RepeatTable
            label="Sabit işletme bütçesi (yıllık)"
            description="CAC tablosunda görünen paylar bu bütçenin B2C'ye tahsis edilen kısmıdır; yeni gider değildir."
            rows={draft.acquisition.fixedOpexGroups}
            emptyRow={emptyFixedOpexGroupRow}
            onChange={(rows) => patch("acquisition", { ...draft.acquisition, fixedOpexGroups: rows })}
            addLabel="Grup ekle"
            columns={[
              { key: "group", label: "Grup", type: "text", width: "24%" },
              { key: "content", label: "İçerik", type: "text", width: "50%" },
              { key: "annualAmount", label: "Yıllık tutar (TL)" },
            ]}
          />

          <RepeatTable
            label="Kalem → doğru maliyet yeri"
            rows={draft.acquisition.costPlacements}
            emptyRow={emptyCostPlacementRow}
            onChange={(rows) => patch("acquisition", { ...draft.acquisition, costPlacements: rows })}
            addLabel="Eşleme ekle"
            columns={[
              { key: "item", label: "Kalem", type: "text", width: "50%" },
              { key: "costPlace", label: "Doğru maliyet yeri", type: "text", width: "50%" },
            ]}
          />
        </TabsContent>


        <TabsContent value="edinim" className="space-y-6 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Bu sekme yalnızca B2C edinim planına aittir. Maliyet katmanları, sabit işletme bütçesi
            ve “kalem → doğru maliyet yeri” eşlemesi genel tablolardır;{" "}
            <strong className="text-foreground">Faaliyet giderleri</strong> sekmesinde girilir.
          </p>



          <RepeatTable
            label="Kanal başına ölçülecek metrik"
            rows={draft.acquisition.channelMetrics}
            emptyRow={emptyChannelMetricRow}
            onChange={(rows) => patch("acquisition", { ...draft.acquisition, channelMetrics: rows })}
            addLabel="Kanal metriği ekle"
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "40%" },
              { key: "metric", label: "Ölçülecek metrik", type: "text", width: "60%" },
            ]}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="b2c-plan-period"
              label="Plan dönemi"
              value={draft.acquisition.b2cPlan.period}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cPlan: { ...draft.acquisition.b2cPlan, period: value },
                })
              }
            />
            <NumberField
              id="b2c-plan-cac-target"
              label="Hedef freemium CAC üst sınırı (TL)"
              value={draft.acquisition.b2cPlan.cacTarget}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cPlan: { ...draft.acquisition.b2cPlan, cacTarget: value },
                })
              }
            />
            <NumberField
              id="b2c-plan-store-commission"
              label="Mağaza içi tahsilat komisyonu (%)"
              value={draft.acquisition.b2cPlan.storeCommissionRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cPlan: { ...draft.acquisition.b2cPlan, storeCommissionRate: value },
                })
              }
            />
          </div>

          <RepeatTable
            label="Kanal bazlı uygun ücretsiz ebeveyn hedefi"
            description="Ortak maliyetler bu hedef payına göre kanallara dağıtılır."
            rows={draft.acquisition.b2cPlan.channels}
            emptyRow={emptyPlanChannelRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2cPlan: { ...draft.acquisition.b2cPlan, channels: rows },
              })
            }
            addLabel="Kanal ekle"
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "50%" },
              { key: "eligibleTarget", label: "Uygun ücretsiz ebeveyn hedefi" },
            ]}
          />

          <RepeatTable
            label="B2C CAC maliyet havuzu"
            description="Kanal alanı boş bırakılan kalemler ortak maliyet sayılır ve hedef payına göre dağıtılır. Nakit etkisi peşin ödemelerde P&L payından farklı olabilir."
            rows={draft.acquisition.b2cPlan.poolItems}
            emptyRow={emptyPlanPoolItemRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2cPlan: { ...draft.acquisition.b2cPlan, poolItems: rows },
              })
            }
            addLabel="Maliyet kalemi ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "22%" },
              { key: "calculation", label: "Hesaplama", type: "text", width: "26%" },
              { key: "channel", label: "Kanal (boş = ortak)", type: "text", width: "20%" },
              { key: "pnlAmount", label: "P&L maliyeti (TL)" },
              { key: "cashAmount", label: "Nakit etkisi (TL)" },
            ]}
          />

          <RepeatTable
            label="B2C ürün maliyeti (COGS) kalemleri"
            rows={draft.acquisition.b2cCogs}
            emptyRow={emptyB2cCogsRow}
            onChange={(rows) => patch("acquisition", { ...draft.acquisition, b2cCogs: rows })}
            addLabel="COGS kalemi ekle"
            columns={[
              { key: "item", label: "Kalem", type: "text", width: "34%" },
              { key: "calculation", label: "Hesaplama", type: "text", width: "38%" },
              { key: "layer", label: "Durum", type: "text", width: "28%" },
            ]}
          />

          <RepeatTable
            label="Dönem sonu kanıt tablosu"
            description="Gerçekleşen harcama ve gerçekleşen uygun ücretsiz ebeveyn adedi girilince gerçek freemium CAC hesaplanır."
            rows={draft.acquisition.b2cPlan.actuals}
            emptyRow={emptyPlanActualRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2cPlan: { ...draft.acquisition.b2cPlan, actuals: rows },
              })
            }
            addLabel="Kanal satırı ekle"
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "34%" },
              { key: "actualSpend", label: "Gerçek harcama (TL)" },
              { key: "actualEligible", label: "Uygun ücretsiz ebeveyn" },
              { key: "chatbotAssistedCompletion", label: "Chatbot destekli tamamlanma" },
            ]}
          />

          <p className="text-sm text-muted-foreground">
            Harcama kalemleri artık "Faaliyet giderleri" sekmesindeki genel defterde tek satırda
            tutulur; atfedilen paylar kanal CAC'ine oradan gelir.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Cohort bazlı kazanım tabloları</h3>
                <p className="text-xs text-muted-foreground">
                  Her cohort (Mart, Nisan, Mayıs, Haziran …) ayrı tutulur. Uygun ücretsiz ebeveyn =
                  onam + gelişim öyküsü + teknik kalite + paket ekranı görüntüleme.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patch("acquisition", {
                    ...draft.acquisition,
                    b2cCohorts: [...draft.acquisition.b2cCohorts, { cohort: "", channels: [] }],
                  })
                }
              >
                Cohort ekle
              </Button>
            </div>

            {draft.acquisition.b2cCohorts.map((cohort, index) => (
              <div key={index} className="space-y-3 border border-border p-3">
                <div className="flex items-end gap-3">
                  <div className="w-56">
                    <TextField
                      id={`cohort-${index}`}
                      label="Cohort"
                      placeholder="Örn. Mart 2028"
                      value={cohort.cohort}
                      onChange={(value) =>
                        patch("acquisition", {
                          ...draft.acquisition,
                          b2cCohorts: draft.acquisition.b2cCohorts.map((row, i) =>
                            i === index ? { ...row, cohort: value } : row,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch("acquisition", {
                        ...draft.acquisition,
                        b2cCohorts: draft.acquisition.b2cCohorts.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Cohort'u sil
                  </Button>
                </div>

                <RepeatTable
                  label="Kanal bazlı harcama ve kazanım"
                  rows={cohort.channels}
                  emptyRow={emptyCohortChannelRow}
                  onChange={(rows) =>
                    patch("acquisition", {
                      ...draft.acquisition,
                      b2cCohorts: draft.acquisition.b2cCohorts.map((row, i) =>
                        i === index ? { ...row, channels: rows } : row,
                      ),
                    })
                  }
                  addLabel="Kanal ekle"
                  columns={[
                    { key: "channel", label: "Kanal", type: "text", width: "30%" },
                    { key: "spend", label: "Harcama (TL)" },
                    { key: "eligibleFreeParents", label: "Uygun ücretsiz ebeveyn" },
                    { key: "paidParents", label: "Ücretli ebeveyn" },
                  ]}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="basicPrice"
              label="Basic aylık fiyat (TL)"
              value={draft.acquisition.b2cUnit.basicPrice}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, basicPrice: value },
                })
              }
            />
            <NumberField
              id="premiumPrice"
              label="Premium aylık fiyat (TL)"
              value={draft.acquisition.b2cUnit.premiumPrice}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, premiumPrice: value },
                })
              }
            />
            <NumberField
              id="b2cCommission"
              label="Ödeme komisyonu (%)"
              value={draft.acquisition.b2cUnit.paymentCommissionRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, paymentCommissionRate: value },
                })
              }
            />
            <NumberField
              id="techCostPerUser"
              label="Kullanıcı/rapor başına teknik maliyet (TL/ay)"
              value={draft.acquisition.b2cUnit.techCostPerUser}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, techCostPerUser: value },
                })
              }
            />
            <NumberField
              id="supportCostPerUser"
              label="Kullanıcı başına destek maliyeti (TL/ay)"
              value={draft.acquisition.b2cUnit.supportCostPerUser}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, supportCostPerUser: value },
                })
              }
            />
            <NumberField
              id="basicChurn"
              label="Basic aylık churn (%)"
              value={draft.acquisition.b2cUnit.basicChurnRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, basicChurnRate: value },
                })
              }
            />
            <NumberField
              id="premiumChurn"
              label="Premium aylık churn (%)"
              value={draft.acquisition.b2cUnit.premiumChurnRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, premiumChurnRate: value },
                })
              }
            />
            <NumberField
              id="basicMix"
              label="Ücretli portföyde Basic payı (%)"
              hint="Premium payı otomatik 100 − Basic"
              value={draft.acquisition.b2cUnit.basicMixRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, basicMixRate: value },
                })
              }
            />
            <NumberField
              id="freeToPaid"
              label="Ücretsizden ücretliye dönüşüm (%)"
              hint="Boş bırakılırsa cohort tablolarından hesaplanır"
              value={draft.acquisition.b2cUnit.freeToPaidRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2cUnit: { ...draft.acquisition.b2cUnit, freeToPaidRate: value },
                })
              }
            />
          </div>

          <div className="border border-border bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Anlık sonuç</h3>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Freemium CAC</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.blendedFreemiumCac)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Ücretli CAC</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.measuredPaidCac)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Karma LTV</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.blendedLtv)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">LTV / CAC</dt>
                <dd className="font-medium tabular-nums">
                  {formatRatio(acquisitionPreview.b2cLtvToCac, 2)}
                </dd>
              </div>
            </dl>
            {acquisitionPreview.warnings.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-destructive">
                {acquisitionPreview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="b2b" className="space-y-6 border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Sabit maliyetler lisans başına dağıtılırken yıl sonu hedefi değil, yıl içindeki ortalama
            aktif lisans eşdeğeri kullanılır: Ocak–Aralık aktif lisans toplamı ÷ 12.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="licensePrice"
              label="Yıllık lisans fiyatı (TL)"
              value={draft.acquisition.b2bLicense.licensePrice}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2bLicense: { ...draft.acquisition.b2bLicense, licensePrice: value },
                })
              }
            />
            <NumberField
              id="reportsPerLicense"
              label="Lisans başına yıllık rapor"
              value={draft.acquisition.b2bLicense.reportsPerLicense}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2bLicense: { ...draft.acquisition.b2bLicense, reportsPerLicense: value },
                })
              }
            />
            <NumberField
              id="onlineShare"
              label="Çevrim içi tahsil edilen pay (%)"
              hint="EFT/havale payına komisyon uygulanmaz"
              value={draft.acquisition.b2bLicense.onlineCollectionShare}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2bLicense: { ...draft.acquisition.b2bLicense, onlineCollectionShare: value },
                })
              }
            />
            <NumberField
              id="b2bCommission"
              label="Sanal POS komisyonu (%)"
              value={draft.acquisition.b2bLicense.paymentCommissionRate}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2bLicense: { ...draft.acquisition.b2bLicense, paymentCommissionRate: value },
                })
              }
            />
            <NumberField
              id="annualSupportCost"
              label="Yıllık müşteri destek maliyeti (TL)"
              value={draft.acquisition.b2bLicense.annualSupportCost}
              onChange={(value) =>
                patch("acquisition", {
                  ...draft.acquisition,
                  b2bLicense: { ...draft.acquisition.b2bLicense, annualSupportCost: value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Aylık aktif lisans (Ocak–Aralık)</h3>
                <p className="text-xs text-muted-foreground">
                  Aktif lisans eşdeğeri:{" "}
                  {formatAmount(acquisitionPreview.b2b.activeLicenseEquivalent, 1)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patch("acquisition", {
                    ...draft.acquisition,
                    b2bLicense: {
                      ...draft.acquisition.b2bLicense,
                      monthlyActiveLicenses: Array.from({ length: 12 }, (_, i) =>
                        draft.acquisition.b2bLicense.monthlyActiveLicenses[i] ?? 0,
                      ),
                    },
                  })
                }
              >
                12 ay oluştur
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {draft.acquisition.b2bLicense.monthlyActiveLicenses.map((value, index) => (
                <NumberField
                  key={index}
                  id={`activeLicense-${index}`}
                  label={monthLabels[index] ?? `${index + 1}. ay`}
                  value={value}
                  onChange={(next) =>
                    patch("acquisition", {
                      ...draft.acquisition,
                      b2bLicense: {
                        ...draft.acquisition.b2bLicense,
                        monthlyActiveLicenses: draft.acquisition.b2bLicense.monthlyActiveLicenses.map(
                          (row, i) => (i === index ? next : row),
                        ),
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>

          <RepeatTable
            label="Rapor başına doğrudan teknik maliyet"
            description="GPU / inference, ek teknik işlem, ses-veri depolama, OTP/SMS, e-posta gibi kalemler."
            rows={draft.acquisition.b2bLicense.perReport}
            emptyRow={emptyPerReportCostRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2bLicense: { ...draft.acquisition.b2bLicense, perReport: rows },
              })
            }
            addLabel="Teknik kalem ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "50%" },
              { key: "unitCost", label: "Rapor başına (TL)" },
            ]}
          />

          <RepeatTable
            label="Sabit ürün operasyon maliyeti"
            description="Karma kullanımlı kalemlerde (ChatGPT, Google Workspace, ofis, muhasebe, hukuk) ürün kullanım payı girin; %100 dağıtmayın. Payı ancak kanıt (saat kaydı, kullanım payı, destek talebi sayısı) ölçüldüğünde girin; ölçülmediyse %0 bırakın."
            rows={draft.acquisition.b2bLicense.fixedOps}
            emptyRow={emptyFixedOpsRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2bLicense: { ...draft.acquisition.b2bLicense, fixedOps: rows },
              })
            }
            addLabel="Operasyon kalemi ekle"
            columns={[
              { key: "name", label: "Kalem", type: "text", width: "30%" },
              { key: "annualAmount", label: "Yıllık tutar (TL)" },
              { key: "allocationKey", label: "Kanıt / dağıtım anahtarı", type: "text", width: "34%" },
              { key: "productShareRate", label: "Ürün kullanım payı (%)" },
            ]}
          />

          <RepeatTable
            label="CAC kanalları ve yeni lisans"
            rows={draft.acquisition.b2bLicense.cacChannels}
            emptyRow={emptyCacChannelRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2bLicense: { ...draft.acquisition.b2bLicense, cacChannels: rows },
              })
            }
            addLabel="Kanal ekle"
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "60%" },
              { key: "newLicenses", label: "Yeni lisans" },
            ]}
          />

          <RepeatTable
            label="CAC alt kalemleri"
            description="Kanal adını yukarıdaki kanal tablosuyla aynı yazın; kanal CAC'i alt kalem toplamı ÷ yeni lisans olarak hesaplanır."
            rows={draft.acquisition.b2bLicense.cacItems}
            emptyRow={emptyCacItemRow}
            onChange={(rows) =>
              patch("acquisition", {
                ...draft.acquisition,
                b2bLicense: { ...draft.acquisition.b2bLicense, cacItems: rows },
              })
            }
            addLabel="Alt kalem ekle"
            columns={[
              { key: "name", label: "Alt kalem", type: "text", width: "44%" },
              { key: "channel", label: "Kanal", type: "text", width: "28%" },
              { key: "amount", label: "Tutar (TL)" },
            ]}
          />

          <div className="border border-border bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Anlık maliyet kartı</h3>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Doğrudan hesap maliyeti</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.b2b.directAccountCost)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">CAC öncesi tam maliyet</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.b2b.fullCostBeforeCac)} TL
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Ağırlıklı CAC</dt>
                <dd className="font-medium tabular-nums">
                  {formatAmount(acquisitionPreview.b2b.weightedB2bCac)} TL
                </dd>
              </div>
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="yorum" className="space-y-6 border border-border bg-card p-4">

          <p className="text-sm text-muted-foreground">
            "Neredeyiz" ve "Neden buradayız" yorumları rakamlardan otomatik üretilir. Buraya yalnızca
            ek notlarınızı ve aksiyon planını girersiniz.
          </p>
          <RepeatTable
            label="Ek notlar"
            rows={draft.narrative.notes}
            emptyRow={{ text: "" }}
            onChange={(rows) => patch("narrative", { ...draft.narrative, notes: rows })}
            columns={[{ key: "text", label: "Not", type: "text" }]}
          />
          <RepeatTable
            label="Aksiyon planı"
            rows={draft.narrative.actions}
            emptyRow={{ action: "", owner: "", due: "" }}
            onChange={(rows) => patch("narrative", { ...draft.narrative, actions: rows })}
            columns={[
              { key: "action", label: "Aksiyon", type: "text", width: "50%" },
              { key: "owner", label: "Sorumlu", type: "text" },
              { key: "due", label: "Termin", type: "text" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
