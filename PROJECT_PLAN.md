# PayoutLens / çalışma planı — 30 Eylül 2026

## Ürün hipotezi

Solana ödül ve hibe ödemelerinin birden fazla alıcıya, farklı stablecoin mintleriyle yapıldığı süreçlerde gönderilen işlem bağlantısı tek başına hakedişin ödendiğini kanıtlamıyor. Hedef kullanıcı: topluluk ödeme operatörü ve ödül bekleyen katılımcı. Bu hipotez henüz kullanıcı görüşmeleriyle doğrulanmadı.

Çalışan sürüm: Beklenen alıcı + mint + tutar ile gerçek zincir verisini karşılaştıran, para taşımayan kontrol aracı. Sunum sayfası ve ayrı uygulama rotası, tekli kontrol, yerel CSV hakediş listesi, kısmi/ fazla ödeme ayrımı, aynı kanıtın mevcut listede yeniden kullanılması, kaynak gösterimi ve rapor çıktıları uygulandı. Kalıcı operatör onay kuyruğu ve farklı geçmiş raporlar arasında hakediş kapatma uygulanmadı.

## Rakip araştırması ve farkın sınanması

- Request Finance: https://support.request.finance/ — fatura, bordro, gider yönetimi zaten var.
- Hanko: https://www.joinhanko.com/solutions/accept-solana-payments — Solana faturasını zincir üzerinde doğruluyor.
- OnchainInvoice: https://www.onchaininvoice.com/ — kripto fatura ve kayıt/receipt sunuyor.
- SettleProof: https://github.com/milaforge/settle-proof — ödeme doğrulaması ve RPC uzlaşması üzerine çalışıyor. Bu isim kullanılmamalı.

Dolayısıyla “ilk Solana fatura uygulaması” veya “rakipsiz ödeme doğrulama” iddiası yapılmayacak. Potansiyel farklılaşma: mevcut faturaları değiştirmeden toplu ödül hakedişlerini sonradan uzlaştırma, token sembolü değil mint adresi, tekrar kullanılan ödeme kanıtlarını ayırma ve her kararı denetlenebilir veriye bağlama. Rakiplerin bu özelliklerden yoksun olduğu henüz kanıtlanmadı.

## Karar kapıları

1. En az 3 gerçek potansiyel kullanıcının bu süreçte yaşadığı sorunu öğren; sonuçları anonim ve izinli kaydet. Görüşme yapılmadı. Kullanıcı/ciro/ortaklık uydurulmayacak.
2. Bir operatörün anonimleştirilmiş örnek payout listesi üzerinde mevcut sürece göre faydayı ölç. Fayda yoksa ürün yönünü değiştir.
3. İki gerçek ağ ortamında test: devnet başarı/kısmi/hatalı-token ödemeleri; mainnet yalnızca izinli, kamuya açık işlemlerin okunması. Gerçek para transferi gerekmiyor.
4. Batch duplicate guard, allocation ID ve tutar toplamları doğru çalışmadan toplu “ödendi” sonucu vermeme.
5. Basit transfer dışı işlemler fail-closed/manual-review. Güvenlik incelemesi olmadan para tutma, işlem imzalama, escrow ekleme.

## Yarışma kontrol listesi

Kaynak: https://superteam.fun/api/listings/details/submit-crypto-worlds-fair-project-for-turkish-builders

- Turkey ana ülke, Colosseum kayıt, Türkiye intake form ve Telegram grubu.
- Ana Colosseum + Türkiye yerel ilanına ayrı başvurular.
- Çalışan ürün, erişilebilir GitHub, İngilizce pitch ve demo. Güncel rehberdeki daha dar sınırla pitch en fazla 2 dakika; demo en fazla 3 dakika planlanacak. Başvuru öncesi güncel kurallar tekrar kontrol edilmeli.
- Yerel havuz 5.000 / 3.000 / 2.000 USDG. Ödül garantisi yok.
- Yerel API son tarihi 13 Ekim 2026 06:59 UTC = 09:59 Türkiye.
- Ana resmi kurallar: https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf — 12 Ekim 23:59 PT = 13 Ekim 09:59 Türkiye. Son saat beklenmeyecek.
- 18+ şartı ve diğer kişi/kurum uygunluk şartlarını katılımcı doğrulamalı.
- İnsan başvurusu yapılacak (`HUMAN_ONLY`). AI destekli kodlamanın kapsamına dair özel yasak taranan resmi PDF'de bulunmadı; bu sınırsız otonom katılım izni değildir. Organizatör rehberi/formundaki güncel şartları başvurudan önce yeniden kontrol et; AI katkısını şeffaf açıkla.
- Formdaki eski “Frontier” sorusu ve açıklama/formdaki video farkı için organizatörden netleştirme gerekebilir. Mesaj henüz gönderilmedi.

## Hedef takvim (garanti değil)

30 Eylül–1 Ekim: doğrulama çekirdeği + prototip + kayıt adımları.
2–4 Ekim: gerçek kullanıcı doğrulaması ve toplu hakediş akışı.
5–7 Ekim: devnet testleri, tekrar kullanılan kanıtlar, istisna ekranı.
8–10 Ekim: gerçek test kullanıcıları, hata düzeltme, iş modeli ve İngilizce anlatım.
11 Ekim: erişilebilir repo, pitch/demo, başvuru kontrolü.
12 Ekim: iki portala son kontrollerle başvuru.

## Bugünkü durum

39 deterministik test geçti. Kamuya açık bir mainnet USDC transferi yerel tarayıcı → kısıtlı sunucu → resmi RPC yolunda gerçek alıcı/mint/tutarla eşleşti (işlem ve tutar README'de). Bu bizim ödülümüz veya müşterimiz değildir. Doğrudan tarayıcı-RPC isteği 403 verdiği için gerçek sunucu katmanı eklendi. İşlem v1 yanıtı desteği güncel resmi dokümantasyona göre eklendi. Kalıcı kayıt, küresel tekrar tahsisi, kimlik doğrulayan fatura kanıtı, üretim SLA'sı ve gerçek müşteri doğrulaması hâlâ yok. Site mevcut özel erişimini korur; jüri erişimi ayrıca insanın kararıyla açılmalı. Gelir, kullanıcı, başarı oranı veya ödül kazanımı iddiası yok.
