// Cloudflare Turnstile (bot koruması). TURNSTILE_SITE_KEY boşsa CAPTCHA atlanır.
// Token'ı Supabase Auth sunucu tarafında doğrular (Dashboard > Authentication > Attack Protection).
import { config } from "./supabase-client.js";

let scriptPromise = null;
let widgetId = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error("captcha_load_failed")); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export async function getCaptchaToken() {
  const sitekey = config.turnstileSiteKey;
  if (!sitekey) return undefined;
  await loadScript();
  const box = document.getElementById("captchaBox");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("captcha_timeout")), 60000);
    if (widgetId !== null) { try { window.turnstile.remove(widgetId); } catch { /* yok say */ } }
    widgetId = window.turnstile.render(box, {
      sitekey,
      language: "tr",
      appearance: "interaction-only", // sadece gerekirse görünür
      callback: (token) => { clearTimeout(timer); resolve(token); },
      "error-callback": () => { clearTimeout(timer); reject(new Error("captcha_failed")); },
    });
  });
}
