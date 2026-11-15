// Ortam değişkenlerinden public/config.js üretir (Vercel build adımı ve yerel geliştirme).
// Sadece herkese açık değerler yazılır: Supabase URL, anon anahtarı, Turnstile site key.
const fs = require("fs");
const path = require("path");

// Yerelde .env dosyasını oku (bağımlılık yok)
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.SUPABASE_URL || "";
const anon = process.env.SUPABASE_ANON_KEY || "";
const turnstile = process.env.TURNSTILE_SITE_KEY || "";

if (/service_role/i.test(anon) || /sb_secret_/.test(anon)) {
  console.error("HATA: SUPABASE_ANON_KEY alanına gizli (service_role/secret) bir anahtar girilmiş. Public anahtarı kullan.");
  process.exit(1);
}
if (!url || !anon) {
  const msg = "SUPABASE_URL ve SUPABASE_ANON_KEY tanımlı değil.";
  if (process.env.VERCEL) { console.error("HATA: " + msg + " Vercel > Settings > Environment Variables bölümüne ekle."); process.exit(1); }
  console.warn("UYARI: " + msg + " Site yapılandırma uyarısı gösterecek (.env dosyasını doldur).");
}

const cfg = { supabaseUrl: url, supabaseAnonKey: anon, turnstileSiteKey: turnstile };
fs.writeFileSync(path.join(__dirname, "..", "public", "config.js"), "window.__DILEK_CONFIG__ = " + JSON.stringify(cfg) + ";\n");
console.log("public/config.js yazıldı", url ? "(Supabase tanımlı)" : "(Supabase TANIMSIZ)");
