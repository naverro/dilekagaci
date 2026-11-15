// Küçük yardımcılar: DOM, tarih, renk doğrulama, bildirim, hata metinleri.
export const $ = (sel, root = document) => root.querySelector(sel);

const HEX = /^#[0-9a-f]{6}$/i;
export const safeColor = (c) => (HEX.test(c || "") ? c.toLowerCase() : "#10b981");

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

// Zarif, kısa süreli bildirim (aria-live)
let toastEl, toastTimer;
export function toast(message, kind = "ok") {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.className =
      "fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] px-4 py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg " +
      "transition-all duration-300 opacity-0 -translate-y-2 pointer-events-none";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.toggle("bg-nature-700", kind === "ok");
  toastEl.classList.toggle("text-white", true);
  toastEl.classList.toggle("bg-rose-700", kind === "error");
  toastEl.classList.remove("opacity-0", "-translate-y-2");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("opacity-0", "-translate-y-2"), kind === "error" ? 5000 : 3200);
}

// Sunucu/ağ hatalarını kullanıcıya anlaşılır Türkçe metne çevirir
export function friendlyError(err) {
  const msg = String((err && err.message) || err || "");
  if (msg.includes("not_configured")) return "Site henüz yapılandırılmamış. Yönetici ayarları tamamlamalı.";
  if (msg.includes("rate_limited") || (err && err.status === 429)) return "Çok sık dilek gönderdin. Biraz bekleyip tekrar dene.";
  if (msg.includes("empty_wish")) return "Önce dileğini yaz.";
  if (msg.includes("wish_too_long")) return "Dilek en fazla 200 karakter olabilir.";
  if (msg.includes("author_too_long")) return "Ad en fazla 32 karakter olabilir.";
  if (msg.includes("invalid_color")) return "Kurdele rengi geçersiz. Bir renk seçip tekrar dene.";
  if (/captcha/i.test(msg)) return "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene.";
  if (/anonymous/i.test(msg)) return "Anonim giriş kapalı. Yönetici Supabase'de anonim girişi açmalı.";
  if (/failed to fetch|networkerror|network request|load failed/i.test(msg)) return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
  return "Dilek gönderilemedi. Birazdan tekrar dene.";
}
