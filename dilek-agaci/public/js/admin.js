// Yönetici paneli. Yetki kontrolü SUNUCUDA yapılır: RLS + is_admin(). Bu dosya sadece arayüzdür.
import { createClient, isConfigured } from "./supabase-client.js";
import { getCaptchaToken } from "./captcha.js";
import { $, formatDate, safeColor } from "./util.js";

const PAGE = 20;
const sb = createClient("dilek-admin-auth"); // ziyaretçi oturumundan ayrı saklanır
let status = "pending";
let loaded = 0;

const views = { login: $("#loginView"), dash: $("#dashView") };
const show = (name) => {
  views.login.classList.toggle("hidden", name !== "login");
  views.dash.classList.toggle("hidden", name !== "dash");
  $("#logoutBtn").classList.toggle("hidden", name !== "dash");
};
const say = (el, msg) => { el.textContent = msg || ""; el.classList.toggle("hidden", !msg); };

async function isAdmin() {
  const { data, error } = await sb.rpc("is_admin");
  return !error && data === true;
}

// ---------- giriş / çıkış ----------
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  say($("#loginError"), "");
  btn.disabled = true;
  btn.textContent = "Giriş yapılıyor…";
  try {
    const captchaToken = await getCaptchaToken();
    const { error } = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) throw error;
    if (!(await isAdmin())) {
      await sb.auth.signOut();
      throw new Error("not_admin");
    }
    $("#password").value = "";
    await enterDashboard();
  } catch (err) {
    const m = String(err.message || "");
    say($("#loginError"),
      m === "not_admin" ? "Bu hesabın yönetici yetkisi yok." :
      /captcha/i.test(m) ? "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene." :
      /invalid login/i.test(m) ? "E-posta veya şifre hatalı." :
      "Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Giriş yap";
  }
});

$("#logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); $("#whoami").textContent = "Giriş gerekli"; show("login"); });

// ---------- panel ----------
async function enterDashboard() {
  const { data } = await sb.auth.getUser();
  $("#whoami").textContent = data.user ? data.user.email : "";
  show("dash");
  await Promise.all([refreshStats(), loadMode()]);
  await loadList(true);
}

async function refreshStats() {
  const { data, error } = await sb.rpc("admin_stats");
  if (error) return;
  document.querySelectorAll("[data-stat]").forEach((n) => { n.textContent = Number(data[n.dataset.stat] || 0).toLocaleString("tr-TR"); });
}

const MODE_HINT = {
  auto: "Yeni dilekler hemen ağaca asılır. Bağlantı veya yasaklı kelime içerenler onaya düşer.",
  manual: "Yeni dilekler sen onaylayana kadar ağaçta görünmez.",
};
async function loadMode() {
  const { data } = await sb.from("settings").select("moderation_mode").eq("id", 1).maybeSingle();
  if (data) { $("#modeSelect").value = data.moderation_mode; $("#modeHint").textContent = MODE_HINT[data.moderation_mode]; }
}
$("#modeSelect").addEventListener("change", async (e) => {
  const mode = e.target.value;
  const { error } = await sb.from("settings").update({ moderation_mode: mode }).eq("id", 1);
  if (error) { say($("#listError"), "Moderasyon ayarı kaydedilemedi."); await loadMode(); return; }
  $("#modeHint").textContent = MODE_HINT[mode];
});

function paintTabs() {
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.status === status;
    t.classList.toggle("bg-canopy", on); t.classList.toggle("text-canvas", on);
    t.classList.toggle("bg-mid", !on); t.classList.toggle("text-canopy", !on);
    t.setAttribute("aria-selected", String(on));
  });
}
$("#tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (t) { status = t.dataset.status; loadList(true); }
});
$("#refreshBtn").addEventListener("click", () => { refreshStats(); loadList(true); });
$("#moreBtn").addEventListener("click", () => loadList(false));

async function loadList(reset) {
  paintTabs();
  say($("#listError"), "");
  if (reset) { loaded = 0; $("#list").replaceChildren(); }
  const { data, error } = await sb.from("wishes")
    .select("id,author_name,wish_text,ribbon_color,created_at,like_count,status,slot")
    .eq("status", status).order("created_at", { ascending: false }).range(loaded, loaded + PAGE - 1);
  if (error) { say($("#listError"), "Dilekler yüklenemedi. Yetkini kontrol edip yenile."); return; }
  data.forEach((w) => $("#list").appendChild(card(w)));
  loaded += data.length;
  $("#empty").classList.toggle("hidden", loaded > 0);
  $("#moreBtn").classList.toggle("hidden", data.length < PAGE);
}

function button(label, cls, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = label;
  b.className = "h-9 px-4 rounded-xl text-sm font-semibold transition-colors " + cls;
  b.addEventListener("click", onClick);
  return b;
}

function card(w) {
  const li = document.createElement("li");
  li.className = "relative bg-mid border border-high rounded-2xl p-4 pl-5 shadow-rest overflow-hidden";
  const thread = document.createElement("span"); // kurdele ipi
  thread.className = "absolute left-0 top-0 bottom-0 w-1.5";
  thread.style.backgroundColor = safeColor(w.ribbon_color);
  li.appendChild(thread);

  const text = document.createElement("p");
  text.className = "font-serif italic text-lg text-deep break-words";
  text.textContent = `"${w.wish_text}"`;
  const meta = document.createElement("p");
  meta.className = "text-xs mt-1 text-bark";
  meta.textContent = `${w.author_name || "Anonim"}, ${formatDate(w.created_at)}, ${w.like_count} beğeni`;
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2 mt-3";
  li.append(text, meta, actions);

  const act = async (fn) => {
    actions.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const ok = await fn();
    if (!ok) { say($("#listError"), "İşlem yapılamadı. Yetkini kontrol edip tekrar dene."); actions.querySelectorAll("button").forEach((b) => (b.disabled = false)); return; }
    li.remove(); loaded = Math.max(0, loaded - 1);
    $("#empty").classList.toggle("hidden", $("#list").children.length > 0);
    refreshStats();
  };
  const setStatus = (s) => async () => {
    const { data, error } = await sb.from("wishes").update({ status: s }).eq("id", w.id).select("id");
    return !error && data && data.length === 1; // RLS izin vermezse 0 satır döner
  };

  if (w.status !== "approved") actions.appendChild(button("Onayla", "bg-canopy text-canvas hover:bg-deep", () => act(setStatus("approved"))));
  if (w.status !== "rejected") actions.appendChild(button(w.status === "approved" ? "Ağaçtan kaldır" : "Reddet", "bg-canvas border border-bark/20 text-canopy hover:bg-high", () => act(setStatus("rejected"))));
  actions.appendChild(button("Sil", "text-carmine hover:bg-red-50", () => {
    if (!confirm("Bu dilek kalıcı olarak silinecek. Emin misin?")) return;
    act(async () => { const { data, error } = await sb.from("wishes").delete().eq("id", w.id).select("id"); return !error && data && data.length === 1; });
  }));
  return li;
}

// ---------- başlat ----------
(async function boot() {
  if (!isConfigured || !sb) {
    show("login");
    say($("#loginError"), "Supabase ayarları eksik. .env dosyasını doldurup siteyi yeniden oluştur.");
    return;
  }
  const { data } = await sb.auth.getSession();
  if (data.session && !data.session.user.is_anonymous && (await isAdmin())) await enterDashboard();
  else show("login");
})();
