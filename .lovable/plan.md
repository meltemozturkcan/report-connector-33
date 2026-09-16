# Edinim maliyeti ve birim maliyet kartları

Amaç: (1) gerçek freemium CAC'i kanal ve cohort bazında ölçmek, (2) 100 TL freemium CAC'in Basic/Premium ekonomisinde sürdürülebilir olup olmadığını test etmek, (3) 1 yıllık profesyonel B2B lisansın edinim dâhil tam maliyet kartını göstermek. Üçü ayrı tablolar olarak durur, karışmaz.

## Mükerrerlik nasıl engellenir

Tek bir "maliyet defteri" mantığı kullanılır (ilk yıl Ar-Ge / şirket ayrımında çalışan yöntemin aynısı):

- Her gider kalemi defterde **yalnızca bir satırda** girilir.
- Her satırda bir **yer (bucket)** seçilir: `B2C CAC`, `B2B CAC`, `Yönlendirme CAC`, `Ürün COGS`, `Ürün operasyon`, `Ar-Ge / ürün OPEX`, `Genel yönetim`, `Uzman hizmet maliyeti`.
- Her satırda bir **atıf oranı (%)** vardır. Örnek: pazarlama personelinin %30'u B2C edinimine ayrılıyorsa yalnız %30'u B2C CAC havuzuna girer; kalan %70 otomatik olarak "dağıtılmayan / genel" tarafta kalır. Toplam her zaman kalem tutarına eşittir.
- Kanal CAC'i hesaplanırken yalnızca `B2C CAC` (veya `B2B CAC`) kovasındaki atfedilmiş paylar toplanır. GPU, POS komisyonu, uzman emeği, Ar-Ge, muhasebe/ofis, B2B bütçesi ve yenileme maliyeti CAC kovasına konulamaz; bu kalemler kendi kovalarında görünür ve CAC dışı olarak ayrı listelenir.
- Uyarı üretilen durumlar: aynı isim iki satırda; kanal tablosundaki harcama toplamı ile defterden atfedilen B2C harcaması arasında fark; atıf oranı %100'ü aşan satır.

## Tablolar (yeni "Edinim ve birim maliyet" sayfası)

1. **Edinim harcaması defteri** — kalem, yer, tutar, atıf oranı, atfedilen tutar, dışarıda kalan tutar; kova bazında toplamlar ve CAC havuzu.
2. **Cohort bazlı freemium CAC** — Mart, Nisan, Mayıs, Haziran cohort'ları için ayrı tablo: Kanal | Harcama | Uygun ücretsiz ebeveyn | Gerçek freemium CAC, altında Toplam satırı (toplam harcama / toplam uygun ebeveyn). Payda tanımı tablo altında not olarak yazılı: onam + gelişim öyküsü + teknik kalite + paket ekranı görüntüleme.
3. **Cohort karşılaştırma** — dört cohort'un blended freemium CAC, uygun ebeveyn ve harcama seyri.
4. **Ücretli B2C CAC duyarlılığı** — Ücretli CAC = freemium CAC ÷ ücretsizden ücretliye dönüşüm; %10/%15/%20/%25/%30 satırları, gerçek ölçülen dönüşüm satırı işaretli.
5. **Basic / Premium ekonomi kartı** — paket fiyatı, ödeme komisyonu sonrası net gelir, kullanıcı/rapor başına teknik maliyet, destek maliyeti, katkı payı, aylık churn → beklenen abonelik süresi, LTV, paket karması, karma LTV; ücretli CAC ile LTV/CAC ve geri ödeme süresi.
6. **B2B lisans tam maliyet kartı** — dört bölüm:
   - Doğrudan teknik maliyet: rapor başına GPU / işlem / depolama / OTP-SMS / e-posta × rapor adedi, ödeme komisyonu (yalnız çevrim içi tahsil edilen pay), destek payı → hesap başına doğrudan maliyet.
   - Sabit ürün operasyon maliyeti: kalem, yıllık tutar, ürün kullanım payı (%), lisans başına tutar; bölen **aktif lisans eşdeğeri** = Ocak–Aralık aktif lisans toplamı ÷ 12.
   - CAC alt kırılımı: doğrudan B2B ve yönlendirme alt kalemleri, yeni lisans adetleri, kanal CAC'leri ve ağırlıklı CAC.
   - Katkı özeti: teknik brüt katkı, doğrudan hesap katkısı, CAC öncesi operasyon katkısı, doğrudan/yönlendirme/ağırlıklı CAC ile ilk yıl katkı; yenilemede CAC yüklenmediği notu.

## Veri girişi

Veri Girişi sayfasına iki sekme eklenir:
- **Edinim (B2C)**: harcama defteri, cohort × kanal tabloları, freemium→ücretli dönüşüm, Basic/Premium fiyat, komisyon, teknik/destek maliyeti, churn, karma.
- **B2B lisans maliyeti**: rapor adedi ve rapor başına maliyet kalemleri, lisans fiyatı, çevrim içi tahsilat payı, aylık aktif lisans adetleri (12 ay), sabit operasyon kalemleri, CAC alt kalemleri.

Hiçbir alan otomatik doldurulmaz; mesajdaki rakamlar örnek olduğu için boş kalır ve girilince tüm tablolar canlı hesaplanır.

## Teknik notlar

- `src/lib/report-schema.ts`: yeni `acquisition` bloğu (spendLedger, b2cCohorts, b2cUnit, b2bLicense) + boş satır sabitleri; mevcut kayıtlar bozulmaz çünkü `parseReportInput` eksik blokları varsayılanla doldurur.
- `src/lib/acquisition-calc.ts`: yeni saf hesaplama modülü (defter atıfları, cohort CAC, dönüşüm duyarlılığı, LTV, B2B maliyet kartı, uyarılar).
- `src/hooks/useReport.ts`: `useAcquisition` hook'u.
- `src/routes/edinim.tsx`: yeni sayfa, mevcut `Section`/`DataTable`/`KpiCard`/`Insight` bileşenleriyle; navigasyona eklenir.
- `src/routes/veri-girisi.tsx`: iki yeni sekme, mevcut `RepeatTable`/`NumberField` ile.
