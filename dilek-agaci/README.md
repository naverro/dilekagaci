# 🌳 Dilek Ağacı

Mevcut tasarım (SVG ağaç, kurdeleler, kraft kâğıt modal) korunarak gerçek bir veritabanına, canlı güncellemeye,
beğeniye, spam korumasına ve yönetici paneline bağlandı. Sunucu yok: statik site + Supabase.

```
public/index.html      Ana site (orijinal tasarım)
public/admin.html      Yönetici paneli (DESIGN.md renk/tipografi)
public/js/*.js         Modüller: tree (kurdele yerleşimi), modal, form, api, session, captcha, main, admin
scripts/               build-config.js (env -> config.js), gen-anchors.js (slot üretici), dev-server.js
supabase/schema.sql    Tablolar, RLS, tetikleyiciler, submit_wish(), Realtime  (BİR KEZ çalıştır)
supabase/seed.sql      İsteğe bağlı: tasarımdaki 22 örnek dilek
tests/                 UI mantık testi (sahte DOM + sahte Supabase)
```

## Kurulum

**1. Supabase projesi aç** ([supabase.com](https://supabase.com)) ve `Project Settings > API` bölümünden `Project URL` ile `anon` (publishable) anahtarı not al.

**2. Şemayı yükle:** `SQL Editor` içine `supabase/schema.sql` dosyasının tamamını yapıştırıp çalıştır. (İstersen sonra `seed.sql`.)

**3. Anonim girişi aç:** `Authentication > Sign In / Providers > Allow anonymous sign-ins`. Ziyaretçiler hesapsız ama kalıcı bir kimlikle beğeni/dilek gönderir.

**4. Bot koruması (önerilir):** [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) ücretsiz widget oluştur (hostname: `localhost` ve Vercel alan adın).
`Authentication > Attack Protection > Enable CAPTCHA` > Turnstile > **secret key**'i yapıştır. **Site key**'i `TURNSTILE_SITE_KEY` olarak kullan.
CAPTCHA'yı Supabase'de açarsan yönetici girişi de dahil tüm girişler token ister (site bunu otomatik yapar). Test için Cloudflare'in sahte anahtarları: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

**5. Yönetici hesabı:** `Authentication > Users > Add user` ile e-posta + şifre oluştur (Auto Confirm açık). Sonra SQL Editor'de:
```sql
insert into public.admins (user_id) select id from auth.users where email = 'SENIN@EPOSTAN.COM';
```
Yönetici yetkisi sadece bu tablodan gelir; e-postayla kayıt olan herkesin yetkisi yoktur. Panel: `/admin`.

**6. Yerelde çalıştır:**
```bash
cp .env.example .env     # değerleri doldur
npm run dev              # http://localhost:3000   (yönetim: /admin)
npm test                 # UI mantık testi
```

**7. Vercel'e yayınla:** Projeyi **klasör yapısı bozulmadan** GitHub'a yükle (`git push` önerilir; web arayüzüne dosya sürüklerken klasörleri değil içeriği bırakırsan yapı kaybolur).
Vercel > Import > Framework **Other** (`vercel.json` build ve çıktı klasörünü ayarlar).
`Settings > Environment Variables`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TURNSTILE_SITE_KEY`. Sonra Deploy/Redeploy.
Bu sürümde `api/` klasörü ve sunucu fonksiyonu yok; önceki Neon sürümüne artık gerek yok.

## Güvenlik nasıl çalışıyor

- **Gizli anahtar yok.** Tarayıcıdaki `anon` anahtarı herkese açık olacak şekilde tasarlandı; asıl koruma RLS. `service_role` anahtarı hiçbir yerde kullanılmaz (build, `service_role`/`sb_secret_` görürse durur).
- **Anonim kullanıcılar doğrudan tabloya yazamaz.** Dilek sadece `submit_wish()` ile eklenir: metin temizlenir, 200/32 karakter sınırı sunucuda uygulanır, renk beyaz listeyle doğrulanır.
- **Hız sınırı:** kullanıcı başına 20 sn bekleme + saatte 5 dilek, IP başına (hash'li) saatte 30 dilek. Sayılar `submit_wish()` içinde.
- **Moderasyon:** `auto` modda dilek hemen asılır; bağlantı/e-posta içeren ya da `settings.blocklist` kelimesi geçenler onaya düşer. `manual` modda hepsi onaya düşer (panelden değişir).
  `update public.settings set blocklist = array['kelime1','kelime2'];`
- **Okuma:** herkes sadece `approved` dilekleri okur. IP hash'i ve kullanıcı kimliği ayrı, kimsenin okuyamadığı tabloda tutulur.
- **Beğeni:** kişi başı dilek başına bir kayıt (birincil anahtar), sayaç tetikleyiciyle tutulur; istemci sayıyı değiştiremez.
- **Yönetici:** onay/ret/silme yetkisi RLS + `is_admin()` ile sunucuda doğrulanır; arayüzdeki gizli bir buton değil.
- **XSS:** dilekler yalnızca `textContent` ile basılır, SVG DOM API ile üretilir, renk `#rrggbb` değilse reddedilir.

## Kurdele yerleşimi

Ağaçta 59 sabit **slot** var (`scripts/gen-anchors.js`, kurdeleler arası mesafe garantili, üst üste binmez, mobilde dokunma alanı geniş).
Dilek onaylanınca veritabanı rastgele boş bir slot atar; böylece her cihazda aynı yerde görünür. Ağaç dolunca **en eski kurdele ağaçtan düşer**
(dilek silinmez, sayaç onaylı tüm dilekleri sayar). Kapasiteyi artırmak için `gen-anchors.js` ayarlarını değiştirip `node scripts/gen-anchors.js` çalıştır, sonra `update public.settings set slot_count = <yeni sayı>;`.

## Elle doğrulama listesi (test ortamında yapamadığımız kısımlar)

RLS kontrolü (anon anahtarla, terminalden):
```bash
curl "$SUPABASE_URL/rest/v1/wishes?select=*&status=eq.pending" -H "apikey: $SUPABASE_ANON_KEY"          # -> []
curl -X POST "$SUPABASE_URL/rest/v1/wishes" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"wish_text":"x","ribbon_color":"#10b981","status":"approved"}'                                  # -> izin hatası
curl "$SUPABASE_URL/rest/v1/wish_private?select=*" -H "apikey: $SUPABASE_ANON_KEY"                        # -> izin hatası
```
Sonra tarayıcıda: dilek ekle, yenile (kalıcı mı), ikinci cihaz/gizli pencerede aynı kurdeleyi gör, canlı güncellemeyi iki sekmeyle dene,
beğen/geri al/yenile, 6 dilek peş peşe gönder (hız sınırı mesajı), `/admin`'de onayla/reddet/sil, mobilde kurdeleye dokun.

## Bilinen sınırlar

- Tailwind, orijinal koddaki gibi CDN (Play CDN) ile geliyor; üretimde derlenmiş CSS daha hızlıdır.
- `supabase-js` CDN'den sabit sürümle yükleniyor (`2.45.4`), SRI/CSP eklenmedi.
- Reddedilen bir dilek Realtime ile anında düşmeyebilir; istemci bunu en geç 90 sn içinde (veya sekmeye dönünce) eşitler.
- Beğeni aç/kapa için ayrı bir hız sınırı yok; sınırı anonim giriş + CAPTCHA koruyor.
