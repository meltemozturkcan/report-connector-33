import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import { formatAmount, formatPercent, formatRatio } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function FinancingTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const debt = report.debt;
  const limitUsage = debt.totalLimit > 0 ? (debt.usedLimit / debt.totalLimit) * 100 : 0;
  const splitTotal = draft.financing.shortTerm + draft.financing.longTerm;
  const financingWarnings = [
    report.hasReportData && splitTotal > 0 && Math.abs(splitTotal - debt.total) > 1
      ? `Kısa + uzun vadeli borç ${formatAmount(splitTotal)}, aylık verideki son ay finansal borç ${formatAmount(debt.total)}. İkisi aynı bakiyeyi göstermeli.`
      : null,
    ...draft.financing.lines
      .filter((line) => line.limit > 0 && line.used > line.limit)
      .map((line) => `${line.bank || "Adsız banka"}: kullanılan tutar limiti aşıyor.`),
  ].filter((line): line is string => line !== null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          id="shortTerm"
          label="Kısa vadeli borç"
          value={draft.financing.shortTerm}
          onChange={(value) => patch("financing", { ...draft.financing, shortTerm: value })}
        />
        <NumberField
          id="longTerm"
          label="Uzun vadeli borç"
          value={draft.financing.longTerm}
          onChange={(value) => patch("financing", { ...draft.financing, longTerm: value })}
        />
        <NumberField
          id="averageRate"
          label="Ortalama faiz (%)"
          value={draft.financing.averageRate}
          onChange={(value) => patch("financing", { ...draft.financing, averageRate: value })}
        />
        <NumberField
          id="annualDebtService"
          label="Yıllık borç servisi (anapara + faiz)"
          hint="DSCR = yıllıklandırılmış FAVÖK / borç servisi"
          value={draft.financing.annualDebtService}
          onChange={(value) => patch("financing", { ...draft.financing, annualDebtService: value })}
        />
      </div>
      <RepeatTable
        label="Kredi limitleri"
        rows={draft.financing.lines}
        emptyRow={{ bank: "", limit: 0, used: 0 }}
        onChange={(rows) => patch("financing", { ...draft.financing, lines: rows })}
        columns={[
          { key: "bank", label: "Banka", type: "text", width: "50%" },
          { key: "limit", label: "Limit" },
          { key: "used", label: "Kullanılan" },
        ]}
      />
      <RepeatTable
        label="Vade dağılımı"
        rows={draft.financing.maturities}
        emptyRow={{ period: "", amount: 0 }}
        onChange={(rows) => patch("financing", { ...draft.financing, maturities: rows })}
        columns={[
          { key: "period", label: "Dönem", type: "text", width: "50%" },
          { key: "amount", label: "Tutar" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          id="capexAnnualBudget"
          label="Yıllık CAPEX bütçesi"
          value={draft.capex.annualBudget}
          onChange={(value) => patch("capex", { ...draft.capex, annualBudget: value })}
        />
        <NumberField
          id="capexYtdBudget"
          label="Yılbaşından bugüne CAPEX bütçesi"
          value={draft.capex.ytdBudget}
          onChange={(value) => patch("capex", { ...draft.capex, ytdBudget: value })}
        />
        <NumberField
          id="capexMonthActual"
          label="Cari ay CAPEX"
          value={draft.capex.monthActual}
          onChange={(value) => patch("capex", { ...draft.capex, monthActual: value })}
        />
      </div>
      <RepeatTable
        label="CAPEX projeleri"
        description="Yılbaşından bugüne gerçekleşme, proje satırlarının toplamıdır."
        rows={draft.capex.projects}
        emptyRow={{ name: "", budget: 0, actual: 0, status: "Devam ediyor" }}
        onChange={(rows) => patch("capex", { ...draft.capex, projects: rows })}
        columns={[
          { key: "name", label: "Proje", type: "text", width: "35%" },
          { key: "budget", label: "Bütçe" },
          { key: "actual", label: "Gerçekleşen" },
          { key: "status", label: "Durum", type: "text" },
        ]}
      />

      <LinkedResults
        reports={["/finansman", "/"]}
        items={[
          {
            label: "Net borç",
            value: formatAmount(debt.net),
            hint: "Son ay finansal borç − nakit",
          },
          {
            label: "Net borç / FAVÖK",
            value: debt.leverageMeasurable
              ? formatRatio(debt.netDebtToEbitda, 2)
              : "FAVÖK ≤ 0 — ölçülemez",
            tone: debt.leverageMeasurable
              ? debt.netDebtToEbitda > 3
                ? "negative"
                : "positive"
              : "neutral",
          },
          {
            label: "DSCR",
            value: debt.dscrMeasurable ? formatRatio(debt.dscr, 2) : "Ölçülemez",
            hint: debt.dscrMeasurable
              ? "Yıllıklandırılmış FAVÖK ÷ borç servisi"
              : "Pozitif FAVÖK ve borç servisi gerekli",
            tone: debt.dscrMeasurable ? (debt.dscr >= 1.3 ? "positive" : "negative") : "neutral",
          },
          {
            label: "Limit kullanımı",
            value: debt.totalLimit > 0 ? formatPercent(limitUsage) : "—",
            hint: `${formatAmount(debt.usedLimit)} / ${formatAmount(debt.totalLimit)}`,
          },
          {
            label: "CAPEX gerçekleşme",
            value: report.capex.ytdBudget > 0 ? formatPercent(report.capex.realisationRate) : "—",
            hint: `YTD ${formatAmount(report.capex.ytdActual)} / bütçe ${formatAmount(report.capex.ytdBudget)}`,
          },
        ]}
        warnings={financingWarnings}
      />
    </>
  );
}
