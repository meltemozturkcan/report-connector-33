import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { NumberField, RepeatTable } from "@/components/entry/fields";
import { formatAmount, formatPercent } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function SalesTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const report = models.report;
  const current = report.currentMonth;
  const previous = report.previousMonth;
  const productTotal = draft.sales.byProduct.reduce((sum, row) => sum + row.current, 0);
  const regionTotal = draft.sales.byRegion.reduce((sum, row) => sum + row.current, 0);
  const effectTotal = draft.sales.volumeEffect + draft.sales.priceEffect + draft.sales.mixEffect;
  const salesChange =
    current && previous && report.monthly.length > 1 ? current.sales - previous.sales : null;
  const salesWarnings = [
    current && productTotal > 0 && Math.abs(productTotal - current.sales) > 1
      ? `Ürün kırılımı toplamı ${formatAmount(productTotal)}, aylık verideki net satış ${formatAmount(current.sales)}. İki tablo aynı ayı göstermeli.`
      : null,
    current && regionTotal > 0 && Math.abs(regionTotal - current.sales) > 1
      ? `Bölge kırılımı toplamı ${formatAmount(regionTotal)}, aylık verideki net satış ${formatAmount(current.sales)}.`
      : null,
    salesChange !== null && effectTotal !== 0 && Math.abs(effectTotal - salesChange) > 1
      ? `Miktar + fiyat + karma etkisi ${formatAmount(effectTotal)}, aylık verideki satış değişimi ${formatAmount(salesChange)}. Etkilerin toplamı satış değişimine eşit olmalı.`
      : null,
  ].filter((line): line is string => line !== null);

  return (
    <>
      <RepeatTable
        label="Ürün / hizmet kırılımı"
        rows={draft.sales.byProduct}
        emptyRow={{ name: "", current: 0, previous: 0, budget: 0 }}
        onChange={(rows) => patch("sales", { ...draft.sales, byProduct: rows })}
        columns={[
          { key: "name", label: "Ürün", type: "text", width: "35%" },
          { key: "current", label: "Cari ay" },
          { key: "previous", label: "Önceki ay" },
          { key: "budget", label: "Bütçe" },
        ]}
      />
      <RepeatTable
        label="Bölge kırılımı"
        rows={draft.sales.byRegion}
        emptyRow={{ name: "", current: 0, previous: 0 }}
        onChange={(rows) => patch("sales", { ...draft.sales, byRegion: rows })}
        columns={[
          { key: "name", label: "Bölge", type: "text", width: "50%" },
          { key: "current", label: "Cari ay" },
          { key: "previous", label: "Önceki ay" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          id="volumeEffect"
          label="Miktar etkisi"
          value={draft.sales.volumeEffect}
          onChange={(value) => patch("sales", { ...draft.sales, volumeEffect: value })}
        />
        <NumberField
          id="priceEffect"
          label="Fiyat etkisi"
          value={draft.sales.priceEffect}
          onChange={(value) => patch("sales", { ...draft.sales, priceEffect: value })}
        />
        <NumberField
          id="mixEffect"
          label="Ürün karması etkisi"
          value={draft.sales.mixEffect}
          onChange={(value) => patch("sales", { ...draft.sales, mixEffect: value })}
        />
        <NumberField
          id="topCustomerShare"
          label="En büyük müşteri payı (%)"
          value={draft.sales.topCustomerShare}
          onChange={(value) => patch("sales", { ...draft.sales, topCustomerShare: value })}
        />
      </div>

      <LinkedResults
        reports={["/satis", "/karlilik"]}
        items={[
          {
            label: "Ürün kırılımı toplamı",
            value: formatAmount(productTotal),
            hint: current ? `Aylık veri: ${formatAmount(current.sales)}` : "Aylık veri girilmedi",
          },
          { label: "Bölge kırılımı toplamı", value: formatAmount(regionTotal) },
          {
            label: "Satış değişimi (aylık veriden)",
            value: salesChange === null ? "En az 2 ay gerekli" : formatAmount(salesChange),
            hint: `Miktar + fiyat + karma etkisi: ${formatAmount(effectTotal)}`,
          },
          {
            label: "En büyük müşteri payı",
            value: formatPercent(draft.sales.topCustomerShare),
            tone: draft.sales.topCustomerShare > 20 ? "negative" : "neutral",
            hint: draft.sales.topCustomerShare > 20 ? "%20 üzeri konsantrasyon riski" : undefined,
          },
        ]}
        warnings={salesWarnings}
      />
    </>
  );
}
