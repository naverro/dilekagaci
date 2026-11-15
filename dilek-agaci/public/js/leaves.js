// Süzülen yapraklar (orijinal tasarımdaki atmosfer). Hareket azaltma tercihine ve küçük ekranlara saygı gösterir.
const LEAF = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.75C6.2 7.56 4.7 9.8 4 12c1.5-1.5 4-2.5 7-2.5 4 0 6 2 6 2z"/></svg>`;

export function initLeaves() {
  const container = document.getElementById("leafWind");
  if (!container || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = matchMedia("(max-width: 640px)").matches ? 7 : 12;
  for (let i = 0; i < count; i++) {
    const leaf = document.createElement("div");
    leaf.className = "falling-leaf text-nature-600";
    leaf.innerHTML = LEAF;
    leaf.style.left = `${Math.random() * 95}%`;
    leaf.style.animationDuration = `${8 + Math.random() * 7}s`;
    leaf.style.animationDelay = `${Math.random() * 6}s`;
    leaf.style.transform = `scale(${0.6 + Math.random() * 0.5})`;
    container.appendChild(leaf);
  }
}
