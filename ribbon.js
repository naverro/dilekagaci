// POST /api/wishes/:id/ribbon  -> kurdele at
const { getDb } = require("../../../lib/db");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Yöntem desteklenmiyor" });
  }

  try {
    const id = Number.parseInt(req.query.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Geçersiz dilek" });
    }

    const sql = await getDb();
    const rows = await sql`
      UPDATE wishes
      SET ribbon_count = ribbon_count + 1
      WHERE id = ${id}
      RETURNING ribbon_count AS "ribbonCount"`;

    if (rows.length === 0) return res.status(404).json({ error: "Dilek bulunamadı" });
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};
