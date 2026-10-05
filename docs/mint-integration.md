# Ekin Mint entegrasyonu — web sitesi

Kaynak: `docs/mint-guide.md` (Mint kılavuzu).

## Akış
Tarayıcı → `POST /api/forms/submit` (Vercel fonksiyonu) → önce Upstash Redis'e yazılır (`request_id` anahtarıyla) → Mint'e gönderilir.
Mint cevap vermezse kayıt kuyrukta kalır; `GET /api/forms/retry` (Vercel Cron) aynı `request_id` ile yeniden dener.
API anahtarı yalnızca sunucuda (`process.env.MINT_API_KEY`); tarayıcı kodunda anahtar yok.

## Formlar
| Sayfa | Form | Mint `form` |
|---|---|---|
| contact.html | `#contactForm` (yeni) | `contact`; konu "Pricing or quote" → `quote`, "Partnership" → `partnership` |
| book-a-demo.html | `#demoForm` | `demo` |
| partners.html | `#findForm` | `contact` (subject: Find a partner) |
| partners.html | `#becomeForm` | `partnership` |
| support.html | `#supportForm` | `support` (Mint'te otomatik ret listesinde) |
| ekin-ventures.html | `#buildForm` | `ventures` (özel değer; Mint olduğu gibi saklar) |

Dahil edilmeyenler: iş/staj başvuruları (`job*.html`, `general-application.html`) ve footer bülten formu. Sunucu `career`, `internship` ve `newsletter` değerlerini reddeder.

## Yanıt kodları (/api/forms/submit)
- `200` Mint'e iletildi (`reference` = WEB-… numarası)
- `202` Kaydedildi, Mint'e gönderim kuyrukta
- `400` Eksik ya da hatalı alan (`errors` alanında Mint alan adlarıyla)
- `429` Aynı IP'den 10 dakikada 10'dan fazla gönderim
- `503` Depo yok ve Mint'e ulaşılamadı → tarayıcı aynı `request_id` ile tekrar dener

## Doğrulama
- **Zorunlu alanlar:** `contact`, `demo`, `quote`, `partnership` ve `support` formlarında `company`, `job_title` ve `country` zorunlu. Bu kontrol hem tarayıcıda (gönderimden önce, eksik alanların tümü işaretlenir) hem sunucuda yapılır; eksik alan varsa istek Mint'e gönderilmez.
- **Ülke:** `country` her zaman ISO 3166-1 alpha-2 kodu olarak gönderilir. Formlarda ülke listesi var ve kod gönderiyor; sunucu "Turkey", "Türkiye", "USA" gibi adları da koda çevirir (`lib/countries.js`). Tanınmayan değerde istek Mint'e gitmez, kullanıcı listeden seçmeye yönlendirilir.
- **Mint 400:** yanıttaki `exception` mesajı `;` işaretlerine göre bölünür ve her maddeden Mint alan adı çıkarılır. Formdaki ilgili kutular işaretlenir ve her alan için anlaşılır bir mesaj listelenir. Örneğin `full_name` hatası formda Ad ve Soyad kutularını işaretler.
- **Mint warnings:** kullanıcıya gösterilmez; gönderim başarılı sayılır. Uyarılar kayda yazılır, kayıt `mint:warned` listesine alınır ve Vercel log'una `[mint] Mint accepted with warnings` satırı düşer.

## İnceleme sayfası
`GET /api/forms/review?format=html`, başlıkta `Authorization: Bearer <REVIEW_TOKEN>` ile (ya da `?token=`). Üç liste gösterir: uyarıyla kabul edilenler, kuyruktakiler ve iletilemeyenler.
Bir uyarılı kaydı incelendi olarak işaretlemek için: `POST /api/forms/review?resolve=<request_id>`.

## Ortam değişkenleri
`.env.example` dosyasına bakın. Zorunlu: `MINT_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET`. Önerilen: `REVIEW_TOKEN`.

## Cron
`vercel.json` dosyası, Hobby planında da çalışabilmesi için günlük çalışacak şekilde (`0 6 * * *` UTC) ayarlı. Ayrıca her başarılı yeni gönderimden sonra kuyruktaki en fazla 3 kayıt yeniden denenir.
Pro planında daha sık çalıştırmak için `*/5 * * * *` yapın.

## Kayıtlar
- Redis anahtarı `mint:req:<request_id>`: durum `queued` / `delivered` / `invalid` / `dead`
- `mint:queue`: yeniden denenecek kayıtlar (ZSET)
- `mint:dead`: 14 gün boyunca iletilemeyen kayıtlar. Silinmezler; Vercel log'larında `[mint]` araması yapın.
