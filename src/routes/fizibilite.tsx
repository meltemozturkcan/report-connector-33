import { createFileRoute } from "@tanstack/react-router";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { KpiCard } from "@/components/report/KpiCard";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { useFeasibility } from "@/hooks/useReport";
import { formatAmount, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/fizibilite")({
  head: () => ({
    meta: [
      { title: "Fizibilite ve Başa Baş (BEP) — Aylık Yönetim Raporu" },
      {
        name: "description",
        content:
          "Katman bazlı gelirler, birim başına değişken maliyetler, sabit maliyetler ve başa baş noktası hesaplaması tek tabloda.",
      },
      { property: "og:title", content: "Fizibilite ve Başa Baş (BEP)" },
      {
        property: "og:description",
        content: "Katkı payı, başa baş adedi, başa baş cirosu ve dönem kâr/zararı otomatik hesaplanır.",
      },
    ],
  }),
  component: FeasibilityPage,
});

function FeasibilityPage() {
  const {
    hasFeasibilityData,
    method,
    currencyNote,
    periods,
    current,
    fixedBreakdown,
    fixedTotal,
    firstYearCosts,
    otherRevenueItems,
    otherRevenueCatalogTotal,
    priceCatalog,
    nonRevenueItems,
    cashCollections,
    funnelBridge,
    funnelAssumptions,
    missingInputs,
    hypotheses,
    narrative,
  } = useFeasibility();

  if (!hasFeasibilityData || !current) {
    return (
      <AppShell>
        {priceCatalog.length > 0 || nonRevenueItems.length > 0 || cashCollections.length > 0 ? (
          <>
            <PageHeader
              title="Fizibilite ve Başa Baş Analizi"
              description="Fiyat listesi girildi. Başa baş hesabı için katman adetleri ve maliyet varsayımları da gerekiyor."
            />
            <PriceCatalogSection priceCatalog={priceCatalog} nonRevenueItems={nonRevenueItems} />
            <CashCollectionSection rows={cashCollections} />
          </>
        ) : (
          <EmptyState />
        )}
      </AppShell>
    );
  }



  return (
    <AppShell>
      <PageHeader
        title="Fizibilite ve Başa Baş Analizi"
        description="Gelirler, birim başına değişken maliyetler ve sabit maliyetler; katkı payı üzerinden başa baş noktasına bağlanır. Yöntem: katman bazlı ağırlıklı BEP hesabı, karışım oranı sabit tutularak yapılır."
      />

      <p className="text-xs text-muted-foreground">
        {currencyNote} · BEP yöntemi:{" "}
        {method === "weighted" ? "katman bazlı ağırlıklı katkı payı" : "harmanlanmış ortalama katkı payı"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Harmanlanmış birim fiyat"
          value={`${formatAmount(current.blendedPrice)} TL`}
          note="Σ(katman adedi × katman fiyatı) / toplam adet"
        />
        <KpiCard
          label="Birim ürün maliyeti"
          value={`${formatAmount(current.variable.total)} TL`}
          note="Hesap başına yıllık değişken maliyet"
        />
        <KpiCard
          label="Katkı payı"
          value={`${formatAmount(current.contribution)} TL`}
          delta={{
            text: formatPercent(current.contributionRate),
            tone: current.contribution > 0 ? "positive" : "negative",
          }}
        />
        <KpiCard
          label="Başa baş noktası"
          value={`${formatAmount(current.bepAccounts, 1)} lisans`}
          delta={{
            text: `${formatAmount(current.bepRevenue)} TL ciro`,
            tone: current.totalAccounts >= current.bepAccounts ? "positive" : "negative",
          }}
        />
      </div>

      <Section
        title="Tablo 4.4-1 — Gelirler"
        description="Aktif lisans adedi × katman fiyatı; abonelik dışı gelirlerle birlikte toplam gelir."
      >
        <DataTable
          caption="Dönem bazlı gelirler"
          rowKey={(row) => row.period}
          rows={periods}
          columns={[
            { header: "Dönem", cell: (row) => row.period },
            { header: "Aktif lisans", align: "right", cell: (row) => formatAmount(row.totalAccounts) },
            {
              header: "Harmanlanmış fiyat",
              align: "right",
              cell: (row) => formatAmount(row.blendedPrice),
            },
            {
              header: "Satış geliri",
              align: "right",
              cell: (row) => formatAmount(row.subscriptionRevenue),
            },
            { header: "Diğer gelirler", align: "right", cell: (row) => formatAmount(row.otherRevenue) },
            {
              header: "Toplam gelir",
              align: "right",
              cell: (row) => <span className="font-semibold">{formatAmount(row.totalRevenue)}</span>,
            },
          ]}
        />
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {current.period} — katman kırılımı
          </h3>
          <DataTable
            caption="Katman bazlı gelir"
            rowKey={(row) => row.name}
            rows={current.tiers}
            columns={[
              { header: "Katman", cell: (row) => row.name },
              { header: "Adet", align: "right", cell: (row) => formatAmount(row.accounts) },
              { header: "Birim fiyat", align: "right", cell: (row) => formatAmount(row.unitPrice) },
              { header: "Gelir", align: "right", cell: (row) => formatAmount(row.revenue) },
              { header: "Karışım payı", align: "right", cell: (row) => formatPercent(row.mixShare) },
            ]}
          />
        </div>
        {otherRevenueItems.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Abonelik dışı gelirler (hacim × birim fiyat)
            </h3>
            <DataTable
              caption="Diğer gelir kalemleri"
              rowKey={(row) => row.name}
              rows={otherRevenueItems}
              columns={[
                { header: "Kalem", cell: (row) => row.name },
                { header: "Hacim", align: "right", cell: (row) => formatAmount(row.volume) },
                { header: "Birim fiyat", align: "right", cell: (row) => formatAmount(row.unitPrice) },
                { header: "Tutar", align: "right", cell: (row) => formatAmount(row.total) },
                { header: "Not", cell: (row) => row.hypothesis || "—" },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Katalog toplamı {formatAmount(otherRevenueCatalogTotal)} TL. Dönem satırında ayrı bir tutar
              girilmediyse bu toplam kullanılır.
            </p>
          </div>
        ) : null}
        <div className="mt-4">
          <Insight question="Adet nereden geliyor?">
            Aylık yeni müşteri = lead × demo dönüşümü × ödeyene dönüşüm ={" "}
            {formatAmount(funnelAssumptions.monthlyNewAccounts, 1)} hesap. Dönem sonu aktif hesap = önceki
            dönem + yeni − churn. Aşağıdaki köprü, girilen adetlerin huni varsayımlarıyla tutarlı olup
            olmadığını gösterir.
          </Insight>
        </div>
      </Section>

      <PriceCatalogSection priceCatalog={priceCatalog} nonRevenueItems={nonRevenueItems} />
      <CashCollectionSection rows={cashCollections} />


      <Section
        title="Hesap sayısı köprüsü"
        description="Huni varsayımlarından aşağıdan yukarı kurulan aktif hesap sayısı ile girilen adetlerin karşılaştırması."
      >
        <DataTable
          caption="Aktif hesap köprüsü"
          rowKey={(row) => row.period}
          rows={funnelBridge}
          columns={[
            { header: "Dönem", cell: (row) => row.period },
            { header: "Açılış", align: "right", cell: (row) => formatAmount(row.opening, 1) },
            { header: "Yeni", align: "right", cell: (row) => formatAmount(row.newAccounts, 1) },
            { header: "Churn", align: "right", cell: (row) => formatAmount(row.churnedAccounts, 1) },
            { header: "Huni sonucu", align: "right", cell: (row) => formatAmount(row.closing, 1) },
            { header: "Girilen adet", align: "right", cell: (row) => formatAmount(row.enteredAccounts) },
            {
              header: "Fark",
              align: "right",
              cell: (row) => (
                <span className={row.gap === 0 ? "" : "text-muted-foreground"}>
                  {formatAmount(row.gap, 1)}
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section
        title="Tablo 4.4-2 — Değişken maliyetler (hesap başına, yıllık)"
        description="Bir müşteriyi bir yıl hizmette tutmanın maliyeti. Birim ürün maliyeti başa baş formülünde doğrudan kullanılır."
      >
        <DataTable
          caption="Birim başına değişken maliyet"
          rowKey={(row) => row.item}
          rows={[
            {
              item: "Personel maliyeti",
              value: current.variable.personnel,
              method: "(destek personeli × yıllık maliyet) ÷ hizmet verilen hesap sayısı",
            },
            {
              item: "Malzeme maliyeti (bulut + API)",
              value: current.variable.material,
              method: "toplam bulut/API faturası ÷ aktif hesap sayısı",
            },
            {
              item: "Enerji maliyeti",
              value: current.variable.energy,
              method: "kendi donanımı yoksa malzeme maliyetine dahildir",
            },
            {
              item: "Dağıtım maliyeti",
              value: current.variable.distribution,
              method: "ödeme komisyonu × birim fiyat + faturalama yazılımı payı",
            },
            {
              item: "Diğer değişken maliyet",
              value: current.variable.other,
              method: "bildirim, satış komisyonu, iade/churn kaybı gibi hacimle orantılı kalemler",
            },
            {
              item: "Birim ürün maliyeti",
              value: current.variable.total,
              method: "yukarıdaki beş kalemin toplamı",
            },
          ]}
          columns={[
            { header: "Kalem", cell: (row) => row.item },
            {
              header: "TL / hesap / yıl",
              align: "right",
              cell: (row) =>
                row.item === "Birim ürün maliyeti" ? (
                  <span className="font-semibold">{formatAmount(row.value)}</span>
                ) : (
                  formatAmount(row.value)
                ),
            },
            { header: "Hesaplama yöntemi", cell: (row) => row.method },
          ]}
        />
        <div className="mt-4">
          <Insight question="Katman farkı neden önemli?">
            Ödeme komisyonu fiyata bağlı olduğu için birim maliyet katmandan katmana değişir; bu nedenle
            katkı payı da katman bazında hesaplanır.
          </Insight>
        </div>
        <div className="mt-4">
          <DataTable
            caption="Katman bazlı katkı payı"
            rowKey={(row) => row.name}
            rows={current.tiers}
            columns={[
              { header: "Katman", cell: (row) => row.name },
              { header: "Birim fiyat", align: "right", cell: (row) => formatAmount(row.unitPrice) },
              {
                header: "Birim değişken maliyet",
                align: "right",
                cell: (row) => formatAmount(row.unitVariableCost),
              },
              { header: "Katkı payı", align: "right", cell: (row) => formatAmount(row.contribution) },
              {
                header: "Katkı marjı",
                align: "right",
                cell: (row) => formatPercent(row.contributionRate),
              },
              { header: "BEP adedi", align: "right", cell: (row) => formatAmount(row.bepAccounts, 1) },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Tablo 4.4-3 — Sabit maliyetler (dönemlik toplam)"
        description="Satış adedinden bağımsız kalemler. Toplam sabit maliyet, başa baş formülünde pay olarak kullanılır."
      >
        <DataTable
          caption="Sabit maliyetler"
          rowKey={(row) => row.item}
          rows={[
            {
              item: "Makine ve teçhizat amortismanı",
              value: fixedBreakdown.equipmentDepreciation,
              method: "yatırım tutarı ÷ faydalı ömür",
            },
            {
              item: "Bina amortisman gideri",
              value: fixedBreakdown.buildingDepreciation,
              method: "bina yatırımı ÷ faydalı ömür (mülk yoksa 0)",
            },
            { item: "Kira giderleri", value: fixedBreakdown.rent, method: "aylık kira × dönem ay sayısı" },
            {
              item: "Diğer sabit maliyetler",
              value: fixedBreakdown.other,
              method: "çekirdek ekip bordrosu, araç abonelikleri, danışmanlık, sigorta",
            },
            { item: "Toplam sabit", value: fixedTotal, method: "yukarıdaki dört kalemin toplamı" },
          ]}
          columns={[
            { header: "Kalem", cell: (row) => row.item },
            {
              header: "TL / yıl",
              align: "right",
              cell: (row) =>
                row.item === "Toplam sabit" ? (
                  <span className="font-semibold">{formatAmount(row.value)}</span>
                ) : (
                  formatAmount(row.value)
                ),
            },
            { header: "Hesaplama yöntemi", cell: (row) => row.method },
          ]}
        />
      </Section>

      {firstYearCosts.hasData ? (
        <Section
          title={`${firstYearCosts.label} — Ar-Ge maliyeti ve şirket maliyeti ayrımı`}
          description="Her kalem defterde tek satırda tutulur ve Ar-Ge payı (%) ile bölünür. Ar-Ge payı + şirket payı = kalem tutarı olduğu için aynı gider iki bütçede mükerrer sayılmaz."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Ar-Ge maliyeti (ilk yıl)"
              value={`${formatAmount(firstYearCosts.rdTotal)} TL`}
              note="Kalem tutarı × Ar-Ge payı"
            />
            <KpiCard
              label="Şirket maliyeti (ilk yıl)"
              value={`${formatAmount(firstYearCosts.companyTotal)} TL`}
              note="Kalem tutarı × (1 − Ar-Ge payı)"
            />
            <KpiCard
              label="Toplam ilk yıl maliyeti"
              value={`${formatAmount(firstYearCosts.grandTotal)} TL`}
              note="Ar-Ge + şirket; mükerrer kayıt yok"
            />
            <KpiCard
              label="Gelir tablosuna yüklenen"
              value={`${formatAmount(firstYearCosts.firstYearCharge)} TL`}
              note={`Aktifleştirilen ${formatAmount(firstYearCosts.capitalizedTotal)} TL amortismana bölünür`}
            />
          </div>

          <div className="mt-4">
            <DataTable
              caption="İlk yıl maliyet defteri"
              rowKey={(row) => row.name}
              rows={firstYearCosts.lines}
              columns={[
                { header: "Kalem", cell: (row) => row.name || "—" },
                { header: "Tutar", align: "right", cell: (row) => formatAmount(row.amount) },
                { header: "Ar-Ge payı", align: "right", cell: (row) => formatPercent(row.rdShareRate) },
                { header: "Ar-Ge", align: "right", cell: (row) => formatAmount(row.rdAmount) },
                { header: "Şirket", align: "right", cell: (row) => formatAmount(row.companyAmount) },
                {
                  header: "İlk yıl gideri",
                  align: "right",
                  cell: (row) => formatAmount(row.firstYearCharge),
                },
                {
                  header: "Muhasebe",
                  cell: (row) =>
                    row.capitalized
                      ? `Aktifleştirildi · ${formatAmount(row.amortizationYears)} yıl`
                      : "Doğrudan gider",
                },
                { header: "Not", cell: (row) => row.note || "—" },
              ]}
            />
          </div>

          {firstYearCosts.duplicateWarnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-destructive">
              {firstYearCosts.duplicateWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Mükerrerlik kontrolü: Ar-Ge ve şirket toplamı {formatAmount(firstYearCosts.grandTotal)} TL
              defter toplamına eşit; Tablo 4.4-3 ile çakışan kalem bulunmuyor.
            </p>
          )}

          <div className="mt-4">
            <Insight question="Bu ayrım başa başı nasıl etkiliyor?">
              {firstYearCosts.useForFirstPeriod
                ? "İlk dönemin sabit maliyeti bu defterden gelir (Ar-Ge + şirket, amortisman sonrası). Sonraki dönemler Tablo 4.4-3 toplamını kullanır; böylece ilk yıl Ar-Ge yükü iki kez sayılmaz."
                : "Defter yalnızca raporlama amaçlı gösteriliyor; ilk dönemin sabit maliyeti Tablo 4.4-3 toplamından geliyor."}
            </Insight>
          </div>
        </Section>
      ) : null}

      <Section
        title="Başa baş noktası ve dönem sonucu"
        description="Katkı payı = birim fiyat − birim değişken maliyet. BEP adet = sabit maliyet ÷ katkı payı."
      >
        <DataTable
          caption="Dönem bazlı BEP ve kâr/zarar"
          rowKey={(row) => row.period}
          rows={periods}
          columns={[
            { header: "Dönem", cell: (row) => row.period },
            { header: "Toplam gelir", align: "right", cell: (row) => formatAmount(row.totalRevenue) },
            { header: "Sabit maliyet", align: "right", cell: (row) => formatAmount(row.fixedCost) },
            {
              header: "Toplam değişken",
              align: "right",
              cell: (row) => formatAmount(row.variableCostTotal),
            },
            { header: "BEP (adet)", align: "right", cell: (row) => formatAmount(row.bepAccounts, 1) },
            { header: "BEP (TL)", align: "right", cell: (row) => formatAmount(row.bepRevenue) },
            {
              header: "Fiyat %20 düşerse BEP",
              align: "right",
              cell: (row) => formatAmount(row.bepAccountsAtPriceDrop, 1),
            },
            {
              header: "Sabit maliyet kaynağı",
              cell: (row) =>
                row.fixedCostSource === "override"
                  ? "Dönem satırı"
                  : row.fixedCostSource === "firstYear"
                    ? "İlk yıl defteri"
                    : "Tablo 4.4-3",
            },
            {
              header: "Güvenlik payı",
              align: "right",
              cell: (row) => formatPercent(row.marginOfSafety),
            },
            {
              header: "Kâr / zarar",
              align: "right",
              cell: (row) => (
                <span
                  className={row.profit >= 0 ? "font-semibold text-positive" : "font-semibold text-destructive"}
                >
                  {formatAmount(row.profit)}
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Neredeyiz? Neden buradayız? Bundan sonra ne yapacağız?">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Neredeyiz?
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground">
              {narrative.where.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Neden buradayız?
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground">
              {narrative.why.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bundan sonra ne yapacağız?
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground">
              {narrative.next.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {missingInputs.length > 0 || hypotheses.length > 0 ? (
        <Section
          title="Eksik / doğrulanması gereken girdiler"
          description="Tabloyu gerçek sayılarla doldurmak için tamamlanması gereken varsayımlar."
        >
          <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
            {missingInputs.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {hypotheses.map((item) => (
              <li key={item}>Hipotez: {item}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </AppShell>
  );
}

type PriceCatalogRow = { name: string; price: number; unit: string; scope: string };
type NonRevenueRow = { name: string; nature: string; condition: string; amount: number };

type CashCollectionRow = {
  period: string;
  pilotCount: number;
  pilot: number;
  annualCount: number;
  annual: number;
};

/** Nakit akışı / tahsilat takibi: ay bazında tahsil edilen adetler, tutarlar ve toplam. */
function CashCollectionSection({ rows }: { rows: CashCollectionRow[] }) {
  if (rows.length === 0) return null;
  const totals = rows.reduce(
    (acc, row) => ({
      pilotCount: acc.pilotCount + row.pilotCount,
      pilot: acc.pilot + row.pilot,
      annualCount: acc.annualCount + row.annualCount,
      annual: acc.annual + row.annual,
    }),
    { pilotCount: 0, pilot: 0, annualCount: 0, annual: 0 },
  );
  const grandTotal = totals.pilot + totals.annual;

  return (
    <Section
      title="Nakit akışı / tahsilat takibi"
      description="Yalnızca o ay faturalandırılan ve tahsil edilen tutarlar yer alır; toplam tahsilat satır toplamı olarak hesaplanır."
    >
      <DataTable
        caption="Nakit akışı ve tahsilat takibi"
        rowKey={(row) => row.period}
        rows={rows}
        columns={[
          { header: "Dönem", cell: (row) => row.period },
          { header: "Yeni ücretli pilot", align: "right", cell: (row) => formatAmount(row.pilotCount) },
          { header: "Pilot tahsilatı", align: "right", cell: (row) => formatAmount(row.pilot) },
          { header: "Yeni yıllık profesyonel abonelik", align: "right", cell: (row) => formatAmount(row.annualCount) },
          { header: "Yıllık abonelik tahsilatı", align: "right", cell: (row) => formatAmount(row.annual) },
          {
            header: "Toplam tahsilat",
            align: "right",
            cell: (row) => formatAmount(row.pilot + row.annual),
          },
        ]}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Toplam: {formatAmount(totals.pilotCount)} pilot / {formatAmount(totals.pilot)} TL,{" "}
        {formatAmount(totals.annualCount)} yıllık abonelik / {formatAmount(totals.annual)} TL — genel tahsilat{" "}
        {formatAmount(grandTotal)} TL.
      </p>
    </Section>
  );
}

type RevenueChannelRow = { channel: string; start: string; unit: string; driver: string };

/** Gelir kanalları haritası: kanal, başlangıç, gelir birimi ve ana sürücü. */
function RevenueChannelSection({ rows }: { rows: RevenueChannelRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Section
      title="Gelir kanalları haritası"
      description="Hangi kanal ne zaman devreye giriyor, geliri hangi birimden geliyor ve büyümesini ne sürüyor."
    >
      <DataTable
        caption="Gelir kanalları, başlangıç zamanı ve ana sürücüleri"
        rowKey={(row) => row.channel}
        rows={rows}
        columns={[
          { header: "Kanal", cell: (row) => row.channel },
          { header: "Başlangıç", cell: (row) => row.start || "—" },
          { header: "Gelir birimi", cell: (row) => row.unit || "—" },
          { header: "Ana sürücü", cell: (row) => row.driver || "—" },
        ]}
      />
    </Section>
  );
}

/** Referans fiyat listesi ve gelir olmayan / indirim kalemleri. */
function PriceCatalogSection({
  priceCatalog,
  nonRevenueItems,
}: {
  priceCatalog: PriceCatalogRow[];
  nonRevenueItems: NonRevenueRow[];
}) {
  if (priceCatalog.length === 0 && nonRevenueItems.length === 0) return null;

  return (
    <Section
      title="Fiyat listesi ve gelir olmayan kalemler"
      description="Tüm fiyatlar KDV hariç, 2026 baz fiyatlarıdır. Katalog referanstır; BEP hesabı katman fiyatları ve abonelik dışı gelir kalemlerinden yürür."
    >
      {priceCatalog.length > 0 ? (
        <DataTable
          caption="Gelir kalemleri fiyat listesi"
          rowKey={(row) => row.name}
          rows={priceCatalog}
          columns={[
            { header: "Gelir kalemi", cell: (row) => row.name },
            { header: "Fiyat (TL)", align: "right", cell: (row) => formatAmount(row.price) },
            { header: "Birim / dönem", cell: (row) => row.unit || "—" },
            { header: "Kapsam ve koşul", cell: (row) => row.scope || "—" },
          ]}
        />
      ) : null}
      {nonRevenueItems.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Gelir olmayan veya indirime yol açan kalemler
          </h3>
          <DataTable
            caption="Gelir olmayan ve indirim kalemleri"
            rowKey={(row) => row.name}
            rows={nonRevenueItems}
            columns={[
              { header: "Kalem", cell: (row) => row.name },
              { header: "Finansal niteliği", cell: (row) => row.nature || "—" },
              { header: "Koşul", cell: (row) => row.condition || "—" },
              {
                header: "Tutar / etki (TL)",
                align: "right",
                cell: (row) => (row.amount === 0 ? "—" : formatAmount(row.amount)),
              },
            ]}
          />
        </div>
      ) : null}
    </Section>
  );
}
