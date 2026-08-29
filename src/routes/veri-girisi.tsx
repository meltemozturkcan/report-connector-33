import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { NumberField, RepeatTable, TextField } from "@/components/entry/fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useReportInput } from "@/hooks/useReport";
import { computeReport } from "@/lib/report-calc";
import {
  emptyMonthlyRow,
  emptyUnitEconomicsRow,
  reportInputSchema,
  type ReportInput,
} from "@/lib/report-schema";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

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
          <TabsTrigger value="butce">Bütçe</TabsTrigger>
          <TabsTrigger value="nakit">İşletme sermayesi</TabsTrigger>
          <TabsTrigger value="finansman">Borç ve CAPEX</TabsTrigger>
          <TabsTrigger value="tahmin">Yıl sonu tahmini</TabsTrigger>
          <TabsTrigger value="birim">CAC / LTV</TabsTrigger>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              id="budgetFullYearSales"
              label="Yıllık bütçe — satış"
              value={draft.forecast.budgetFullYearSales}
              onChange={(value) => patch("forecast", { ...draft.forecast, budgetFullYearSales: value })}
            />
            <NumberField
              id="budgetFullYearEbitda"
              label="Yıllık bütçe — FAVÖK"
              value={draft.forecast.budgetFullYearEbitda}
              onChange={(value) =>
                patch("forecast", { ...draft.forecast, budgetFullYearEbitda: value })
              }
            />
            <NumberField
              id="budgetFullYearNetCash"
              label="Yıllık bütçe — net nakit"
              value={draft.forecast.budgetFullYearNetCash}
              onChange={(value) =>
                patch("forecast", { ...draft.forecast, budgetFullYearNetCash: value })
              }
            />
            <NumberField
              id="remainingMonths"
              label="Kalan ay sayısı"
              hint="Baz senaryo: yılbaşından bugüne gerçekleşme + kalan aylara run-rate"
              value={draft.forecast.remainingMonths}
              onChange={(value) => patch("forecast", { ...draft.forecast, remainingMonths: value })}
            />
            <NumberField
              id="worstCaseDelta"
              label="Kötümser senaryo sapması (%)"
              value={draft.forecast.worstCaseDelta}
              onChange={(value) => patch("forecast", { ...draft.forecast, worstCaseDelta: value })}
            />
            <NumberField
              id="bestCaseDelta"
              label="İyimser senaryo sapması (%)"
              value={draft.forecast.bestCaseDelta}
              onChange={(value) => patch("forecast", { ...draft.forecast, bestCaseDelta: value })}
            />
          </div>
          <RepeatTable
            label="Tahmini etkileyen unsurlar"
            rows={draft.forecast.drivers}
            emptyRow={{ name: "", impact: "", note: "" }}
            onChange={(rows) => patch("forecast", { ...draft.forecast, drivers: rows })}
            columns={[
              { key: "name", label: "Unsur", type: "text", width: "25%" },
              { key: "impact", label: "Etki", type: "text", width: "25%" },
              { key: "note", label: "Not", type: "text" },
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
          <RepeatTable
            label="Kanal bazlı kazanım"
            rows={draft.cac.byChannel}
            emptyRow={{ channel: "", spend: 0, newCustomers: 0 }}
            onChange={(rows) => patch("cac", { ...draft.cac, byChannel: rows })}
            columns={[
              { key: "channel", label: "Kanal", type: "text", width: "40%" },
              { key: "spend", label: "Harcama" },
              { key: "newCustomers", label: "Yeni müşteri" },
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
