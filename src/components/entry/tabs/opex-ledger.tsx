import type { EntryTabProps } from "@/components/entry/types";
import { LinkedResults } from "@/components/entry/LinkedResults";
import { RepeatTable } from "@/components/entry/fields";
import {
  cacBuckets,
  emptyCostLayerRow,
  emptyCostPlacementRow,
  emptyFixedOpexGroupRow,
  emptySpendLedgerRow,
} from "@/lib/report-schema";
import { formatAmount } from "@/lib/format";
import { useReportWorkspace } from "@/hooks/report-workspace";

export function OpexLedgerTab({ draft, patch }: EntryTabProps) {
  const { models } = useReportWorkspace();
  const acquisition = models.acquisition;
  const ledgerYears = [
    ...new Set(acquisition.ledger.map((line) => line.period.match(/20\d{2}/)?.[0]).filter(Boolean)),
  ] as string[];
  const baseYears =
    models.projection.scenariosAccrual.find((row) => row.name === "Baz")?.years ?? [];
  const ledgerWarnings = acquisition.warnings.filter(
    (warning) =>
      warning.includes("defterde") ||
      warning.includes("maliyet yeri") ||
      warning.includes("atıf oranı"),
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Bu defter genel bir tablodur: şirketin her harcaması burada tek satırda ve tek bir kez
        girilir. Atıf oranı kalemi böler — örneğin pazarlama personelinin %30'u B2C edinimine
        ayrılıyorsa yalnız %30'u CAC havuzuna girer. CAC'e girmeyen kalemleri de yazın; doğru yerde
        (Ürün COGS, Ürün operasyon, Ar-Ge / ürün OPEX, Genel yönetim, Uzman hizmet maliyeti)
        tutulduklarında kanal CAC'ine karışmazlar. B2B CAC / Yönlendirme CAC kovasındaki satırlarda
        kanal adını kanal tablosuyla aynı yazın; atfedilen pay kanal CAC'ine oradan gelir, ayrıca
        CAC alt kalemi eklemeyin. Geçerli yerler: {cacBuckets.join(", ")}. Tutarlar TL, oranlar %.
      </p>

      <RepeatTable
        label="Ham faaliyet gideri defteri"
        description="Her harcama bir kez girilir; buradan B2B CAC, B2C CAC, ürün operasyonu ve genel yönetime dağıtılır — aynı gider iki kez sayılmaz."
        rows={draft.acquisition.spendLedger}
        emptyRow={emptySpendLedgerRow}
        onChange={(rows) => patch("acquisition", { ...draft.acquisition, spendLedger: rows })}
        addLabel="Harcama kalemi ekle"
        columns={[
          { key: "name", label: "Kalem", type: "text", width: "20%" },
          { key: "mainClass", label: "Ana sınıf", type: "text", width: "14%" },
          { key: "bucket", label: "Yer", type: "select", options: cacBuckets, width: "12%" },
          { key: "channel", label: "Kanal", type: "text", width: "12%" },
          { key: "period", label: "Dönem", type: "text", width: "8%" },
          { key: "amount", label: "Tutar (TL)" },
          { key: "attributionRate", label: "Atıf oranı (%)" },
          { key: "note", label: "Not", type: "text", width: "14%" },
        ]}
      />

      <RepeatTable
        label="Ana maliyet katmanları"
        description="Hangi katmanın B2C CAC'e girdiği burada tanımlanır."
        rows={draft.acquisition.costLayers}
        emptyRow={emptyCostLayerRow}
        onChange={(rows) => patch("acquisition", { ...draft.acquisition, costLayers: rows })}
        addLabel="Katman ekle"
        columns={[
          { key: "layer", label: "Katman", type: "text", width: "22%" },
          { key: "scope", label: "Kapsam", type: "text", width: "40%" },
          { key: "cacTreatment", label: "B2C CAC'e girer mi?", type: "text", width: "38%" },
        ]}
      />

      <RepeatTable
        label="Sabit işletme bütçesi (yıllık)"
        description="CAC tablosunda görünen paylar bu bütçenin B2C'ye tahsis edilen kısmıdır; yeni gider değildir."
        rows={draft.acquisition.fixedOpexGroups}
        emptyRow={emptyFixedOpexGroupRow}
        onChange={(rows) => patch("acquisition", { ...draft.acquisition, fixedOpexGroups: rows })}
        addLabel="Grup ekle"
        columns={[
          { key: "group", label: "Grup", type: "text", width: "24%" },
          { key: "content", label: "İçerik", type: "text", width: "50%" },
          { key: "annualAmount", label: "Yıllık tutar (TL)" },
        ]}
      />

      <RepeatTable
        label="Kalem → doğru maliyet yeri"
        rows={draft.acquisition.costPlacements}
        emptyRow={emptyCostPlacementRow}
        onChange={(rows) => patch("acquisition", { ...draft.acquisition, costPlacements: rows })}
        addLabel="Eşleme ekle"
        columns={[
          { key: "item", label: "Kalem", type: "text", width: "50%" },
          { key: "costPlace", label: "Doğru maliyet yeri", type: "text", width: "50%" },
        ]}
      />

      <LinkedResults
        reports={["/edinim", "/tahmin", "/karlilik"]}
        items={[
          {
            label: "Toplam faaliyet gideri",
            value: `${formatAmount(acquisition.rawOpexTotal)} TL`,
            hint: "Her kalem bir kez",
          },
          {
            label: "B2C / B2B / yönlendirme CAC havuzu",
            value: `${formatAmount(acquisition.b2cCacPool)} / ${formatAmount(acquisition.b2bCacPool)} / ${formatAmount(acquisition.referralCacPool)} TL`,
            hint: "Yalnızca atfedilen paylar",
          },
          {
            label: "CAC dışı kovalar",
            value: `${formatAmount(acquisition.excludedPool)} TL`,
            hint: "COGS, operasyon, Ar-Ge, genel yönetim, uzman",
          },
          {
            label: "Dağıtılmayan pay",
            value: `${formatAmount(acquisition.unallocatedTotal)} TL`,
            hint: "Gelir tablosunda yine gider olarak kalır",
          },
          ...ledgerYears.map((year) => {
            const row = baseYears.find((item) => item.year.includes(year));
            return {
              label: `Projeksiyon ${year} faaliyet gideri`,
              value: row ? `${formatAmount(row.opex)} TL` : "Plan döneminde değil",
              hint: row
                ? row.opexSource === "ledger"
                  ? "Bu defterden"
                  : "Defter kullanılmadı"
                : undefined,
            };
          }),
        ]}
        warnings={ledgerWarnings}
      />
    </>
  );
}
