// Ortam değişkenlerinden public/config.js üretir (Vercel build adımı ve yerel geliştirme).
// Sadece herkese açık değerler yazılır: Supabase URL, anon/publishable anahtarı, Turnstile site key.
const fs = require("fs");
const path = require("path");

// Yerelde .env dosyasını oku (bağımlılık yok)
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

// İlk dolu değişkeni al; yapıştırma hatalarını (boşluk, tırnak) temizle
function pick(...names) {
  for (const name of names) {
    const raw = process.env[name];
    if (raw && raw.trim()) return { name, value: raw.trim().replace(/^["']+|["']+$/g, "").trim() };
  }
  return null;
}
function jwtRole(key) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try { return JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")).role || null; }
  catch { return null; }
}

const urlVar = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const keyVar = pick("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const tsVar = pick("TURNSTILE_SITE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY");

const problems = [];
let fatalSecret = false;
if (!urlVar) problems.push("SUPABASE_URL tanımlı değil (örnek: https://xxxx.supabase.co).");
else if (!/^https:\/\/\S+$/i.test(urlVar.value)) problems.push(`${urlVar.name} "https://" ile başlayan tam adres olmalı (örnek: https://xxxx.supabase.co).`);
if (!keyVar) problems.push("SUPABASE_ANON_KEY tanımlı değil (Supabase > Project Settings > API > anon / publishable anahtar).");
else if (/^sb_secret_/.test(keyVar.value) || jwtRole(keyVar.value) === "service_role" || /service_role/i.test(keyVar.value)) {
  problems.push(`${keyVar.name} içine GİZLİ (service_role / secret) anahtar girilmiş. Herkese açık "anon / publishable" anahtarı kullan.`);
  fatalSecret = true;
}

if (problems.length) {
  const seen = Object.keys(process.env).filter((k) => /SUPABASE|TURNSTILE/i.test(k));
  console.error("\nHATA: Yapılandırma eksik veya hatalı:");
  problems.forEach((p) => console.error("  - " + p));
  console.error("Build ortamında görülen ilgili değişken adları: " + (seen.length ? seen.join(", ") : "(hiçbiri)"));
  console.error("Vercel > Settings > Environment Variables bölümünü kontrol et (Production işaretli olmalı), sonra Redeploy yap.\n");
  if (process.env.VERCEL || fatalSecret) process.exit(1);
  console.warn("UYARI: Yerelde devam ediliyor; site yapılandırma uyarısı gösterecek.");
}

const cfg = {
  supabaseUrl: urlVar ? urlVar.value.replace(/\/+$/, "") : "",
  supabaseAnonKey: keyVar && !fatalSecret ? keyVar.value : "",
  turnstileSiteKey: tsVar ? tsVar.value : "",
};
fs.writeFileSync(path.join(__dirname, "..", "public", "config.js"), "window.__DILEK_CONFIG__ = " + JSON.stringify(cfg) + ";\n");
console.log("public/config.js yazıldı", cfg.supabaseUrl ? `(Supabase: ${cfg.supabaseUrl})` : "(Supabase TANIMSIZ)");
