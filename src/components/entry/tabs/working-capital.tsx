import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import { emptyCashCollectionRow } from "@/lib/report-schema";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function WorkingCapitalTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const collectionTotal = draft.feasibility.cashCollections.reduce(
    (sum, row) => sum + row.pilot + row.annual,
    0,
  );
  const lastCycle = report.cashConversionCycle[report.cashConversionCycle.length - 1];

  return (
    <>
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

      <LinkedResults
        reports={["/nakit", "/fizibilite", "/tahmin"]}
        items={[
          ...report.workingCapital.map((row) => ({
            label: `${row.name} (gün)`,
            value: `${row.days} gün`,
            hint: row.targetDays > 0 ? `Hedef ${row.targetDays} gün` : "Hedef girilmedi",
            tone:
              row.targetDays === 0
                ? ("neutral" as const)
                : row.name === "Ticari borçlar"
                  ? row.days >= row.targetDays
                    ? ("positive" as const)
                    : ("negative" as const)
                  : row.days <= row.targetDays
                    ? ("positive" as const)
                    : ("negative" as const),
          })),
          ...(lastCycle
            ? [
                {
                  label: "Nakit dönüşüm döngüsü",
                  value: `${lastCycle.days} gün`,
                  hint: "Alacak + stok − ticari borç günü",
                },
              ]
            : []),
          {
            label: "Toplam tahsilat",
            value: `${formatAmount(collectionTotal)} TL`,
            hint: "Projeksiyonun nakit görünümünde gelir yerine kullanılır",
          },
        ]}
      />
    </>
  );
}
