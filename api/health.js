// GEÇİCİ teşhis endpoint'i: GET /api/health
// Deploy sorunu çözülünce bu dosyayı sil.
const { getDb } = require("../lib/db");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const out = { api: true, hasDatabaseUrl: !!process.env.DATABASE_URL, db: false };

  try {
    const sql = await getDb();
    const rows = await sql`SELECT COUNT(*)::int AS wishes FROM wishes`;
    out.db = true;
    out.wishes = rows[0].wishes;
    return res.status(200).json(out);
  } catch (err) {
    out.error = String(err && err.message ? err.message : err).slice(0, 200);
    return res.status(500).json(out);
  }
};
