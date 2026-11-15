// Dilek modalı (kraft kâğıt). Orijinal açılış/kapanış animasyonları korunur.
import { $, formatDate, safeColor } from "./util.js";

export function createModal({ onLike }) {
  const root = $("#wishModal");
  const card = $("#wishModalCard");
  const likeBtn = $("#likeBtn");
  const heart = likeBtn.querySelector(".heart-icon");
  const countEl = likeBtn.querySelector(".like-count");
  let current = null;
  let lastFocus = null;

  const isOpen = () => !root.classList.contains("pointer-events-none");

  function paintLike({ liked, count }) {
    heart.textContent = liked ? "❤️" : "🤍";
    countEl.textContent = String(count);
    likeBtn.classList.toggle("text-rose-600", liked);
    likeBtn.setAttribute("aria-pressed", String(liked));
  }

  function open(wish, { liked = false, pending = false } = {}) {
    current = wish;
    $("#modalRibbonColor").style.backgroundColor = safeColor(wish.ribbon_color);
    $("#modalWishText").textContent = `"${wish.wish_text}"`;
    $("#modalAuthor").textContent = wish.author_name || "Anonim";
    const date = wish.created_at ? formatDate(wish.created_at) : "";
    $("#modalDate").textContent = pending ? `${date} (onay bekliyor)` : date;
    likeBtn.classList.toggle("hidden", pending);
    paintLike({ liked, count: wish.like_count || 0 });

    lastFocus = document.activeElement;
    root.removeAttribute("inert");
    root.classList.remove("opacity-0", "pointer-events-none");
    card.classList.remove("scale-95");
    card.classList.add("scale-100");
    $('button[aria-label="Kapat"]', card).focus();
  }

  function close() {
    if (!isOpen()) return;
    root.classList.add("opacity-0", "pointer-events-none");
    card.classList.remove("scale-100");
    card.classList.add("scale-95");
    root.setAttribute("inert", "");
    current = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  root.querySelectorAll("[data-close-modal]").forEach((b) => b.addEventListener("click", close));
  root.addEventListener("click", (e) => { if (e.target === root) close(); }); // dışarı tıkla
  likeBtn.addEventListener("click", () => { if (current) onLike(current); });
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") { // odak modal içinde kalsın
      const f = [...card.querySelectorAll("button:not(.hidden)")];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  return {
    open,
    close,
    currentId: () => (current ? current.id : null),
    // Beğeni durumunu/sayısını güncelle (yalnızca ilgili dilek açıksa)
    update(id, state) { if (current && current.id === id) paintLike(state); },
  };
}
