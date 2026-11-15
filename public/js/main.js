// Dilek Ağacı: uygulamanın giriş noktası. Veri yükleme, canlı güncelleme, beğeni, dilek gönderme.
import { createClient, isConfigured } from "./supabase-client.js";
import { createSession } from "./session.js";
import { createApi } from "./api.js";
import { ANCHORS } from "./anchors.js";
import { createTree } from "./tree.js";
import { createModal } from "./modal.js";
import { initForm } from "./form.js";
import { initLeaves } from "./leaves.js";
import { $, toast } from "./util.js";

initLeaves();

// ---------- bilgi şeridi (yükleme hatası / boş ağaç) ----------
const notice = $("#treeNotice");
const noticeText = $("#treeNoticeText");
const noticeRetry = $("#treeNoticeRetry");
let retryFn = null;
noticeRetry.addEventListener("click", () => retryFn && retryFn());
function showNotice(text, retry) {
  noticeText.textContent = text;
  retryFn = retry || null;
  noticeRetry.classList.toggle("hidden", !retry);
  notice.classList.remove("hidden");
}
const hideNotice = () => notice.classList.add("hidden");

// ---------- kurulum ----------
const sb = createClient();
const session = sb ? createSession(sb) : null;
const api = sb ? createApi(sb, session) : null;
const likedIds = new Set();
let likeBusy = false;

const tree = createTree($("#ribbonLayer"), ANCHORS, (wish) => openWish(wish));
const modal = createModal({ onLike: toggleLike });

function openWish(wish, opts = {}) {
  modal.open(wish, { liked: likedIds.has(wish.id), ...opts });
}

// ---------- sayaç ----------
const counterEl = $("#counterDisplay");
const setCount = (n) => { counterEl.textContent = Number(n).toLocaleString("tr-TR"); };
let countTimer;
function scheduleCount() {
  clearTimeout(countTimer);
  countTimer = setTimeout(() => api.fetchApprovedCount().then(setCount).catch(() => {}), 700);
}

// ---------- veri yükleme ----------
async function loadAll({ quiet = false } = {}) {
  try {
    const [list, count] = await Promise.all([api.fetchTreeWishes(), api.fetchApprovedCount()]);
    tree.syncAll(list);
    setCount(count);
    if (tree.size() === 0) showNotice("Henüz kurdele yok. İlk dileği sen as.");
    else hideNotice();
  } catch (err) {
    console.error(err);
    if (!quiet || tree.size() === 0) showNotice("Dilekler yüklenemedi.", () => loadAll());
  }
}

// ---------- canlı güncelleme (Supabase Realtime) ----------
let channel = null;
let retries = 0;
let retryTimer = null;

function onChange({ eventType, new: row, old }) {
  if (eventType === "DELETE") {
    tree.remove(old.id);
  } else if (row.status === "approved" && Number.isInteger(row.slot)) {
    tree.upsert(row, { animate: !tree.has(row.id) });
    modal.update(row.id, { liked: likedIds.has(row.id), count: row.like_count });
    hideNotice();
  } else {
    tree.remove(row.id);
  }
  scheduleCount();
}

function startRealtime() {
  const previous = channel;
  channel = null;
  if (previous) sb.removeChannel(previous);

  const ch = sb.channel("wishes-live").on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, onChange);
  channel = ch;
  ch.subscribe((state) => {
    if (channel !== ch) return; // eski kanalın olayları
    if (state === "SUBSCRIBED") {
      retries = 0;
      loadAll({ quiet: true }); // bağlantı koptuysa kaçan değişiklikleri telafi et
    } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(state)) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(startRealtime, Math.min(30000, 1000 * 2 ** retries++)); // üstel geri çekilme
    }
  });
}

// Reddedilen/gizlenen dilekler Realtime ile gelmeyebilir; düzenli olarak eşitle
setInterval(() => { if (sb && !document.hidden) loadAll({ quiet: true }); }, 90000);
document.addEventListener("visibilitychange", () => { if (sb && !document.hidden) loadAll({ quiet: true }); });
window.addEventListener("online", () => { if (sb) { startRealtime(); loadAll({ quiet: true }); } });

// ---------- beğeni ----------
async function toggleLike(wish) {
  if (likeBusy || !api) return;
  likeBusy = true;
  const want = !likedIds.has(wish.id);
  const base = (tree.get(wish.id) || wish).like_count || 0;
  want ? likedIds.add(wish.id) : likedIds.delete(wish.id);
  modal.update(wish.id, { liked: want, count: Math.max(0, base + (want ? 1 : -1)) });
  try {
    const fresh = await api.setLike(wish.id, want);
    if (fresh) {
      tree.patch(wish.id, { like_count: fresh.like_count });
      modal.update(wish.id, { liked: want, count: fresh.like_count });
    }
  } catch (err) {
    console.error(err);
    want ? likedIds.delete(wish.id) : likedIds.add(wish.id);
    modal.update(wish.id, { liked: !want, count: base });
    toast("Beğeni kaydedilemedi. Biraz sonra tekrar dene.", "error");
  } finally {
    likeBusy = false;
  }
}

// ---------- benim dileğim ----------
const MINE_KEY = "dilek:mine";
const myAlert = $("#myWishAlert");
const myAlertText = $("#myWishAlertText");
const readMine = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY)); } catch { return null; } };
const saveMine = (m) => { try { localStorage.setItem(MINE_KEY, JSON.stringify(m)); } catch { /* özel mod */ } };

function paintMine(mine) {
  if (!mine) return;
  myAlertText.textContent = mine.status === "approved" ? "Dileğiniz dala asıldı" : "Dileğiniz incelemede, onaylanınca asılacak";
  myAlert.classList.remove("hidden");
}

$("#openMyWishBtn").addEventListener("click", () => {
  const mine = readMine();
  if (!mine) return;
  const live = tree.get(mine.id);
  openWish(live || { ...mine, like_count: 0 }, { pending: mine.status !== "approved" });
});

async function refreshMine() {
  const mine = readMine();
  if (!mine) return;
  if (mine.status !== "approved") {
    try {
      const w = await api.fetchWish(mine.id); // onaylandıysa artık okunabilir
      if (w && w.status === "approved") { mine.status = "approved"; saveMine(mine); }
    } catch { /* sessizce geç */ }
  }
  paintMine(mine);
}

// ---------- dilek gönderme ----------
initForm({
  async onSubmit({ author, text, color }) {
    if (!api) throw new Error("not_configured");
    const result = await api.submitWish({ author, text, color });
    const mine = { id: result.id, wish_text: text, author_name: author || null, ribbon_color: color, created_at: result.created_at, status: result.status };
    saveMine(mine);
    paintMine(mine);
    if (result.status === "approved") {
      const w = await api.fetchWish(result.id).catch(() => null); // Realtime gecikse bile kurdele hemen görünsün
      if (w) { tree.upsert(w, { animate: true }); hideNotice(); }
      toast("Dileğin ağacın dalına asıldı.");
    } else {
      toast("Dileğin alındı. Onaylanınca ağaçta görünecek.");
    }
    scheduleCount();
    return result;
  },
});

// ---------- başlat ----------
if (!isConfigured) {
  showNotice("Site henüz yapılandırılmamış: Supabase ayarları (.env) eksik.");
} else {
  loadAll();
  startRealtime();
  api.fetchMyLikes().then((s) => s.forEach((id) => likedIds.add(id))).catch(() => {});
  refreshMine();
}

window.__DILEK_BOOT__ = true; // index.html teşhis uyarısı için
