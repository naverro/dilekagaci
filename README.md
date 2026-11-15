# 🌳 Dilek Ağacı

Bir dilek bırak, başkasının dileğini çek, kurdele at. Vercel'e deploy edilmeye hazır.

## Yapı

```
public/index.html          Arayüz (tek sayfa, ağaç teması)
api/wishes/index.js        POST /api/wishes              -> dilek bırak
api/wishes/random.js       GET  /api/wishes/random       -> rastgele dilek çek
api/wishes/[id]/ribbon.js  POST /api/wishes/:id/ribbon   -> kurdele at
lib/db.js                  Neon Postgres bağlantısı + tablo oluşturma
```

Vercel'de dosya sistemi kalıcı olmadığı için (serverless) SQLite çalışmaz;
bu yüzden veritabanı olarak Neon (serverless Postgres) kullanıldı. Tablo ilk istekte otomatik oluşur.

## Deploy

1. Klasörü bir GitHub reposuna yükle.
2. [vercel.com](https://vercel.com) → **Add New → Project** → repoyu seç → Framework: **Other** → Deploy.
3. Projenin **Storage** sekmesinden (Marketplace) **Neon** veritabanı oluşturup projeye bağla.
   Bu, `DATABASE_URL` ortam değişkenini otomatik ekler. Değişken adı farklıysa
   Settings → Environment Variables'dan `DATABASE_URL` olarak kendin ekle.
4. Env değişkeni eklendikten sonra **Redeploy** yap.

## Yerelde çalıştırma

```bash
npm install
npm i -g vercel
vercel link
vercel env pull .env.local   # DATABASE_URL'i indirir
vercel dev                   # http://localhost:3000
```

## Notlar

- Kimlik: tarayıcı ilk açılışta rastgele `authorId` üretip localStorage'a yazar; kendi dileğini çekmemen için kullanılır.
- Kurdele tekrarını engelleme şu an sadece tarayıcı tarafında (localStorage). Sunucu tarafı sınırlama sonraki adım olabilir.
- Dilekler `textContent` ile basılır (XSS'e karşı), SQL sorguları parametrelidir (`${}` ile).
- Sonraki fikirler: rate limit, küfür filtresi, dilek raporlama, "bugün en çok kurdele alan dilekler".
