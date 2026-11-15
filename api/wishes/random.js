// GET /api/wishes/random?authorId=...  -> başkasının rastgele dileği
const { getDb } = require("../../lib/db");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Yöntem desteklenmiyor" });
  }

  try {
    const authorId = String(req.query.authorId || "").slice(0, 64);

    const sql = await getDb();
    const rows = await sql`
      SELECT id, text, ribbon_count AS "ribbonCount"
      FROM wishes
      WHERE author_id <> ${authorId}
      ORDER BY RANDOM()
      LIMIT 1`;

    if (rows.length === 0) {
      return res.status(404).json({ error: "Henüz çekilecek dilek yok" });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};
