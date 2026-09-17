import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable } from "@/components/entry/fields";
import { emptyMonthlyRow } from "@/lib/report-schema";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function MonthlyTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const current = report.currentMonth;

  return (
    <>
      <RepeatTable
        label="Aylık gelir tablosu, nakit ve bilanço verileri"
        description="Son ay raporun cari dönemidir. Brüt kâr, FAVÖK, net kâr, marjlar, nakit köprüsü ve gün sayıları bu satırlardan hesaplanır."
        rows={draft.monthly}
        emptyRow={emptyMonthlyRow}
        onChange={(rows) => patch("monthly", rows)}
        addLabel="Ay ekle"
        columns={[
          { key: "month", label: "Ay", type: "text", width: "120px" },
          { key: "sales", label: "Net satış" },
          { key: "budgetSales", label: "Bütçe satış" },
          { key: "cogs", label: "SMM" },
          { key: "budgetCogs", label: "Bütçe SMM" },
          { key: "opex", label: "Faaliyet gideri" },
          { key: "budgetOpex", label: "Bütçe gideri" },
          { key: "depreciation", label: "Amortisman" },
          { key: "financialExpense", label: "Finansman gideri" },
          { key: "tax", label: "Vergi" },
          { key: "operatingCash", label: "Faaliyet nakdi" },
          { key: "investingCash", label: "Yatırım nakdi" },
          { key: "financingCash", label: "Finansman nakdi" },
          { key: "cash", label: "Dönem sonu nakit" },
          { key: "receivables", label: "Ticari alacak" },
          { key: "inventory", label: "Stok" },
          { key: "payables", label: "Ticari borç" },
          { key: "debt", label: "Finansal borç" },
        ]}
      />

      <LinkedResults
        reports={["/", "/satis", "/butce", "/karlilik", "/nakit", "/finansman"]}
        emptyText="En az bir ay girildiğinde marjlar, nakit köprüsü ve borç oranları burada görünür."
        items={
          current
            ? [
                {
                  label: `Net satış (${current.month || "son ay"})`,
                  value: formatAmount(current.sales),
                  hint: "Satış Performansı",
                },
                {
                  label: "Brüt / FAVÖK / net marj",
                  value: `${formatPercent(report.currentMargin.gross)} / ${formatPercent(report.currentMargin.ebitda)} / ${formatPercent(report.currentMargin.net)}`,
                  hint: "Kârlılık",
                },
                {
                  label: "Net kâr",
                  value: formatAmount(current.netProfit),
                  tone: current.netProfit >= 0 ? "positive" : "negative",
                  hint: "Satış − SMM − gider − amortisman − finansman − vergi",
                },
                {
                  label: "Faaliyet nakdi / dönem sonu nakit",
                  value: `${formatAmount(report.cashFlow.operating)} / ${formatAmount(report.cashFlow.closing)}`,
                  hint: "Nakit ve İşletme Sermayesi",
                },
                {
                  label: "Net borç / FAVÖK",
                  value: report.debt.leverageMeasurable
                    ? formatRatio(report.debt.netDebtToEbitda, 2)
                    : "FAVÖK ≤ 0 — ölçülemez",
                  hint: "Borç, Kredi ve CAPEX",
                },
                {
                  label: "Net kâr bütçe sapması",
                  value: formatAmount(
                    report.netProfitVariance.actual - report.netProfitVariance.budget,
                  ),
                  tone:
                    report.netProfitVariance.actual >= report.netProfitVariance.budget
                      ? "positive"
                      : "negative",
                  hint: "Bütçe – Gerçekleşen",
                },
              ]
            : []
        }
        warnings={
          current && Math.abs(report.cashFlow.opening) > 0 && draft.monthly.length > 1
            ? (() => {
                const prev = draft.monthly[draft.monthly.length - 2];
                const gap = prev ? report.cashFlow.opening - prev.cash : 0;
                return Math.abs(gap) > 1
                  ? [
                      `Nakit köprüsü tutmuyor: önceki ay dönem sonu nakit ${formatAmount(prev?.cash ?? 0)}, bu ayın hesaplanan açılış nakdi (kapanış − faaliyet − yatırım − finansman) ${formatAmount(report.cashFlow.opening)}. Fark ${formatAmount(gap)}.`,
                    ]
                  : [];
              })()
            : []
        }
      />
    </>
  );
}
