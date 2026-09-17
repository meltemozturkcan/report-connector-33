import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable } from "@/components/entry/fields";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function NarrativeTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const narrative = models.report.narrative;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        "Neredeyiz" ve "Neden buradayız" yorumları rakamlardan otomatik üretilir. Buraya yalnızca ek
        notlarınızı ve aksiyon planını girersiniz.
      </p>
      <RepeatTable
        label="Ek notlar"
        rows={draft.narrative.notes}
        emptyRow={{ text: "" }}
        onChange={(rows) => patch("narrative", { ...draft.narrative, notes: rows })}
        columns={[{ key: "text", label: "Not", type: "text" }]}
      />
      <RepeatTable
        label="Aksiyon planı"
        rows={draft.narrative.actions}
        emptyRow={{ action: "", owner: "", due: "" }}
        onChange={(rows) => patch("narrative", { ...draft.narrative, actions: rows })}
        columns={[
          { key: "action", label: "Aksiyon", type: "text", width: "50%" },
          { key: "owner", label: "Sorumlu", type: "text" },
          { key: "due", label: "Termin", type: "text" },
        ]}
      />

      <LinkedResults
        reports={["/"]}
        items={[
          {
            label: "Otomatik “Neredeyiz?” satırı",
            value: `${narrative.where.length}`,
            hint: "Ek notlar bu listenin sonuna eklenir",
          },
          { label: "Otomatik “Neden buradayız?” satırı", value: `${narrative.why.length}` },
          {
            label: "Aksiyon",
            value: `${narrative.next.length}`,
            hint: "Yönetici Özeti → Bundan sonra ne yapacağız?",
          },
        ]}
      />
    </>
  );
}
