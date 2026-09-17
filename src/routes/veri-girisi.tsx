import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { entryTabs, isEntryTabId, type EntryTabId } from "@/components/entry/entry-tabs";
import { AcquisitionTab } from "@/components/entry/tabs/acquisition";
import { B2bLicenseTab } from "@/components/entry/tabs/b2b-license";
import { BudgetTab } from "@/components/entry/tabs/budget";
import { FeasibilityTab } from "@/components/entry/tabs/feasibility";
import { FinancingTab } from "@/components/entry/tabs/financing";
import { FirstYearTab } from "@/components/entry/tabs/first-year";
import { GeneralTab } from "@/components/entry/tabs/general";
import { MonthlyTab } from "@/components/entry/tabs/monthly";
import { NarrativeTab } from "@/components/entry/tabs/narrative";
import { OpexLedgerTab } from "@/components/entry/tabs/opex-ledger";
import { PricingTab } from "@/components/entry/tabs/pricing";
import { ProjectionTab } from "@/components/entry/tabs/projection";
import { SalesTab } from "@/components/entry/tabs/sales";
import { UnitEconomicsTab } from "@/components/entry/tabs/unit-economics";
import { WorkingCapitalTab } from "@/components/entry/tabs/working-capital";
import type { EntryTabProps, PatchFn } from "@/components/entry/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useReportWorkspace } from "@/hooks/report-workspace";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

/**
 * Veri girişi.
 * Her sekme src/components/entry/tabs altında ayrı bir bileşendir. Sekmeler
 * ortak çalışma kopyasını düzenler; sonuçlar sekmenin altında ve tüm rapor
 * sayfalarında anında güncellenir, değişiklikler otomatik kaydedilir.
 */

const tabComponents: Record<EntryTabId, ComponentType<EntryTabProps>> = {
  genel: GeneralTab,
  aylik: MonthlyTab,
  satis: SalesTab,
  fiyat: PricingTab,
  butce: BudgetTab,
  nakit: WorkingCapitalTab,
  finansman: FinancingTab,
  tahmin: ProjectionTab,
  birim: UnitEconomicsTab,
  fizibilite: FeasibilityTab,
  ilkyil: FirstYearTab,
  giderler: OpexLedgerTab,
  edinim: AcquisitionTab,
  b2b: B2bLicenseTab,
  yorum: NarrativeTab,
};

const sectionLabels: Record<string, string> = {
  meta: "Genel",
  monthly: "Aylık veriler",
  sales: "Satış",
  budget: "Bütçe",
  workingCapital: "İşletme sermayesi",
  financing: "Borç",
  capex: "CAPEX",
  projection: "Projeksiyon",
  forecast: "Yıl sonu tahmini (eski)",
  unitEconomics: "Birim ekonomisi",
  cac: "CAC",
  ltv: "LTV",
  feasibility: "Fizibilite",
  acquisition: "Edinim ve giderler",
  narrative: "Yorum ve aksiyon",
};

export const Route = createFileRoute("/veri-girisi")({
  validateSearch: (search: Record<string, unknown>): { sekme?: EntryTabId } =>
    isEntryTabId(search["sekme"]) ? { sekme: search["sekme"] } : {},
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
        content:
          "Ham verileri girin, marj, sapma, nakit döngüsü ve yıl sonu tahmini otomatik hesaplansın.",
      },
    ],
  }),
  component: DataEntryPage,
});

function DataEntryPage() {
  const { session, isLoading: authLoading } = useAuth();
  const workspace = useReportWorkspace();
  const { input: draft, models, invalidSections } = workspace;
  const { sekme } = Route.useSearch();
  const navigate = useNavigate({ from: "/veri-girisi" });
  const activeTab: EntryTabId = sekme ?? "genel";

  const patch: PatchFn = (key, value) =>
    workspace.update((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    const ok = await workspace.saveNow();
    if (ok) toast.success("Rapor verileri kaydedildi");
    else toast.error("Kaydedilemedi — ayrıntı kaydet düğmesinin yanında.");
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

  const report = models.report;
  const b2cCard = models.projection.unitEconomics[1];
  const b2bCard = models.projection.unitEconomics[0];

  return (
    <AppShell>
      <PageHeader
        title="Veri Girişi"
        description="Yalnızca ham verileri girin. Marjlar, sapmalar, nakit köprüsü, borç oranları, projeksiyon ve birim ekonomisi otomatik hesaplanır. Her sekmenin altında o verinin sonuçlarını ve ilgili rapor sayfalarını görürsünüz; değişiklikler raporlara anında yansır ve otomatik kaydedilir."
      />

      {invalidSections.length > 0 ? (
        <div
          role="alert"
          className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm leading-relaxed"
        >
          <p className="font-medium text-foreground">Kayıtlı verinin bir kısmı okunamadı</p>
          <p className="mt-1 text-muted-foreground">
            {invalidSections.map((key) => sectionLabels[key] ?? key).join(", ")} bölümü
            doğrulanamadığı için boş gösteriliyor. Diğer bölümler yüklendi. Bu bölümün sunucudaki
            kaydını ezmemek için otomatik kayıt kapatıldı; veriyi kontrol ettikten sonra “Kaydet”
            ile elle kaydedebilirsiniz.
          </p>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">FAVÖK marjı</dt>
            <dd className="font-medium tabular-nums">
              {report.hasReportData ? formatPercent(report.currentMargin.ebitda) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Net borç / FAVÖK</dt>
            <dd className="font-medium tabular-nums">
              {report.debt.leverageMeasurable ? formatRatio(report.debt.netDebtToEbitda, 2) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Dönem sonu nakit</dt>
            <dd className="font-medium tabular-nums">
              {report.hasReportData ? formatAmount(report.cashFlow.closing) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">B2B LTV / CAC</dt>
            <dd className="font-medium tabular-nums">
              {b2bCard?.ltvToCac != null ? formatRatio(b2bCard.ltvToCac, 2) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">B2C LTV / CAC</dt>
            <dd className="font-medium tabular-nums">
              {b2cCard?.ltvToCac != null ? formatRatio(b2cCard.ltvToCac, 2) : "—"}
            </dd>
          </div>
        </dl>
        <SaveControl onSave={handleSave} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isEntryTabId(value)) void navigate({ search: { sekme: value }, replace: true });
        }}
        className="space-y-4"
      >
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {entryTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              {tab.label}
              {tab.hasData(draft) ? (
                <span aria-label="veri girildi" className="size-1.5 rounded-full bg-primary" />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {entryTabs.map((tab) => {
          const TabComponent = tabComponents[tab.id];
          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="space-y-6 border border-border bg-card p-4"
            >
              <TabComponent draft={draft} patch={patch} />
            </TabsContent>
          );
        })}
      </Tabs>
    </AppShell>
  );
}

function SaveControl({ onSave }: { onSave: () => void }) {
  const { status, lastError } = useReportWorkspace();
  const label =
    status === "saving"
      ? "Kaydediliyor…"
      : status === "dirty"
        ? "Kaydedilmemiş değişiklik — birazdan otomatik kaydedilecek"
        : status === "blocked"
          ? "Otomatik kayıt kapalı — elle kaydedin"
          : status === "error"
            ? `Kaydedilemedi: ${lastError ?? "bilinmeyen hata"}`
            : status === "signed-out"
              ? "Oturum yok"
              : "Tüm değişiklikler kaydedildi";

  return (
    <div className="flex items-center gap-3">
      <p
        role="status"
        aria-live="polite"
        className={
          status === "error" || status === "blocked"
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {label}
      </p>
      <Button
        onClick={onSave}
        disabled={status === "saving" || status === "saved" || status === "signed-out"}
      >
        Kaydet
      </Button>
    </div>
  );
}
