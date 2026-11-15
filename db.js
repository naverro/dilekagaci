// Neon (serverless Postgres) bağlantısı.
// Vercel'de dosya sistemi kalıcı olmadığı için SQLite yerine harici bir veritabanı kullanıyoruz.
const { neon } = require("@neondatabase/serverless");

let sql;
let ready;

async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil");

  if (!sql) sql = neon(url);

  // Tabloyu sadece bir kez (cold start başına) oluştur
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS wishes (
          id           SERIAL PRIMARY KEY,
          text         TEXT        NOT NULL,
          author_id    TEXT        NOT NULL,
          ribbon_count INTEGER     NOT NULL DEFAULT 0,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
    })().catch((err) => {
      ready = null; // hata olursa bir sonraki istekte tekrar dene
      throw err;
    });
  }
  await ready;
  return sql;
}

module.exports = { getDb };
