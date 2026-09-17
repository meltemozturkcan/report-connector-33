import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import { emptyCapexYearRow, emptyFinancingYearRow } from "@/lib/report-schema";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function ProjectionTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const projection = models.projection;
  const baseYears = projection.scenariosAccrual.find((row) => row.name === "Baz")?.years ?? [];
  const lastYear = baseYears[baseYears.length - 1];
  const firstProfitYear = baseYears.find((row) => row.netProfit > 0);
  const minCash = baseYears.reduce<(typeof baseYears)[number] | undefined>(
    (min, row) => (min === undefined || row.closingCash < min.closingCash ? row : min),
    undefined,
  );

  return (
    <>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Yıl sonu satış, FAVÖK ve nakit sonuçları elle girilmez; satış, maliyet, edinim ve finansman
        sürücülerinden hesaplanır. Burada yalnızca sürücüleri girin. Ölçülmemiş girdiler sonuca
        yüklenmez, Projeksiyon sayfasında "ölçülmeli" uyarısı olarak görünür.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          id="projectionStartYear"
          label="Plan başlangıç yılı"
          value={draft.projection.startYear}
          onChange={(value) => patch("projection", { ...draft.projection, startYear: value })}
        />
        <NumberField
          id="projectionEndYear"
          label="Plan bitiş yılı"
          value={draft.projection.endYear}
          onChange={(value) => patch("projection", { ...draft.projection, endYear: value })}
        />
        <NumberField
          id="corporateTaxRate"
          label="Kurumlar vergisi oranı (%)"
          hint="Girilmezse vergi 0 kabul edilir ve net kâr vergi öncesi tutara eşittir."
          value={draft.projection.corporateTaxRate}
          onChange={(value) =>
            patch("projection", { ...draft.projection, corporateTaxRate: value })
          }
        />
        <NumberField
          id="openingCash"
          label="Plan başındaki nakit (TL)"
          value={draft.projection.openingCash}
          onChange={(value) => patch("projection", { ...draft.projection, openingCash: value })}
        />
        <NumberField
          id="projectionRemainingMonths"
          label="Kalan ay sayısı"
          hint="Yalnızca içinde bulunulan yıl seçiliyken gösterilir."
          value={draft.projection.remainingMonths}
          onChange={(value) => patch("projection", { ...draft.projection, remainingMonths: value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          id="worstRevenueDelta"
          label="Kötümser — gelir sapması (%)"
          value={draft.projection.worstRevenueDelta}
          onChange={(value) =>
            patch("projection", { ...draft.projection, worstRevenueDelta: value })
          }
        />
        <NumberField
          id="worstCostDelta"
          label="Kötümser — maliyet sapması (%)"
          value={draft.projection.worstCostDelta}
          onChange={(value) => patch("projection", { ...draft.projection, worstCostDelta: value })}
        />
        <NumberField
          id="bestRevenueDelta"
          label="İyimser — gelir sapması (%)"
          value={draft.projection.bestRevenueDelta}
          onChange={(value) =>
            patch("projection", { ...draft.projection, bestRevenueDelta: value })
          }
        />
        <NumberField
          id="bestCostDelta"
          label="İyimser — maliyet sapması (%)"
          value={draft.projection.bestCostDelta}
          onChange={(value) => patch("projection", { ...draft.projection, bestCostDelta: value })}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          Ana senaryoya dahil gelir kalemleri
        </legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 border-border"
            checked={draft.projection.includeB2cRevenue}
            onChange={(event) =>
              patch("projection", { ...draft.projection, includeB2cRevenue: event.target.checked })
            }
          />
          B2C (ebeveyn) geliri ana senaryoya dahil
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 border-border"
            checked={draft.projection.includeInstitutionRevenue}
            onChange={(event) =>
              patch("projection", {
                ...draft.projection,
                includeInstitutionRevenue: event.target.checked,
              })
            }
          />
          Kurum lisansı geliri ana senaryoya dahil
        </label>
        <p className="text-xs text-muted-foreground">
          Doğrulanmadıkça kapalı kalır; kapalıyken bu katmanların geliri ve değişken maliyeti ana
          senaryodan çıkarılır.
        </p>
      </fieldset>
      <RepeatTable
        label="Yıl bazlı CAPEX"
        description="Yatırım nakit çıkışı; girilmeyen yıl için 0 kabul edilir."
        rows={draft.projection.capexByYear}
        emptyRow={emptyCapexYearRow}
        onChange={(rows) => patch("projection", { ...draft.projection, capexByYear: rows })}
        columns={[
          { key: "year", label: "Yıl", type: "text", width: "15%" },
          { key: "amount", label: "Tutar (TL)" },
          { key: "note", label: "Not", type: "text" },
        ]}
      />
      <RepeatTable
        label="Yıl bazlı finansman ve borç"
        description="Finansal maliyet = borç bakiyesi × faiz oranı. Girilmeyen yıl için finansal maliyet 0 kabul edilir."
        rows={draft.projection.financingByYear}
        emptyRow={emptyFinancingYearRow}
        onChange={(rows) => patch("projection", { ...draft.projection, financingByYear: rows })}
        columns={[
          { key: "year", label: "Yıl", type: "text", width: "15%" },
          { key: "debtBalance", label: "Borç bakiyesi (TL)" },
          { key: "interestRate", label: "Faiz oranı (%)" },
          { key: "principalRepayment", label: "Anapara ödemesi (TL)" },
          { key: "newFinancing", label: "Yeni finansman (TL)" },
        ]}
      />

      <LinkedResults
        reports={["/tahmin", "/karlilik"]}
        emptyText="Fizibilite / BEP sekmesinde 2027–2032 dönemleri girildiğinde projeksiyon burada görünür."
        items={
          lastYear
            ? [
                {
                  label: `${lastYear.year} net satış (baz)`,
                  value: `${formatAmount(lastYear.netSales)} TL`,
                },
                {
                  label: `${lastYear.year} FAVÖK / net kâr`,
                  value: `${formatAmount(lastYear.ebitda)} / ${formatAmount(lastYear.netProfit)} TL`,
                  tone: lastYear.netProfit >= 0 ? "positive" : "negative",
                },
                {
                  label: "İlk kârlı yıl (baz)",
                  value: firstProfitYear ? firstProfitYear.year : "Plan döneminde yok",
                  tone: firstProfitYear ? "positive" : "negative",
                },
                {
                  label: "En düşük dönem sonu nakit",
                  value: minCash
                    ? `${formatAmount(minCash.closingCash)} TL (${minCash.year})`
                    : "—",
                  tone: minCash && minCash.closingCash < 0 ? "negative" : "neutral",
                  hint:
                    minCash && minCash.closingCash < 0
                      ? "Nakit eksiye düşüyor: finansman ihtiyacı var"
                      : "Baz senaryo, tahakkuk görünümü",
                },
                {
                  label: "Ölçülmesi gereken girdi",
                  value: `${projection.warnings.length} uyarı`,
                  tone: projection.warnings.length > 0 ? "negative" : "positive",
                  hint: "Ayrıntı Projeksiyon sayfasında",
                },
              ]
            : []
        }
      />
    </>
  );
}
