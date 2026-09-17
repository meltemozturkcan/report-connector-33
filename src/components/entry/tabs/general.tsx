import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { TextField } from "@/components/entry/fields";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function GeneralTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="company"
          label="Şirket"
          value={draft.meta.company}
          onChange={(value) => patch("meta", { ...draft.meta, company: value })}
        />
        <TextField
          id="period"
          label="Rapor dönemi"
          placeholder="Örn. Mayıs 2026"
          value={draft.meta.period}
          onChange={(value) => patch("meta", { ...draft.meta, period: value })}
        />
        <TextField
          id="previousPeriod"
          label="Karşılaştırma dönemi"
          placeholder="Örn. Nisan 2026"
          value={draft.meta.previousPeriod}
          onChange={(value) => patch("meta", { ...draft.meta, previousPeriod: value })}
        />
        <TextField
          id="currencyNote"
          label="Para birimi notu"
          value={draft.meta.currencyNote}
          onChange={(value) => patch("meta", { ...draft.meta, currencyNote: value })}
        />
      </div>

      <LinkedResults
        reports={["/"]}
        items={[
          {
            label: "Rapor başlığı",
            value: [draft.meta.company, draft.meta.period].filter(Boolean).join(" · ") || "—",
            hint: "Tüm sayfaların üst bilgisinde görünür",
          },
          {
            label: "Aylık veri",
            value: report.hasReportData ? `${report.monthly.length} ay` : "Girilmedi",
            hint: "Son ay raporun cari dönemidir",
          },
          { label: "Para birimi notu", value: draft.meta.currencyNote || "—" },
        ]}
      />
    </>
  );
}
