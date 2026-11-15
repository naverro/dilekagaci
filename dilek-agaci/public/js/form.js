// Dilek formu: kurdele rengi, karakter sayacı, yükleniyor durumu, hata mesajları.
import { $, friendlyError } from "./util.js";

const MAX = 200;

export function initForm({ onSubmit }) {
  const form = $("#wishForm");
  const wishInput = $("#wishInput");
  const authorInput = $("#authorInput");
  const charCount = $("#charCount");
  const btn = $("#hangButton");
  const status = $("#formStatus");
  const original = btn.innerHTML;
  let color = "#10b981";
  let busy = false;

  wishInput.addEventListener("input", () => { charCount.textContent = `${wishInput.value.length}/${MAX}`; });

  // Renk seçici (orijinal görsel davranış)
  $("#colorPickerList").addEventListener("click", (e) => {
    const dot = e.target.closest(".color-dot");
    if (!dot) return;
    color = dot.dataset.color;
    document.querySelectorAll(".color-dot").forEach((d) => {
      d.classList.remove("ring-2", "ring-offset-2", "scale-110");
      d.style.boxShadow = "";
      const c = d.querySelector(".check-icon");
      if (c) c.classList.add("hidden");
    });
    dot.classList.add("ring-2", "ring-offset-2", "scale-110");
    dot.style.setProperty("--tw-ring-color", color);
    const check = dot.querySelector(".check-icon");
    if (check) check.classList.remove("hidden");
  });

  function showError(message) {
    status.textContent = message;
    status.className = "mt-2 text-xs rounded-lg px-3 py-2 bg-rose-50 text-rose-800 border border-rose-200";
  }
  function clearStatus() { status.className = "hidden"; status.textContent = ""; }

  function setBusy(on) {
    busy = on;
    btn.disabled = on;
    btn.classList.toggle("opacity-70", on);
    btn.classList.toggle("cursor-wait", on);
    btn.innerHTML = on
      ? `<span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span><span>Asılıyor…</span>`
      : original;
  }

  function flash(label) {
    btn.innerHTML = `<span>✓ ${label}</span>`;
    btn.classList.add("bg-emerald-700");
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove("bg-emerald-700"); }, 2200);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const text = wishInput.value.trim();
    const author = authorInput.value.trim();
    if (!text) return showError("Önce dileğini yaz.");
    if (text.length > MAX) return showError(`Dilek en fazla ${MAX} karakter olabilir.`);
    clearStatus();
    setBusy(true);
    try {
      const result = await onSubmit({ author, text, color });
      wishInput.value = "";
      authorInput.value = "";
      charCount.textContent = `0/${MAX}`;
      setBusy(false);
      flash(result && result.status === "approved" ? "Ağaca Asıldı" : "Dilek Alındı");
    } catch (err) {
      console.error(err);
      setBusy(false);
      showError(friendlyError(err));
    }
  });
}
