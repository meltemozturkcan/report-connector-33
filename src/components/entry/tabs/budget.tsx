import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable } from "@/components/entry/fields";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function BudgetTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const knownItems = report.budgetVariance.map((row) => row.item);
  const unmatched = draft.budget.reasons.filter(
    (row) => row.item.trim() && !knownItems.includes(row.item.trim()),
  );

  return (
    <>
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

      <LinkedResults
        reports={["/butce", "/"]}
        emptyText="Aylık veriler sekmesine bütçe sütunları girildiğinde sapmalar burada görünür."
        items={report.budgetVariance
          .filter((row) => ["Net satış", "FAVÖK", "Net kâr"].includes(row.item))
          .map((row) => ({
            label: `${row.item} sapması`,
            value: formatAmount(row.actual - row.budget),
            tone: row.actual - row.budget >= 0 ? ("positive" as const) : ("negative" as const),
            hint: `Bütçe ${formatAmount(row.budget)} · gerçekleşen ${formatAmount(row.actual)}`,
          }))}
        warnings={unmatched.map(
          (row) =>
            `"${row.item}" hesaplanan sapma tablosunda yok; nedeni raporda eşleşmez. Geçerli adlar: ${knownItems.join(", ")}.`,
        )}
      />
    </>
  );
}
