import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable } from "@/components/entry/fields";
import {
  emptyNonRevenueRow,
  emptyPriceCatalogRow,
  emptyRevenueChannelRow,
} from "@/lib/report-schema";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function PricingTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const feasibility = models.feasibility;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Fiyatlar KDV hariç, 2026 baz fiyatlarıdır. Bu sekme referans kataloğudur; başa baş hesabını
        doğrudan değiştirmez, katman fiyatları Fizibilite / BEP sekmesinde girilir.
      </p>

      <RepeatTable
        label="Fiyat listesi (KDV hariç, 2026 baz)"
        description="Gelir kalemi, fiyat, birim/dönem ve kapsam koşulu."
        rows={draft.feasibility.priceCatalog}
        emptyRow={emptyPriceCatalogRow}
        onChange={(rows) => patch("feasibility", { ...draft.feasibility, priceCatalog: rows })}
        addLabel="Fiyat kalemi ekle"
        columns={[
          { key: "name", label: "Gelir kalemi", type: "text", width: "28%" },
          { key: "price", label: "Fiyat (TL)" },
          { key: "unit", label: "Birim / dönem", type: "text", width: "20%" },
          { key: "scope", label: "Kapsam ve koşul", type: "text", width: "32%" },
        ]}
      />

      <RepeatTable
        label="Gelir kanalları haritası"
        description="Her gelir kanalının başlangıç zamanı, gelir birimi ve ana sürücüsü."
        rows={draft.feasibility.revenueChannels}
        emptyRow={emptyRevenueChannelRow}
        onChange={(rows) => patch("feasibility", { ...draft.feasibility, revenueChannels: rows })}
        addLabel="Kanal ekle"
        columns={[
          { key: "channel", label: "Kanal", type: "text", width: "24%" },
          { key: "start", label: "Başlangıç", type: "text", width: "20%" },
          { key: "unit", label: "Gelir birimi", type: "text", width: "24%" },
          { key: "driver", label: "Ana sürücü", type: "text", width: "32%" },
        ]}
      />

      <RepeatTable
        label="Gelir olmayan veya indirime yol açan kalemler"
        description="Ücretsiz pilot, freemium akış, indirimler ve Morvoi geliri olmayan üçüncü taraf bedelleri burada ayrı izlenir."
        rows={draft.feasibility.nonRevenueItems}
        emptyRow={emptyNonRevenueRow}
        onChange={(rows) => patch("feasibility", { ...draft.feasibility, nonRevenueItems: rows })}
        addLabel="Kalem ekle"
        columns={[
          { key: "name", label: "Kalem", type: "text", width: "26%" },
          { key: "nature", label: "Finansal niteliği", type: "text", width: "22%" },
          { key: "condition", label: "Koşul", type: "text", width: "36%" },
          { key: "amount", label: "Tutar / etki (TL)" },
        ]}
      />

      <LinkedResults
        reports={["/fizibilite"]}
        items={[
          {
            label: "Fiyat kalemi",
            value: `${draft.feasibility.priceCatalog.length} kalem`,
            hint: "Referans kataloğu; BEP'i doğrudan değiştirmez",
          },
          { label: "Gelir kanalı", value: `${draft.feasibility.revenueChannels.length} kanal` },
          {
            label: "Gelir olmayan kalemlerin etkisi",
            value: `${formatAmount(draft.feasibility.nonRevenueItems.reduce((sum, row) => sum + row.amount, 0))} TL`,
          },
          {
            label: "BEP'te kullanılan katman fiyatları",
            value:
              feasibility.tiers.length > 0
                ? feasibility.tiers
                    .map((tier) => `${tier.name}: ${formatAmount(tier.unitPrice)}`)
                    .join(" · ")
                : "Fizibilite sekmesinde girilmedi",
          },
        ]}
      />
    </>
  );
}
