import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PeriodRow = {
  period: string;
  stage: string;
  counts: number[];
  otherRevenue: number;
  fixedCostOverride: number;
};

type TierPeriodGridProps = {
  tierNames: string[];
  rows: PeriodRow[];
  onChange: (rows: PeriodRow[]) => void;
};

/**
 * Dönem × katman aktif lisans adedi girişi.
 * Sütunlar katman listesinden türetilir; her hücre o dönemdeki aktif hesap sayısıdır.
 */
export function TierPeriodGrid({ tierNames, rows, onChange }: TierPeriodGridProps) {
  const update = (index: number, patch: Partial<PeriodRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const updateCount = (index: number, tierIndex: number, raw: string) => {
    const row = rows[index];
    if (!row) return;
    const counts = tierNames.map((_, i) => (i === tierIndex ? (raw === "" ? 0 : Number(raw)) : row.counts[i] ?? 0));
    update(index, { counts });
  };

  const addRow = () =>
    onChange([
      ...rows,
      { period: "", stage: "Ticari yıl", counts: tierNames.map(() => 0), otherRevenue: 0, fixedCostOverride: 0 },
    ]);

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">Dönem bazlı aktif lisans adedi</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Her katman için dönem sonu aktif ödeyen lisans sayısını girin. Diğer gelir boş (0) bırakılırsa
          abonelik dışı gelir kataloğunun toplamı kullanılır; sabit maliyet boş (0) bırakılırsa Tablo 4.4-3
          toplamı kullanılır.
        </p>
      </div>

      {tierNames.length === 0 ? (
        <p className="text-xs text-destructive">Önce katman ve fiyat listesini tanımlayın.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dönem
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Yılın niteliği
                </th>
                {tierNames.map((name) => (
                  <th
                    key={name}
                    scope="col"
                    className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {name || "Katman"}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Diğer gelir (TL)
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sabit maliyet (TL)
                </th>
                <th scope="col" className="w-10 px-2 py-2">
                  <span className="sr-only">Sil</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  <td className="px-1 py-1">
                    <Input
                      aria-label={`Dönem ${index + 1}`}
                      value={row.period}
                      onChange={(event) => update(index, { period: event.target.value })}
                      className="h-9 w-32"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      aria-label={`Yılın niteliği ${index + 1}`}
                      value={row.stage ?? ""}
                      onChange={(event) => update(index, { stage: event.target.value })}
                      className="h-9 w-56"
                    />
                  </td>
                  {tierNames.map((name, tierIndex) => (
                    <td key={name + tierIndex} className="px-1 py-1">
                      <Input
                        aria-label={`${name} adedi ${index + 1}`}
                        type="number"
                        inputMode="decimal"
                        value={row.counts[tierIndex] ?? 0}
                        onChange={(event) => updateCount(index, tierIndex, event.target.value)}
                        className="h-9 w-24 tabular-nums"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <Input
                      aria-label={`Diğer gelir ${index + 1}`}
                      type="number"
                      inputMode="decimal"
                      value={row.otherRevenue}
                      onChange={(event) =>
                        update(index, {
                          otherRevenue: event.target.value === "" ? 0 : Number(event.target.value),
                        })
                      }
                      className="h-9 w-32 tabular-nums"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      aria-label={`Sabit maliyet ${index + 1}`}
                      type="number"
                      inputMode="decimal"
                      value={row.fixedCostOverride}
                      onChange={(event) =>
                        update(index, {
                          fixedCostOverride: event.target.value === "" ? 0 : Number(event.target.value),
                        })
                      }
                      className="h-9 w-32 tabular-nums"
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${index + 1}. dönemi sil`}
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={tierNames.length === 0}>
        <Plus className="size-4" aria-hidden /> Dönem ekle
      </Button>
    </section>
  );
}
