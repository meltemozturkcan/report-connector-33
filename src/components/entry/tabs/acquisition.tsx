import type { EntryTabProps } from "@/components/entry/types";
import { Button } from "@/components/ui/button";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable, TextField } from "@/components/entry/fields";
import {
  emptyB2cCogsRow,
  emptyChannelMetricRow,
  emptyCohortChannelRow,
  emptyPlanActualRow,
  emptyPlanChannelRow,
  emptyPlanPoolItemRow,
} from "@/lib/report-schema";
import { formatAmount, formatRatio } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function AcquisitionTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const acquisition = models.acquisition;
  const plan = acquisition.b2cPlan;
  const b2cCard = models.projection.unitEconomics[1];

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Bu sekme yalnızca B2C edinim planına aittir. Maliyet katmanları, sabit işletme bütçesi ve
        “kalem → doğru maliyet yeri” eşlemesi genel tablolardır;{" "}
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
              Her cohort (Mart, Nisan, Mayıs, Haziran …) ayrı tutulur. Uygun ücretsiz ebeveyn = onam
              + gelişim öyküsü + teknik kalite + paket ekranı görüntüleme.
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

      <LinkedResults
        reports={["/edinim", "/cac", "/ltv", "/tahmin"]}
        items={[
          {
            label: "Freemium CAC (cohort)",
            value: `${formatAmount(acquisition.blendedFreemiumCac)} TL`,
            hint: "Harcama ÷ uygun ücretsiz ebeveyn",
          },
          {
            label: "Ücretli CAC",
            value:
              acquisition.measuredPaidCac > 0
                ? `${formatAmount(acquisition.measuredPaidCac)} TL`
                : "Dönüşüm ölçülmedi",
            hint: `Freemium CAC ÷ %${formatAmount(acquisition.measuredConversionRate, 1)} dönüşüm`,
          },
          {
            label: "Karma LTV",
            value: `${formatAmount(acquisition.blendedLtv)} TL`,
            hint: "Basic / Premium katkı × beklenen ömür",
          },
          {
            label: "LTV / CAC",
            value: b2cCard?.ltvToCac != null ? formatRatio(b2cCard.ltvToCac, 2) : "Ölçülmeli",
            tone:
              b2cCard?.ltvToCac == null
                ? "neutral"
                : b2cCard.ltvToCac >= 3
                  ? "positive"
                  : "negative",
            hint: b2cCard?.note,
          },
          ...(plan.eligibleTotal > 0
            ? [
                {
                  label: `Plan freemium CAC (${plan.period || "dönem"})`,
                  value: `${formatAmount(plan.freemiumCac, 2)} TL`,
                  tone: plan.buffer >= 0 ? ("positive" as const) : ("negative" as const),
                  hint:
                    plan.buffer >= 0
                      ? `Üst sınırın ${formatAmount(plan.buffer)} TL altında`
                      : `Üst sınır ${formatAmount(-plan.buffer)} TL aşıldı`,
                },
              ]
            : []),
        ]}
        warnings={acquisition.warnings}
      />
    </>
  );
}
