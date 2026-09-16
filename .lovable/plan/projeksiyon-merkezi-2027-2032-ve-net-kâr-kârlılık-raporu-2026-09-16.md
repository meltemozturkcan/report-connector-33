# Projeksiyon merkezi (2027–2032) ve net kâr / kârlılık raporu

## Amaç

"Yıl sonu tahmini" sayfası, 2027–2032 dönemini kapsayan bir **projeksiyon merkezine** dönüşür.
Üç bütçe alanı (satış / FAVÖK / net nakit) elle girilmez; bütün sonuçlar hâlihazırda girdiğiniz
satış, maliyet, edinim ve finansman verilerinden otomatik hesaplanır. Net kâr ilk kez uçtan uca
hesaplanır: FAVÖK − amortisman − finansal maliyet − vergi.

## Üst alan (kontroller)

| Alan | Davranış |
| --- | --- |
| Plan başlangıcı / bitişi | 2027 – 2032 (girilebilir) |
| Senaryo | Baz / Kötümser / İyimser — gelir ve maliyet sapma oranlarıyla |
| Görüntülenen yıl | 2027…2032 arası seçim |
| Tahsilat yöntemi | Nakit akışı görünümü ↔ gelir tahakkuku görünümü |
| B2C ve kurum geliri | "Ana senaryoya dahil" anahtarı — doğrulanmadıkça kapalı, kapalıyken bu gelirler ve bunlara ait maliyetler ana senaryodan çıkarılır |
| Kalan ay sayısı | Yalnız seçili yıl içinde bulunduğumuz yıl ise görünür |

## Seçili yıl için otomatik kartlar

Net satış · Brüt kâr (ve brüt marj) · FAVÖK ve FAVÖK marjı · Dönem sonu nakit ·
Net borç / FAVÖK · **B2B LTV / CAC** · **B2C LTV / CAC** (ayrı kartlar; tek "blended" karta
zorlanmaz, karma değer yalnızca referans olarak alt satırda görünür).

## Kârlılık raporu ve grafikler

Yeni bölümler:

1. **Gelir → net kâr köprüsü** (seçili yıl): Net satış → değişken maliyet → brüt kâr →
   faaliyet gideri → FAVÖK → amortisman → finansal maliyet → vergi → **net kâr**. Tablo + şelale
   grafiği.
2. **2027–2032 kârlılık seyri**: net satış, FAVÖK ve net kâr çizgileri; marjlar ikinci eksende.
3. **Senaryo karşılaştırması**: kötümser / baz / iyimser için net satış, FAVÖK, net kâr, dönem sonu
   nakit ve net borç / FAVÖK.
4. **Nakit köprüsü**: dönem başı nakit + faaliyet nakdi − yatırım (CAPEX) ± finansman = dönem sonu
   nakit; tahsilat yöntemi anahtarına göre gelir tahakkuku ile nakit arasındaki fark ayrı satır.
5. **Birim ekonomi karşılaştırması**: B2B ve B2C için LTV, CAC, LTV/CAC, geri ödeme süresi yan yana.
6. Mevcut Kârlılık sayfasındaki marj köprüsü artık sabit örnek rakamlar yerine girilen verilerden
   hesaplanır; ölçülmemiş kalemler "ölçülmeli" olarak görünür.

Ölçülmemiş girdiler asla varsayılan bir rakamla doldurulmaz; ilgili satır "ölçülmeli" uyarısıyla
görünür ve o kalem sonuca yüklenmez (vergi oranı, dönem başı nakit, yıllık CAPEX gibi).

## Teknik detay

- `src/lib/report-schema.ts`: yeni `projection` bloğu — `startYear`, `endYear`, `scenarios`
  (kötümser/iyimser için gelir ve maliyet sapma %'si), `corporateTaxRate` (varsayılan 0 →
  "ölçülmeli"), `openingCash`, `includeB2cRevenue` / `includeInstitutionRevenue` (varsayılan
  kapalı), yıl bazlı `capexByYear` ve `financingByYear` satırları. Eski `forecast` alanlarındaki üç
  manuel bütçe alanı veri girişinden kaldırılır (kayıtlı veri bozulmasın diye şemada kalır, artık
  okunmaz).
- Yeni `src/lib/projection-calc.ts`: `computeProjection(input)` → yıl bazlı `netSales`,
  `variableCost`, `grossProfit`, `grossMarginRate`, `opex`, `ebitda`, `ebitdaMarginRate`,
  `amortization`, `financialCost`, `tax`, `netProfit`, `netMarginRate`, `operatingCash`,
  `investingCash`, `financingCash`, `closingCash`, `netDebt`, `netDebtToEbitda`, senaryo türevleri
  ve `warnings`. Gelir tabanı fizibilite dönemlerinden (ARR ile dönem geliri ayrımı korunur),
  faaliyet gideri ham gider defterinin atfedilen paylarından, amortisman ilk yıl defterinin
  aktifleştirilen kalemlerinden, finansal maliyet `financing` verisinden gelir; aynı kalem iki kez
  yazılmaz.
- `src/hooks/useReport.ts`: `useProjection()` hook'u; `hasProjectionData` fizibilite dönemleri
  varken true.
- `src/routes/tahmin.tsx`: sayfa başlığı ve içerik projeksiyon merkezine dönüşür (adres değişmez,
  menü etiketi "Projeksiyon 2027–2032"); kontroller yerel durum, grafikler `recharts`.
- `src/routes/karlilik.tsx`: net kâr köprüsü projeksiyon modelinden beslenir, sabit örnek rakamlar
  kaldırılır.
- `src/routes/veri-girisi.tsx`: "Yıl sonu tahmini" sekmesi "Projeksiyon" olur — üç manuel bütçe
  alanı çıkar; senaryo sapmaları, vergi oranı, dönem başı nakit, B2C/kurum anahtarları, yıl bazlı
  CAPEX ve finansman satırları girilir.
- `src/components/report/AppShell.tsx`: menü etiketi güncellenir.
- Doğrulama: `npx tsgo --noEmit` ve Playwright ile `/tahmin`, `/karlilik` ekranları.
