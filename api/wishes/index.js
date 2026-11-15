// POST /api/wishes  -> dilek bırak
const { getDb } = require("../../lib/db");

const MAX_LEN = 200;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Yöntem desteklenmiyor" });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const text = String(body.text || "").trim();
    const authorId = String(body.authorId || "").trim();

    if (!authorId || authorId.length > 64) {
      return res.status(400).json({ error: "Geçersiz kimlik" });
    }
    if (!text) return res.status(400).json({ error: "Dilek boş olamaz" });
    if (text.length > MAX_LEN) {
      return res.status(400).json({ error: `En fazla ${MAX_LEN} karakter` });
    }

    const sql = await getDb();
    const rows = await sql`
      INSERT INTO wishes (text, author_id)
      VALUES (${text}, ${authorId})
      RETURNING id`;

    return res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};
