import type { EntryTabProps } from "@/components/entry/types";
import { Button } from "@/components/ui/button";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import {
  emptyCacChannelRow,
  emptyCacItemRow,
  emptyFixedOpsRow,
  emptyPerReportCostRow,
} from "@/lib/report-schema";
import { formatAmount, formatRatio } from "@/lib/format";
import { monthLabels } from "@/components/entry/types";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function B2bLicenseTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const b2b = models.acquisition.b2b;
  const b2bCard = models.projection.unitEconomics[0];

  return (
    <>
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
            <h3 className="text-sm font-medium text-foreground">
              Aylık aktif lisans (Ocak–Aralık)
            </h3>
            <p className="text-xs text-muted-foreground">
              Aktif lisans eşdeğeri:{" "}
              {formatAmount(models.acquisition.b2b.activeLicenseEquivalent, 1)}
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
                  monthlyActiveLicenses: Array.from(
                    { length: 12 },
                    (_, i) => draft.acquisition.b2bLicense.monthlyActiveLicenses[i] ?? 0,
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

      <LinkedResults
        reports={["/edinim", "/ltv", "/tahmin"]}
        items={[
          {
            label: "Aktif lisans eşdeğeri",
            value: formatAmount(b2b.activeLicenseEquivalent, 1),
            hint: "Ocak–Aralık toplamı ÷ 12",
          },
          {
            label: "Doğrudan hesap maliyeti",
            value: `${formatAmount(b2b.directAccountCost)} TL`,
            hint: "Teknik + komisyon + destek",
          },
          {
            label: "CAC öncesi tam maliyet",
            value: `${formatAmount(b2b.fullCostBeforeCac)} TL`,
            hint: `+ sabit operasyon ${formatAmount(b2b.fixedOpsPerLicense)} TL / lisans`,
          },
          {
            label: "Ağırlıklı CAC",
            value: `${formatAmount(b2b.weightedB2bCac)} TL`,
            hint: `${formatAmount(b2b.b2bNewLicenses)} yeni lisans`,
          },
          {
            label: "LTV / CAC",
            value: b2bCard?.ltvToCac != null ? formatRatio(b2bCard.ltvToCac, 2) : "Ölçülmeli",
            tone:
              b2bCard?.ltvToCac == null
                ? "neutral"
                : b2bCard.ltvToCac >= 3
                  ? "positive"
                  : "negative",
            hint: b2bCard?.note,
          },
          {
            label: "Ağırlıklı CAC ile ilk yıl katkı",
            value: `${formatAmount(b2b.licensePrice - b2b.fullCostBeforeCac - b2b.weightedB2bCac)} TL`,
            tone:
              b2b.licensePrice - b2b.fullCostBeforeCac - b2b.weightedB2bCac >= 0
                ? "positive"
                : "negative",
          },
        ]}
      />
    </>
  );
}
