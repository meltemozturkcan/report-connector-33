import { createFileRoute } from "@tanstack/react-router";

import { AppShell, EmptyState } from "@/components/report/AppShell";
import { DataTable } from "@/components/report/DataTable";
import { Insight } from "@/components/report/Insight";
import { KpiCard } from "@/components/report/KpiCard";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { useAcquisition } from "@/hooks/useReport";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";

export const Route = createFileRoute("/edinim")({
  head: () => ({
    meta: [
      { title: "Edinim ve Birim Maliyet — Morvoi Yönetim Raporu" },
      {
        name: "description",
        content:
          "Cohort bazlı gerçek freemium CAC, ücretli B2C CAC duyarlılığı, Basic/Premium birim ekonomisi ve B2B lisansın edinim dâhil tam maliyet kartı.",
      },
      { property: "og:title", content: "Edinim ve Birim Maliyet" },
      {
        property: "og:description",
        content:
          "Freemium CAC'i kanal ve cohort bazında ölç, ücretli CAC'i dönüşümle test et, lisans başına tam maliyeti gör.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcquisitionPage,
});

const tl = (value: number, digits = 0) => `${formatAmount(value, digits)} TL`;

function AcquisitionPage() {
  const model = useAcquisition();

  if (!model.hasAcquisitionData) {
    return (
      <AppShell>
        <PageHeader
          title="Edinim ve Birim Maliyet"
          description="Gerçek freemium CAC, ücretli CAC ve lisans başına tam maliyet tabloları. Veri Girişi → Edinim (B2C) ve B2B lisans maliyeti sekmelerinden veri girildiğinde tüm tablolar hesaplanır."
        />
        <EmptyState />
      </AppShell>
    );
  }

  const b2b = model.b2b;

  return (
    <AppShell>
      <PageHeader
        title="Edinim ve Birim Maliyet"
        description="Üç hesap ayrı tutulur: (1) freemium ebeveyni kaça kazandığımız, (2) bu maliyetin Basic/Premium ekonomisinde sürdürülebilir olup olmadığı, (3) B2B lisansın edinim dâhil tam maliyeti. Tutarlar TL, oranlar %."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Blended freemium CAC" value={tl(model.blendedFreemiumCac)} />
        <KpiCard
          label="Ölçülen ücretsiz → ücretli dönüşüm"
          value={formatPercent(model.measuredConversionRate, 1)}
        />
        <KpiCard label="Ücretli B2C CAC" value={tl(model.measuredPaidCac)} />
        <KpiCard
          label="Karma LTV / ücretli CAC"
          value={formatRatio(model.b2cLtvToCac, 2)}
          delta={{ text: "Hedef 3,0x", tone: model.b2cLtvToCac >= 3 ? "positive" : "negative" }}
        />
      </div>

      {model.warnings.length > 0 ? (
        <div className="border border-destructive/40 bg-destructive/5 px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Kontrol edilmesi gereken kayıtlar</h2>
          <ul className="mt-2 space-y-1 text-sm text-destructive">
            {model.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section
        title="Edinim harcaması defteri"
        description="Her kalem tek satırda ve tek kovada durur; atıf oranı kalemi böler. Atfedilen pay + dağıtılmayan pay = kalem tutarı olduğu için aynı gider iki yerde sayılamaz. Yalnızca CAC kovaları kanal CAC hesabına girer."
      >
        <DataTable
          caption="Edinim harcaması defteri"
          rowKey={(row) => `${row.name}-${row.bucket}-${row.period}`}
          rows={model.ledger}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            { header: "Yer", cell: (row) => row.bucket },
            { header: "Dönem", cell: (row) => row.period || "—" },
            { header: "Tutar", align: "right", cell: (row) => tl(row.amount) },
            {
              header: "Atıf oranı",
              align: "right",
              cell: (row) => formatPercent(row.attributionRate, 0),
            },
            { header: "Atfedilen", align: "right", cell: (row) => tl(row.attributedAmount) },
            { header: "Dağıtılmayan", align: "right", cell: (row) => tl(row.unallocatedAmount) },
            { header: "CAC'e girer mi?", cell: (row) => (row.countsInCac ? "Evet" : "Hayır") },
          ]}
        />

        <div className="mt-4">
          <DataTable
            caption="Kova bazında toplamlar"
            rowKey={(row) => row.bucket}
            rows={model.bucketTotals}
            columns={[
              { header: "Yer", cell: (row) => row.bucket },
              { header: "Kalem tutarı", align: "right", cell: (row) => tl(row.amount) },
              { header: "Atfedilen", align: "right", cell: (row) => tl(row.attributedAmount) },
              { header: "Dağıtılmayan", align: "right", cell: (row) => tl(row.unallocatedAmount) },
              { header: "CAC'e girer mi?", cell: (row) => (row.countsInCac ? "Evet" : "Hayır") },
            ]}
          />
        </div>

        <Insight question="Mükerrerlik nasıl engelleniyor?">
          B2C edinim havuzu {tl(model.b2cCacPool)}, B2B edinim havuzu {tl(model.b2bCacPool)},
          yönlendirme havuzu {tl(model.referralCacPool)}. CAC dışı kovalardaki{" "}
          {tl(model.excludedPool)} (GPU/işlem/depolama, POS komisyonu, uzman emeği, Ar-Ge, muhasebe ve
          ofis gibi) hiçbir kanal CAC'ine yazılmaz; dağıtılmayan {tl(model.unallocatedTotal)} genel
          tarafta kalır.
        </Insight>
      </Section>

      {model.cohorts.map((cohort) => (
        <Section
          key={cohort.cohort}
          title={`Gerçek freemium CAC — ${cohort.cohort} cohort'u`}
          description="Payda sabit: onam + gelişim öyküsü + teknik kaliteyi geçen kayıt + paket ekranı görüntüleme. Site ziyaretçisi, sosyal medya erişimi veya yalnızca kayıt olan kişi paydaya girmez."
        >
          <DataTable
            caption={`${cohort.cohort} cohort'u kanal bazlı freemium CAC`}
            rowKey={(row) => row.channel}
            rows={[
              ...cohort.channels,
              {
                channel: "Toplam",
                spend: cohort.totalSpend,
                eligibleFreeParents: cohort.totalEligible,
                freemiumCac: cohort.blendedFreemiumCac,
                paidParents: cohort.totalPaid,
                paidCac: cohort.blendedPaidCac,
                spendShare: 100,
              },
            ]}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Harcama", align: "right", cell: (row) => tl(row.spend) },
              {
                header: "Uygun ücretsiz ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.eligibleFreeParents),
              },
              {
                header: "Gerçek freemium CAC",
                align: "right",
                cell: (row) => (row.eligibleFreeParents > 0 ? tl(row.freemiumCac) : "—"),
              },
              {
                header: "Ücretli ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.paidParents),
              },
              {
                header: "Kanal ücretli CAC",
                align: "right",
                cell: (row) => (row.paidParents > 0 ? tl(row.paidCac) : "—"),
              },
              { header: "Harcama payı", align: "right", cell: (row) => formatPercent(row.spendShare, 0) },
            ]}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Toplam harcama / toplam uygun ebeveyn = {tl(cohort.blendedFreemiumCac)}; bu cohort'un
            ücretsizden ücretliye dönüşümü {formatPercent(cohort.conversionRate, 1)}.
          </p>
        </Section>
      ))}

      {model.cohorts.length > 1 ? (
        <Section
          title="Cohort karşılaştırma"
          description="Aynı payda tanımıyla ölçülen cohort'ların kazanım maliyeti seyri."
        >
          <DataTable
            caption="Cohort karşılaştırma"
            rowKey={(row) => row.cohort}
            rows={model.cohorts}
            columns={[
              { header: "Cohort", cell: (row) => row.cohort },
              { header: "Harcama", align: "right", cell: (row) => tl(row.totalSpend) },
              {
                header: "Uygun ücretsiz ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.totalEligible),
              },
              {
                header: "Freemium CAC",
                align: "right",
                cell: (row) => (row.totalEligible > 0 ? tl(row.blendedFreemiumCac) : "—"),
              },
              {
                header: "Dönüşüm",
                align: "right",
                cell: (row) => formatPercent(row.conversionRate, 1),
              },
              {
                header: "Ücretli CAC",
                align: "right",
                cell: (row) => (row.totalPaid > 0 ? tl(row.blendedPaidCac) : "—"),
              },
            ]}
          />
        </Section>
      ) : null}

      <Section
        title="Ücretli B2C CAC duyarlılığı"
        description="Ücretli B2C CAC = freemium CAC ÷ ücretsizden ücretliye dönüşüm. Freemium CAC düşük görünse de dönüşüm düşükse ücretli müşteri pahalıya gelir."
      >
        <DataTable
          caption="Dönüşüm oranına göre ücretli CAC"
          rowKey={(row) => String(row.conversionRate)}
          rows={model.conversionScenarios}
          columns={[
            {
              header: "Ücretsizden ücretliye dönüşüm",
              cell: (row) =>
                `${formatPercent(row.conversionRate, 0)}${row.isMeasured ? " (ölçülen)" : ""}`,
            },
            {
              header: `${tl(model.blendedFreemiumCac)} freemium CAC ile ücretli CAC`,
              align: "right",
              cell: (row) => tl(row.paidCac),
            },
          ]}
        />
        <Insight question="Bu maliyet sürdürülebilir mi?">
          Ölçülen dönüşüm {formatPercent(model.measuredConversionRate, 1)} olduğunda ücretli CAC{" "}
          {tl(model.measuredPaidCac)}; karma LTV {tl(model.blendedLtv)} ve aylık karma katkı{" "}
          {tl(model.blendedContribution)} ile geri ödeme{" "}
          {formatAmount(model.b2cPaybackMonths, 1)} ay, LTV/CAC {formatRatio(model.b2cLtvToCac, 2)}.
        </Insight>
      </Section>

      <Section
        title="Basic / Premium birim ekonomisi"
        description="Ödeme komisyonu sonrası net gelirden ürünün doğrudan teknik maliyeti ve aktif hesap destek maliyeti düşülür; churn beklenen abonelik süresini, süre de LTV'yi belirler."
      >
        <DataTable
          caption="Basic ve Premium birim ekonomisi"
          rowKey={(row) => row.name}
          rows={model.packages}
          columns={[
            { header: "Paket", cell: (row) => row.name },
            { header: "Aylık fiyat", align: "right", cell: (row) => tl(row.monthlyPrice) },
            { header: "Ödeme komisyonu", align: "right", cell: (row) => tl(row.commission, 2) },
            { header: "Net gelir", align: "right", cell: (row) => tl(row.netRevenue, 2) },
            { header: "Teknik maliyet", align: "right", cell: (row) => tl(row.techCost, 2) },
            { header: "Destek maliyeti", align: "right", cell: (row) => tl(row.supportCost, 2) },
            { header: "Aylık katkı", align: "right", cell: (row) => tl(row.contribution, 2) },
            {
              header: "Katkı oranı",
              align: "right",
              cell: (row) => formatPercent(row.contributionRate, 1),
            },
            { header: "Aylık churn", align: "right", cell: (row) => formatPercent(row.churnRate, 1) },
            {
              header: "Beklenen süre (ay)",
              align: "right",
              cell: (row) => formatAmount(row.expectedLifetimeMonths, 1),
            },
            { header: "LTV", align: "right", cell: (row) => tl(row.ltv) },
            { header: "Karma payı", align: "right", cell: (row) => formatPercent(row.mixShare, 0) },
          ]}
        />
      </Section>

      <Section
        title="B2B profesyonel lisans — doğrudan teknik maliyet"
        description="Rapor başına maliyetler lisans başına yıllık rapor adediyle çarpılır. Ödeme komisyonu yalnızca çevrim içi tahsil edilen paya uygulanır."
      >
        <DataTable
          caption="Doğrudan teknik maliyet"
          rowKey={(row) => row.name}
          rows={[
            ...b2b.perReport,
            {
              name: "Teknik COGS",
              unitCost: b2b.perReportUnitTotal,
              licenseYearCost: b2b.techCogs,
            },
          ]}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            { header: "Rapor başına", align: "right", cell: (row) => tl(row.unitCost, 2) },
            {
              header: `Lisans-yıl (${formatAmount(b2b.reportsPerLicense)} rapor)`,
              align: "right",
              cell: (row) => tl(row.licenseYearCost),
            },
          ]}
        />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Ödeme altyapısı komisyonu</dt>
            <dd className="text-sm font-medium tabular-nums">{tl(b2b.paymentCommission)}</dd>
          </div>
          <div className="border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Müşteri destek payı</dt>
            <dd className="text-sm font-medium tabular-nums">{tl(b2b.supportPerLicense)}</dd>
          </div>
          <div className="border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Aktif lisans eşdeğeri</dt>
            <dd className="text-sm font-medium tabular-nums">
              {formatAmount(b2b.activeLicenseEquivalent, 1)}
            </dd>
          </div>
          <div className="border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Hesap başına doğrudan maliyet</dt>
            <dd className="text-sm font-medium tabular-nums">{tl(b2b.directAccountCost)}</dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Sabit ürün operasyon maliyeti"
        description="Bu kalemler lisans başına tek tek oluşmaz: önce yıllık toplanır, karma kullanımlı kalemlerde ürün payı alınır, sonra yıl içindeki ortalama aktif lisans eşdeğerine bölünür (yıl sonu hedefine değil)."
      >
        <DataTable
          caption="Sabit ürün operasyon maliyeti"
          rowKey={(row) => row.name}
          rows={[
            ...b2b.fixedOps,
            {
              name: "Toplam ürün operasyon maliyeti",
              annualAmount: b2b.fixedOps.reduce((sum, row) => sum + row.annualAmount, 0),
              productShareRate: 100,
              productAmount: b2b.fixedOpsAnnualTotal,
              perLicense: b2b.fixedOpsPerLicense,
            },
          ]}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            { header: "Yıllık tutar", align: "right", cell: (row) => tl(row.annualAmount) },
            {
              header: "Ürün kullanım payı",
              align: "right",
              cell: (row) => formatPercent(row.productShareRate, 0),
            },
            { header: "Ürüne düşen", align: "right", cell: (row) => tl(row.productAmount) },
            { header: "Lisans başına", align: "right", cell: (row) => tl(row.perLicense, 2) },
          ]}
        />
      </Section>

      <Section
        title="B2B CAC alt kırılımı"
        description="CAC ilk satın alma yılında lisansa yüklenir, yenilemede yeniden yazılmaz. Kanal CAC'i = o kanalın alt kalem toplamı ÷ o kanaldan kazanılan yeni lisans."
      >
        {b2b.cacChannels.map((channel) => (
          <div key={channel.channel} className="mb-5">
            <h3 className="text-sm font-medium text-foreground">{channel.channel}</h3>
            <DataTable
              caption={`${channel.channel} CAC alt kalemleri`}
              rowKey={(row) => row.name}
              rows={[
                ...channel.items,
                { name: `${channel.channel} toplamı`, amount: channel.spend },
              ]}
              columns={[
                { header: "Alt kalem", cell: (row) => row.name },
                { header: "Tutar", align: "right", cell: (row) => tl(row.amount) },
              ]}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {formatAmount(channel.newLicenses)} yeni lisans → kanal CAC {tl(channel.cac)}
            </p>
          </div>
        ))}
        <DataTable
          caption="Kanal bazlı CAC özeti"
          rowKey={(row) => row.channel}
          rows={[
            ...b2b.cacChannels,
            {
              channel: "Toplam / ağırlıklı",
              newLicenses: b2b.b2bNewLicenses,
              spend: b2b.b2bCacSpend,
              cac: b2b.weightedB2bCac,
              items: [],
            },
          ]}
          columns={[
            { header: "Kanal", cell: (row) => row.channel },
            { header: "Yeni lisans", align: "right", cell: (row) => formatAmount(row.newLicenses) },
            { header: "CAC", align: "right", cell: (row) => tl(row.cac) },
            { header: "Toplam harcama", align: "right", cell: (row) => tl(row.spend) },
          ]}
        />
      </Section>

      <Section
        title="Tam ürün maliyeti ve katkı özeti"
        description="Lisans fiyatı üzerinden katman katman katkı: CAC öncesi tam maliyet ve kanal CAC'i düşüldükten sonra ilk yıl katkısı."
      >
        <DataTable
          caption="Tam ürün maliyeti"
          rowKey={(row) => row.label}
          rows={[
            { label: "Teknik COGS", value: b2b.techCogs },
            { label: "Ödeme komisyonu", value: b2b.paymentCommission },
            { label: "Müşteri destek payı", value: b2b.supportPerLicense },
            { label: "Doğrudan hesap maliyeti", value: b2b.directAccountCost },
            { label: "Sabit ürün operasyon maliyeti payı", value: b2b.fixedOpsPerLicense },
            { label: "CAC öncesi tam ürün maliyeti", value: b2b.fullCostBeforeCac },
            { label: "Ağırlıklı CAC", value: b2b.weightedB2bCac },
          ]}
          columns={[
            { header: "Katman", cell: (row) => row.label },
            { header: "Lisans-yıl maliyeti", align: "right", cell: (row) => tl(row.value) },
          ]}
        />
        <div className="mt-4">
          <DataTable
            caption="Katkı özeti"
            rowKey={(row) => row.label}
            rows={b2b.contributionSummary}
            columns={[
              { header: "Görünüm", cell: (row) => row.label },
              {
                header: `${tl(b2b.licensePrice)} satış fiyatında`,
                align: "right",
                cell: (row) => tl(row.value),
              },
            ]}
          />
        </div>
        <Insight question="Ne anlama geliyor?">
          İlk yılda satış büyümesini finanse ettiğiniz için tam maliyet bazında başa başa yakın
          olabilirsiniz: ağırlıklı CAC ile ilk yıl katkısı{" "}
          {tl(b2b.licensePrice - b2b.fullCostBeforeCac - b2b.weightedB2bCac)}. Yenileme yılında CAC
          yüklenmediği için aynı lisansın katkısı {tl(b2b.licensePrice - b2b.fullCostBeforeCac)}'ye
          çıkar. B2C ve kurum lisansı için ayrı maliyet kartı tutulur; bu karta eklenmez.
        </Insight>
      </Section>
    </AppShell>
  );
}
