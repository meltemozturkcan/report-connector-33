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
        title="Ana maliyet katmanları"
        description="Hangi katmanın B2C CAC'e girdiği tek yerde tanımlanır; bir kalem yalnızca kendi katmanında sayılır."
      >
        <DataTable
          caption="Ana maliyet katmanları"
          rowKey={(row) => row.layer}
          rows={model.costLayers}
          columns={[
            { header: "Katman", cell: (row) => row.layer },
            { header: "Kapsam", cell: (row) => row.scope || "—" },
            { header: "B2C CAC'e girer mi?", cell: (row) => row.cacTreatment || "—" },
          ]}
        />
      </Section>

      <Section
        title="Sabit işletme bütçesi"
        description="Yıllık sabit OPEX grupları. CAC tablolarında görünen paylar bu bütçenin B2C'ye tahsis edilmiş kısmıdır; yeni gider değildir."
      >
        <DataTable
          caption="Sabit işletme bütçesi"
          rowKey={(row) => row.group}
          rows={[
            ...model.fixedOpexGroups,
            { group: "Toplam sabit OPEX", content: "", annualAmount: model.fixedOpexTotal },
          ]}
          columns={[
            { header: "Grup", cell: (row) => row.group },
            { header: "İçerik", cell: (row) => row.content || "—" },
            { header: "Yıllık tutar", align: "right", cell: (row) => tl(row.annualAmount) },
          ]}
        />
      </Section>

      {model.costPlacements.length > 0 ? (
        <Section
          title="Kalem → doğru maliyet yeri"
          description="Aynı kalemin iki bütçede sayılmasını engelleyen eşleme listesi."
        >
          <DataTable
            caption="Kalem ve doğru maliyet yeri"
            rowKey={(row) => row.item}
            rows={model.costPlacements}
            columns={[
              { header: "Kalem", cell: (row) => row.item },
              { header: "Doğru maliyet yeri", cell: (row) => row.costPlace || "—" },
            ]}
          />
        </Section>
      ) : null}

      {model.channelMetrics.length > 0 ? (
        <Section
          title="Kanal başına ölçülecek metrik"
          description="Her kanalın paydası aynı tanımla ölçülür: uygun ücretsiz ebeveyn."
        >
          <DataTable
            caption="Kanal metrikleri"
            rowKey={(row) => row.channel}
            rows={model.channelMetrics}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Ölçülecek metrik", cell: (row) => row.metric || "—" },
            ]}
          />
        </Section>
      ) : null}

      {model.b2cPlan.channels.length > 0 ? (
        <Section
          title={`B2C edinim hedefi — ${model.b2cPlan.period || "dönem girilmedi"}`}
          description="Uygun ücretsiz ebeveyn hedefi kanal bazında. Chatbot ayrı kanal değildir; bu kanallardan gelen ebeveynin ücretsiz akışı tamamlama oranını artıran dönüşüm desteğidir."
        >
          <DataTable
            caption="Kanal bazlı uygun ücretsiz ebeveyn hedefi"
            rowKey={(row) => row.channel}
            rows={[
              ...model.b2cPlan.channels,
              {
                channel: "Toplam",
                eligibleTarget: model.b2cPlan.eligibleTotal,
                eligibleShare: 100,
                directCost: model.b2cPlan.directCost,
                sharedCost: model.b2cPlan.sharedCost,
                totalCost: model.b2cPlan.pool,
                plannedCac: model.b2cPlan.freemiumCac,
              },
            ]}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              {
                header: "Uygun ücretsiz ebeveyn hedefi",
                align: "right",
                cell: (row) => formatAmount(row.eligibleTarget, 0),
              },
              { header: "Pay", align: "right", cell: (row) => formatPercent(row.eligibleShare, 1) },
            ]}
          />
        </Section>
      ) : null}

      {model.b2cPlan.poolItems.length > 0 ? (
        <Section
          title="B2C CAC maliyet havuzu"
          description="Kanala atanmış kalemler doğrudan maliyet, atanmamış kalemler ortak maliyettir. Kâr-zarar maliyeti ile nakit etkisi ayrı sütunlarda durur; peşin ödemeler nakit etkisini yükseltir."
        >
          <DataTable
            caption="B2C CAC maliyet havuzu"
            rowKey={(row) => row.name}
            rows={[
              ...model.b2cPlan.poolItems,
              {
                name: "B2C CAC maliyet havuzu",
                calculation: "Doğrudan + ortak maliyet",
                channel: "Toplam",
                isShared: false,
                pnlAmount: model.b2cPlan.pool,
                cashAmount: model.b2cPlan.cashPool,
              },
            ]}
            columns={[
              { header: "Kalem", cell: (row) => row.name },
              { header: "Hesaplama", cell: (row) => row.calculation || "—" },
              { header: "Kanal", cell: (row) => row.channel || "Ortak" },
              { header: "P&L maliyeti", align: "right", cell: (row) => tl(row.pnlAmount) },
              { header: "Nakit etkisi", align: "right", cell: (row) => tl(row.cashAmount) },
            ]}
          />
        </Section>
      ) : null}

      {model.b2cPlan.eligibleTotal > 0 ? (
        <Section
          title="Freemium CAC hedef testi"
          description="Hedef CAC üst sınırı ile planlanan havuz karşılaştırılır; tampon küçükse tek bir kalemdeki artış hedefi aşar."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="CAC üst sınırı" value={tl(model.b2cPlan.cacCeiling)} />
            <KpiCard label="B2C CAC maliyet havuzu" value={tl(model.b2cPlan.pool)} />
            <KpiCard
              label="Bütçe tamponu"
              value={tl(model.b2cPlan.buffer)}
              delta={{
                text: model.b2cPlan.buffer >= 0 ? "Hedef içinde" : "Hedef aşıldı",
                tone: model.b2cPlan.buffer >= 0 ? "positive" : "negative",
              }}
            />
            <KpiCard label="Planlanan freemium CAC" value={tl(model.b2cPlan.freemiumCac, 2)} />
          </div>

          <div className="mt-4">
            <DataTable
              caption="Kanal bazlı maliyet görünümü"
              rowKey={(row) => row.channel}
              rows={[
                ...model.b2cPlan.channels,
                {
                  channel: "Toplam",
                  eligibleTarget: model.b2cPlan.eligibleTotal,
                  eligibleShare: 100,
                  directCost: model.b2cPlan.directCost,
                  sharedCost: model.b2cPlan.sharedCost,
                  totalCost: model.b2cPlan.pool,
                  plannedCac: model.b2cPlan.freemiumCac,
                },
              ]}
              columns={[
                { header: "Kanal", cell: (row) => row.channel },
                { header: "Doğrudan maliyet", align: "right", cell: (row) => tl(row.directCost) },
                { header: "Ortak maliyet payı", align: "right", cell: (row) => tl(row.sharedCost) },
                { header: "Toplam maliyet", align: "right", cell: (row) => tl(row.totalCost) },
                {
                  header: "Uygun ücretsiz ebeveyn",
                  align: "right",
                  cell: (row) => formatAmount(row.eligibleTarget, 0),
                },
                { header: "Planlanan CAC", align: "right", cell: (row) => tl(row.plannedCac, 2) },
              ]}
            />
          </div>

          <div className="mt-4">
            <Insight question="Hedefi hangi kanal taşıyor?">
              Ücretli kanalların planlanan CAC'i hedefin üstünde; toplamı hedefe indiren şey mağaza
              ve organik içerik kaynaklı düşük maliyetli uygun ebeveyn adedidir. Organik adet
              gerçekleşmezse hedef CAC varsayımı geçersizdir.
            </Insight>
          </div>
        </Section>
      ) : null}

      {model.b2cPlan.paidParents > 0 ? (
        <Section
          title="Ücretsizden ücretliye dönüşüm ve ilk ay geliri"
          description="Ücretli CAC = planlanan freemium CAC ÷ dönüşüm. Mağaza komisyonu CAC değil, ürün maliyetidir."
        >
          <DataTable
            caption="Dönüşüm ve ilk ay geliri"
            rowKey={(row) => row.label}
            rows={[
              {
                label: "Uygun ücretsiz ebeveyn",
                calc: "Kanal hedefleri toplamı",
                value: formatAmount(model.b2cPlan.eligibleTotal, 0),
              },
              {
                label: "Ücretliye dönüşüm",
                calc: `${formatAmount(model.b2cPlan.eligibleTotal, 0)} × ${formatPercent(model.b2cPlan.conversionRate, 0)}`,
                value: formatAmount(model.b2cPlan.paidParents, 2),
              },
              {
                label: "Yeni Basic",
                calc: "Ücretli × Basic payı",
                value: formatAmount(model.b2cPlan.basicParents, 2),
              },
              {
                label: "Yeni Premium",
                calc: "Ücretli × Premium payı",
                value: formatAmount(model.b2cPlan.premiumParents, 2),
              },
              {
                label: "Basic geliri",
                calc: "Yeni Basic × Basic fiyatı",
                value: tl(model.b2cPlan.basicRevenue, 2),
              },
              {
                label: "Premium geliri",
                calc: "Yeni Premium × Premium fiyatı",
                value: tl(model.b2cPlan.premiumRevenue, 2),
              },
              {
                label: "İlk ay brüt B2C geliri",
                calc: "Basic + Premium",
                value: tl(model.b2cPlan.grossRevenue, 2),
              },
              {
                label: "Ücretli B2C CAC",
                calc: "Maliyet havuzu ÷ yeni ücretli ebeveyn",
                value: tl(model.b2cPlan.paidCac, 2),
              },
              {
                label: `Mağaza komisyonu (%${formatAmount(model.b2cPlan.storeCommissionRate, 0)})`,
                calc: "Mağaza içi tahsilat × komisyon — ürün COGS'u",
                value: tl(model.b2cPlan.storeCommission, 2),
              },
            ]}
            columns={[
              { header: "Metrik", cell: (row) => row.label },
              { header: "Hesap", cell: (row) => row.calc },
              { header: "Sonuç", align: "right", cell: (row) => row.value },
            ]}
          />
        </Section>
      ) : null}

      {model.b2cCogs.length > 0 ? (
        <Section
          title="B2C ürün maliyeti — CAC'ten ayrı katman"
          description="Aynı tahsilata hem mağaza komisyonu hem sanal POS komisyonu yazılmaz."
        >
          <DataTable
            caption="B2C ürün maliyeti kalemleri"
            rowKey={(row) => row.item}
            rows={model.b2cCogs}
            columns={[
              { header: "Kalem", cell: (row) => row.item },
              { header: "Hesaplama", cell: (row) => row.calculation || "—" },
              { header: "Durum", cell: (row) => row.layer || "—" },
            ]}
          />
        </Section>
      ) : null}

      {model.b2cPlan.actuals.length > 0 ? (
        <Section
          title={`Dönem sonu kanıt tablosu — ${model.b2cPlan.period || "dönem girilmedi"}`}
          description="Hedef CAC ancak gerçekleşen harcama ve gerçekleşen uygun ebeveyn adediyle doğrulanmış sayılır."
        >
          <DataTable
            caption="Gerçekleşen freemium CAC"
            rowKey={(row) => row.channel}
            rows={[
              ...model.b2cPlan.actuals,
              {
                channel: "Toplam",
                actualSpend: model.b2cPlan.actualSpend,
                actualEligible: model.b2cPlan.actualEligible,
                actualCac: model.b2cPlan.actualCac,
                chatbotAssistedCompletion: 0,
              },
            ]}
            columns={[
              { header: "Kanal", cell: (row) => row.channel },
              { header: "Gerçek harcama", align: "right", cell: (row) => tl(row.actualSpend) },
              {
                header: "Uygun ücretsiz ebeveyn",
                align: "right",
                cell: (row) => formatAmount(row.actualEligible, 0),
              },
              {
                header: "Gerçek freemium CAC",
                align: "right",
                cell: (row) => (row.actualEligible > 0 ? tl(row.actualCac, 2) : "—"),
              },
              {
                header: "Chatbot destekli tamamlanma",
                align: "right",
                cell: (row) =>
                  row.chatbotAssistedCompletion > 0
                    ? formatAmount(row.chatbotAssistedCompletion, 0)
                    : "—",
              },
            ]}
          />
        </Section>
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
        description="Bu kalemler lisans başına tek tek oluşmaz: önce yıllık toplanır, karma kullanımlı kalemlerde ürün payı alınır, sonra yıl içindeki ortalama aktif lisans eşdeğerine bölünür (yıl sonu hedefine değil). Ürün kullanım payı %0 ise kanıt (dağıtım anahtarı) henüz ölçülmemiştir; o kalem lisans maliyetine yüklenmez."
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
              allocationKey: "",
            },
          ]}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            { header: "Yıllık tutar", align: "right", cell: (row) => tl(row.annualAmount) },
            {
              header: "Kanıt / dağıtım anahtarı",
              cell: (row) => row.allocationKey || "—",
            },
            {
              header: "Ürün kullanım payı",
              align: "right",
              cell: (row) =>
                row.productShareRate > 0 ? formatPercent(row.productShareRate, 0) : "Ölçülmeli",
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
