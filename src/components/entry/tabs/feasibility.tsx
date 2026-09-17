import type { EntryTabProps } from "@/components/entry/types";
import { Button } from "@/components/ui/button";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import { TierPeriodGrid } from "@/components/entry/TierPeriodGrid";
import { emptyFixedItemRow, emptyOtherRevenueRow, emptyTierRow } from "@/lib/report-schema";
import { formatAmount, formatPercent } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function FeasibilityTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const feasibility = models.feasibility;
  const current = feasibility.current;

  return (
    <>
      <div className="border-l-2 border-accent-foreground/40 bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Bu bölümdeki tutarlar <strong className="text-foreground">TL</strong> (bin TL değil),
        oranlar yüzde olarak girilir. Katkı payı, başa baş adedi, başa baş cirosu ve dönem
        kâr/zararı otomatik hesaplanır.
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-dashed border-border bg-muted/40 px-4 py-3">
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Altı sütunlu model</strong> — 2027 “Ar-Ge, pilot ve
          ilk satış yılı” olarak ayrı tutulur; 2028–2032 ticari yıllardır. Düğme yalnızca yıl
          sütunlarını ve niteliklerini açar, mevcut adetleri korur. Adet, gelir ve maliyet
          alanlarını kendiniz girersiniz.
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
                stage: year === "2027" ? "Ar-Ge, pilot ve ilk satış yılı" : "Ticari yıl",
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

      <LinkedResults
        reports={["/fizibilite", "/tahmin", "/"]}
        emptyText="Katman fiyatlarını ve en az bir dönem adedini girdiğinizde hesaplama burada görünür."
        items={
          current
            ? [
                {
                  label: `Harmanlanmış fiyat (${current.period})`,
                  value: `${formatAmount(current.blendedPrice)} TL`,
                },
                {
                  label: "Birim değişken maliyet",
                  value: `${formatAmount(current.variable.total)} TL`,
                },
                {
                  label: "Katkı payı",
                  value: `${formatAmount(current.contribution)} TL (${formatPercent(current.contributionRate)})`,
                  tone: current.contribution > 0 ? "positive" : "negative",
                },
                {
                  label: "Başa baş",
                  value: `${formatAmount(current.bepAccounts, 1)} lisans / ${formatAmount(current.bepRevenue)} TL`,
                  hint: `Mevcut ${formatAmount(current.totalAccounts)} lisans`,
                  tone:
                    current.totalAccounts >= current.bepAccounts && current.bepAccounts > 0
                      ? "positive"
                      : "negative",
                },
                {
                  label: "Dönem kâr / zararı",
                  value: `${formatAmount(current.profit)} TL`,
                  tone: current.profit >= 0 ? "positive" : "negative",
                },
                {
                  label: "Gelir temeli",
                  value:
                    current.revenueBasis === "override"
                      ? "Belgeli dönem geliri"
                      : current.revenueBasis === "recognitionRate"
                        ? `ARR × %${formatAmount(current.revenueRecognitionRate)}`
                        : "Yıl sonu ARR (aktiflik oranı girilmedi)",
                  tone: current.revenueBasis === "arr" ? "negative" : "neutral",
                },
              ]
            : []
        }
        warnings={feasibility.missingInputs}
      />
    </>
  );
}
