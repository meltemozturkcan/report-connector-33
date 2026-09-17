import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable, TextField } from "@/components/entry/fields";
import { emptyUnitEconomicsRow } from "@/lib/report-schema";
import { formatAmount, formatRatio } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function UnitEconomicsTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const ue = report.currentUnitEconomics;
  const cac = report.cacDetail;

  return (
    <>
      <RepeatTable
        label="Aylık birim ekonomisi"
        description="CAC = (pazarlama + satış gideri) / yeni müşteri. LTV = ARPU × brüt marj × (100 / churn). Geri ödeme = CAC / aylık brüt kâr."
        rows={draft.unitEconomics}
        emptyRow={emptyUnitEconomicsRow}
        onChange={(rows) => patch("unitEconomics", rows)}
        addLabel="Ay ekle"
        columns={[
          { key: "month", label: "Ay", type: "text", width: "120px" },
          { key: "newCustomers", label: "Yeni müşteri" },
          { key: "marketingSpend", label: "Pazarlama gideri" },
          { key: "salesSpend", label: "Satış gideri" },
          { key: "arpu", label: "ARPU (TL/ay)" },
          { key: "churnRate", label: "Aylık churn (%)" },
          { key: "grossMarginRate", label: "Brüt marj (%)" },
        ]}
      />
      <NumberField
        id="targetPaybackMonths"
        label="Hedef geri ödeme süresi (ay)"
        value={draft.cac.targetPaybackMonths}
        onChange={(value) => patch("cac", { ...draft.cac, targetPaybackMonths: value })}
      />
      <TextField
        id="channelPeriod"
        label="Kanal tablosu dönemi"
        value={draft.cac.channelPeriod}
        onChange={(value) => patch("cac", { ...draft.cac, channelPeriod: value })}
      />
      <RepeatTable
        label="Kanal bazlı kazanım"
        description="Her kanal için harcama, yeni uygun ücretsiz ebeveyn ve yeni ücretli ebeveyn adedi. Freemium ve ücretli kazanım maliyetleri otomatik hesaplanır."
        rows={draft.cac.byChannel}
        emptyRow={{ channel: "", spend: 0, freeSignups: 0, newCustomers: 0 }}
        onChange={(rows) => patch("cac", { ...draft.cac, byChannel: rows })}
        columns={[
          { key: "channel", label: "Kanal", type: "text", width: "34%" },
          { key: "spend", label: "Harcama" },
          { key: "freeSignups", label: "Yeni uygun ücretsiz ebeveyn" },
          { key: "newCustomers", label: "Yeni ücretli ebeveyn" },
        ]}
      />
      <RepeatTable
        label="Dönüşüm hunisi"
        rows={draft.cac.funnel}
        emptyRow={{ stage: "", count: 0 }}
        onChange={(rows) => patch("cac", { ...draft.cac, funnel: rows })}
        columns={[
          { key: "stage", label: "Aşama", type: "text", width: "50%" },
          { key: "count", label: "Adet" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id="netRevenueRetention"
          label="Net gelir tutundurma (%)"
          value={draft.ltv.netRevenueRetention}
          onChange={(value) => patch("ltv", { ...draft.ltv, netRevenueRetention: value })}
        />
        <NumberField
          id="logoRetention"
          label="Müşteri tutundurma (%)"
          value={draft.ltv.logoRetention}
          onChange={(value) => patch("ltv", { ...draft.ltv, logoRetention: value })}
        />
      </div>
      <RepeatTable
        label="Kohortlar"
        rows={draft.ltv.cohorts}
        emptyRow={{ cohort: "", month12Retention: 0, ltv: 0 }}
        onChange={(rows) => patch("ltv", { ...draft.ltv, cohorts: rows })}
        columns={[
          { key: "cohort", label: "Kohort", type: "text", width: "40%" },
          { key: "month12Retention", label: "12. ay tutundurma (%)" },
          { key: "ltv", label: "LTV (TL)" },
        ]}
      />
      <RepeatTable
        label="Segment bazlı birim ekonomisi"
        description="Segment LTV ve LTV/CAC oranı girilen ARPU, churn ve brüt marjdan hesaplanır."
        rows={draft.ltv.bySegment}
        emptyRow={{ segment: "", arpu: 0, churnRate: 0, grossMarginRate: 0, cac: 0 }}
        onChange={(rows) => patch("ltv", { ...draft.ltv, bySegment: rows })}
        columns={[
          { key: "segment", label: "Segment", type: "text", width: "28%" },
          { key: "arpu", label: "ARPU (TL/ay)" },
          { key: "churnRate", label: "Churn (%)" },
          { key: "grossMarginRate", label: "Brüt marj (%)" },
          { key: "cac", label: "CAC (TL)" },
        ]}
      />

      <LinkedResults
        reports={["/cac", "/ltv"]}
        emptyText="Aylık birim ekonomisi satırı girildiğinde CAC, LTV ve geri ödeme burada görünür."
        items={
          ue
            ? [
                {
                  label: `CAC (${ue.month || "son ay"})`,
                  value: `${formatAmount(ue.cac)} TL`,
                  hint: "(pazarlama + satış) × 1000 ÷ yeni müşteri",
                },
                {
                  label: "LTV",
                  value: `${formatAmount(ue.ltv)} TL`,
                  hint: `ARPU × brüt marj × ${formatAmount(ue.lifetimeMonths, 1)} ay ömür`,
                },
                {
                  label: "LTV / CAC",
                  value: formatRatio(ue.ltvToCac, 2),
                  tone: ue.ltvToCac >= 3 ? "positive" : "negative",
                  hint: "Hedef 3,0x",
                },
                {
                  label: "Geri ödeme",
                  value: `${formatAmount(ue.paybackMonths, 1)} ay`,
                  tone: ue.paybackMonths <= cac.targetPaybackMonths ? "positive" : "negative",
                  hint: `Hedef ${cac.targetPaybackMonths} ay`,
                },
                ...(cac.totalSpend > 0
                  ? [
                      {
                        label: "Kanal tablosu: freemium / ücretli CAC",
                        value: `${cac.totalFreeSignups > 0 ? formatAmount(cac.channelFreemiumCac) : "—"} / ${cac.totalPaidCustomers > 0 ? formatAmount(cac.channelPaidCac) : "—"} TL`,
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </>
  );
}
