# Web Sitesi İletişim Formu → Ekin Mint Entegrasyon Kılavuzu

**Hedef kitle:** Yeni web sitesini geliştiren ekip.
**Amaç:** Web sitesindeki iletişim / demo / teklif formlarından gelen her başvurunun Ekin Mint'e
otomatik düşmesi, satış ekibinin bunları Mint içinde ön değerlendirmeden geçirip uygun olanları
lead'e çevirmesi.

---

## 1. Genel akış

1. Ziyaretçi web sitesinde formu gönderir.
2. Web sitesi sunucusu (**tarayıcı değil, sunucu tarafı**) aşağıdaki uç noktaya bir HTTP POST yapar.
3. Başvuru Mint'te **"Web Talepleri"** gelen kutusuna düşer ve **Beklemede** durumunda bekler.
   Staj / kariyer / destek gibi satış dışı formlar ve "staj, cv…" gibi anahtar kelime içeren
   mesajlar **otomatik olarak reddedilir**; bunlar pipeline'a hiç girmez, yalnızca kayıt olarak durur.
4. Satış ekibi gelen kutusunda talebi açar:
   * **Onayla** → Mint'te **"New"** aşamasında bir lead oluşur (veya aynı e-posta ile zaten lead varsa
     talep o lead'e not olarak eklenir).
   * **Reddet** → kayıt saklanır, lead oluşmaz, pipeline'da görünmez.
5. Her yeni bekleyen talep için ayarlarda tanımlı adreslere e-posta bildirimi gider.

Web sitesi tarafında yapılması gereken tek şey **2. adımdaki POST isteğidir.** Değerlendirme,
lead oluşturma ve bildirim tamamen Mint tarafında çalışır. Bu sayede site değişse bile
entegrasyon aynı kalır: yeni site aynı uç noktaya aynı alanları göndermeye devam eder.

---

## 2. Uç nokta

| | |
|---|---|
| Yöntem | `POST` |
| URL (canlı) | `https://mint.ekin.com/api/method/ekin_mint.api.web_intake.submit` |
| Kimlik doğrulama | `X-Ekin-Api-Key: <anahtar>` başlığı **veya** `Authorization: Bearer <anahtar>` |
| İçerik tipi | `application/json` (form-encoded `application/x-www-form-urlencoded` de kabul edilir) |
| Hız sınırı | IP başına dakikada 120 istek |

Anahtar, Mint → Ayarlar → **Web İletişim Alımı** ekranından bir Mint yöneticisi tarafından üretilir
ve bir kez gösterilir. Anahtar **yalnızca sunucu tarafında** saklanmalı; tarayıcıya / JavaScript'e
gömülmemelidir. Anahtar yenilendiğinde eskisi anında geçersiz olur.

---

## 3. Gönderilecek alanlar

### Zorunlu

| Alan | Tip | Açıklama |
|---|---|---|
| `request_id` | string | Sitenin kendi benzersiz başvuru numarası (UUID vb.). Aynı `request_id` tekrar gönderilirse yeni kayıt açılmaz, ilk kayıt döner. Ağ hatasında güvenle tekrar denemek için gereklidir. |
| `form` | string | Hangi formdan geldiği. Değerler: `contact`, `demo`, `quote`, `partnership`, `career`, `internship`, `support`, `newsletter`, `other`. Bilinmeyen değer kabul edilir ve olduğu gibi saklanır. |
| `full_name` | string | Ad Soyad. Alternatif olarak `first_name` + `last_name` gönderilebilir. |
| `email` | string | Geçerli e-posta. `email` **veya** `phone` en az biri zorunlu. |
| `message` | string | Mesaj metni (`contact` ve `other` formları için zorunlu, diğerlerinde isteğe bağlı). En fazla 10.000 karakter. |

### Satış formlarında ayrıca zorunlu

`contact`, `demo`, `quote`, `partnership` ve `support` formlarında aşağıdaki üç alan da
**zorunludur**; biri bile eksikse istek `400` ile geri döner ve eksik alanların tamamı tek
mesajda listelenir. `career`, `internship`, `newsletter` ve `other` formlarında bu kural
uygulanmaz.

| Alan | Tip | Açıklama |
|---|---|---|
| `company` | string | Kurum / şirket adı. Mint'te müşteri eşleştirmesi için kullanılır. |
| `job_title` | string | Unvan. |
| `country` | string | **ISO 3166-1 alpha-2** ülke kodu gönderin (`TR`, `US`, `DE`). İngilizce ülke adı da çözümlenir (`Turkey`, `Türkiye`, `USA`). Tanınmayan bir değer kaydı engellemez ama yanıtta uyarı döner ve lead'in ülkesi boş kalır. |

Bu liste Mint tarafında ayarlanabilir; değiştirilmesi gerekirse önceden haber verilir.

### İsteğe bağlı (ne kadar çok gönderilirse lead o kadar dolu oluşur)

| Alan | Tip | Açıklama |
|---|---|---|
| `first_name`, `last_name` | string | Ad ve soyad ayrı ayrı. |
| `phone` | string | Uluslararası formatta telefon (`+90 5xx …`). |
| `city` | string | Şehir. |
| `website` | string | Kurumun web sitesi. |
| `subject` | string | Konu satırı. |
| `products` | string[] veya string | İlgilenilen ürünler (`["Ekin Patrol", "Ekin Spotter"]` ya da virgülle ayrılmış metin). |
| `language` | string | Formun dili (`tr`, `en`). |
| `page_url` | string | Formun bulunduğu sayfa. |
| `utm_source`, `utm_medium`, `utm_campaign` | string | Kampanya takibi. |
| `consent` | boolean | KVKK / pazarlama onayı kutucuğu. |
| `submitted_at` | string | ISO-8601 gönderim zamanı (`2026-09-02T09:15:00Z`). Boşsa Mint'in aldığı an kullanılır. |
| `source_site` | string | Gönderen site (`www.ekin.com`). |
| `instance` | string | Varsayılan `mint`. Snapfy sitesi için `snapfy` gönderilir. |

Metin alanları 140 karakterde kesilir (mesaj 10.000, ürünler 1.000). Ek dosya (CV vb.) kabul
edilmez; zaten kariyer başvuruları lead değildir.

### Örnek istek

```bash
curl -X POST https://mint.ekin.com/api/method/ekin_mint.api.web_intake.submit \
  -H "Content-Type: application/json" \
  -H "X-Ekin-Api-Key: ekw_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "request_id": "5f3c2a1e-9b7d-4c3e-8f1a-2b6d9e4c7a10",
    "form": "demo",
    "full_name": "Jane Doe",
    "email": "jane.doe@example-city.gov",
    "phone": "+1 480 555 0100",
    "company": "Example City Police Department",
    "job_title": "Lieutenant",
    "country": "US",
    "city": "Mesa",
    "website": "https://example-city.gov",
    "subject": "Demo request for LPR",
    "message": "We would like a demo of Ekin Patrol for our 40 patrol cars.",
    "products": ["Ekin Patrol", "Ekin Spotter"],
    "language": "en",
    "page_url": "https://www.ekin.com/contact",
    "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "lpr-2026",
    "consent": true,
    "submitted_at": "2026-09-02T09:15:00Z",
    "source_site": "www.ekin.com"
  }'
```

---

## 4. Yanıtlar

Başarılı istekte HTTP `200`:

```json
{"message": {"ok": true, "name": "WEB-2026-00001", "status": "Pending", "duplicate": false, "warnings": []}}
```

* `name` — Mint'teki kayıt numarası (sitenin kendi tarafında saklaması önerilir).
* `status` — `Pending` (değerlendirme bekliyor) veya `Auto Rejected` (satış dışı diye elendi).
  Her iki durumda da istek başarılıdır; siteye özel bir işlem düşmez.
* `duplicate: true` — aynı `request_id` daha önce alınmış, mevcut kayıt döndü.
* `warnings` — kayıt oluştu ama düzeltilmesi önerilen noktalar. Bugün tek uyarı, `country`
  değerinin hiçbir ülkeyle eşleşmemesi. Kullanıcıya gösterilmez; log'a yazıp bize iletmeniz yeterli.

Hata durumları:

| HTTP | `exc_type` | Anlamı |
|---|---|---|
| 400 | `WebIntakeError` | Eksik / hatalı alan. **Tüm sorunlar tek mesajda** `exception` alanında döner, ör. `Missing or invalid fields: company is required for the 'contact' form; job_title is required for the 'contact' form.` Alan adları yukarıdaki tablolardaki adlarla birebir aynıdır, formda ilgili kutuyu işaretlemek için doğrudan kullanılabilir. |
| 401 | `AuthenticationError` | API anahtarı yok veya yanlış. |
| 403 | `PermissionError` | Alım Mint ayarlarından kapatılmış **veya** POST dışı bir yöntem kullanılmış. |
| 429 | — | Hız sınırı aşıldı; `Retry-After` bekleyip tekrar deneyin. |
| 5xx | — | Sunucu hatası; aynı `request_id` ile tekrar denenebilir (mükerrer kayıt oluşmaz). |

**Öneri:** Site tarafında başvuruyu önce kendi veritabanına yazıp Mint'e göndermeyi kuyruğa alın;
Mint geçici olarak erişilemezse aynı `request_id` ile tekrar deneyin. Böylece hiçbir başvuru
kaybolmaz ve mükerrer kayıt oluşmaz.

---

## 5. Mint tarafı (satış ekibi için)

* **Web Talepleri** ekranı sol menüde yer alır; Mint kullanıcısı olan herkes görür.
  Durum kartları (Beklemede / Onaylandı / Reddedildi / Otomatik Reddedildi) filtre görevi görür.
* Talep satırına tıklayınca detay açılır. **Onayla** bölümünde müşteri, kaynak, ülke ve lead sahibi
  isteğe bağlı olarak düzeltilebilir; boş bırakılırsa ayarlardaki varsayılanlar kullanılır.
* Aynı e-posta ile mevcut bir lead varsa satırda "mevcut lead" rozeti çıkar; onaylarken
  "mevcut lead'e ekle" seçeneğiyle mükerrer lead açılması engellenir.
* Reddedilen veya otomatik reddedilen kayıtlar **Beklemeye Geri Al** ile kurtarılabilir.
* Ayarlar → **Web İletişim Alımı** (yalnızca yönetici): alımı aç/kapat, API anahtarı üret,
  varsayılan kaynak / sahip, otomatik ret formları ve anahtar kelimeleri, zorunlu alan kuralı
  (hangi formlarda hangi alanlar aranacak) ve bildirim e-postaları.
* **Not:** `support` formu hem zorunlu alan listesinde hem de otomatik ret listesindedir. Yani
  destek talepleri eksiksiz gönderilmek zorundadır ama pipeline'a girmez, "Otomatik Reddedildi"
  olarak arşivlenir. Destek taleplerinin de değerlendirmeye girmesi istenirse `support`
  otomatik ret listesinden çıkarılmalıdır.

---

## 6. Canlıya alma notları (ERP ekibi)

* `bench migrate` (yeni DocType **Mint Web Contact Request** + Mint Settings alanları + `seed_web_intake_defaults` patch'i).
* Mint frontend build ve dağıtımı.
* Mint → Ayarlar → Web İletişim Alımı: **Anahtar üret**, **Alımı aç**, bildirim adreslerini gir.
* Anahtarı web ekibine güvenli bir kanaldan ilet (e-posta gövdesine yazılmamalı).
