# Bölgesel yönlendirme (ekin.com / ekin.com/us)

Tanımlar `vercel.json` dosyasında:
- Kural yalnızca ana adreste (`/`) çalışır: IP konumu ABD (`x-vercel-ip-country: US`) ise **307** ile `/us` adresine yönlendirilir. Sorgu parametreleri (utm vb.) korunur.
- `/us` hiçbir yönlendirme kuralıyla eşleşmez; konuma bakılmadan doğrudan açılır. Bu yüzden döngü oluşmaz.
- Alt sayfalar (`/spotter.html` gibi), `/assets/*` ve `/api/*` istekleri kuralın dışındadır.
- `/us/` adresi `/us` adresine düzeltilir (sayfadaki göreli linkler bozulmasın diye).
- ABD dışındaki ve konumu bilinmeyen tüm ziyaretçilere `/` açılır. Porto Riko (PR) gibi ayrı ülke kodu olan ABD bölgeleri de bu gruba girer; eklenmesi gerekiyorsa kurala yeni bir `has` satırı eklenmeli.
- `/` yanıtına `Vary: x-vercel-ip-country` başlığı eklenir.

Şu an `/` ve `/us` aynı sayfayı (`ekin-home.html`) açıyor. Global ana sayfa hazır olduğunda `rewrites` altındaki `/` satırı o dosyaya yönlendirilmeli.

Canlıda test: `x-vercel-ip-country` başlığı Vercel tarafından her istekte yeniden yazılır, bu yüzden elle gönderilemez. Test için VPN kullanın:
- ABD konumu: `curl -sI https://ekin.com/` → `307`, `location: /us`
- ABD konumu: `curl -sI https://ekin.com/us` → `200`
- Başka bir ülke: `curl -sI https://ekin.com/` → `200`
