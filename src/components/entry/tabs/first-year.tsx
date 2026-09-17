import type { EntryTabProps } from "@/components/entry/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable, TextField } from "@/components/entry/fields";
import { emptyFirstYearCostRow } from "@/lib/report-schema";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function FirstYearTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const firstYear = models.feasibility.firstYearCosts;
  const firstPeriod = models.feasibility.periods[0];

  return (
    <>
      <div className="border-l-2 border-accent-foreground/40 bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        İlk yıl için <strong className="text-foreground">Ar-Ge maliyeti</strong> ve{" "}
        <strong className="text-foreground">şirket (işletme) maliyeti</strong> ayrı hesaplanır. Her
        kalemi <strong className="text-foreground">yalnızca bir satıra</strong> yazın ve Ar-Ge
        payını yüzde olarak belirtin; kalan kısım otomatik olarak şirket maliyetine gider. Ar-Ge
        payı + şirket payı = kalem tutarı olduğu için mükerrer kayıt oluşmaz. Tutarlar TL.
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
          <Label
            htmlFor="useForFirstPeriod"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            İlk dönemin sabit maliyeti bu defterden gelsin (Tablo 4.4-3 yerine). Böylece ilk yıl
            Ar-Ge yükü iki kez sayılmaz.
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

      <LinkedResults
        reports={["/fizibilite", "/tahmin"]}
        items={[
          { label: "Ar-Ge maliyeti", value: `${formatAmount(firstYear.rdTotal)} TL` },
          { label: "Şirket maliyeti", value: `${formatAmount(firstYear.companyTotal)} TL` },
          { label: "Toplam (nakit / taahhüt)", value: `${formatAmount(firstYear.grandTotal)} TL` },
          {
            label: "İlk yıl gelir tablosu gideri",
            value: `${formatAmount(firstYear.firstYearCharge)} TL`,
            hint: `Aktifleştirilen ${formatAmount(firstYear.capitalizedTotal)} TL faydalı ömre bölündü`,
          },
          {
            label: "İlk dönem sabit maliyeti kaynağı",
            value: !firstPeriod
              ? "Dönem girilmedi"
              : firstPeriod.fixedCostSource === "firstYear"
                ? `Bu defter (${firstPeriod.period})`
                : firstPeriod.fixedCostSource === "override"
                  ? "Elle girilen tutar"
                  : "Tablo 4.4-3",
            hint: "Fizibilite ve projeksiyonda kullanılır",
          },
        ]}
        warnings={firstYear.duplicateWarnings}
      />
    </>
  );
}
