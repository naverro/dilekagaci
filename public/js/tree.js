// Ağaç üzerindeki kurdeleler. Her dilek, veritabanının atadığı sabit bir slota (bağlanma noktasına) asılır.
// Slotlar scripts/gen-anchors.js ile önceden hesaplandığı için kurdeleler asla üst üste binmez
// ve her cihazda aynı yerde görünür.
import { safeColor } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const SWAY = ["animate-sway-slow", "animate-sway-fast", "animate-sway-mid", "animate-sway-wide"];
const KNOT = {
  "#10b981": "#047857", "#0ea5e9": "#0369a1", "#ef4444": "#b91c1c", "#8b5cf6": "#6d28d9", "#f59e0b": "#b45309",
  "#ec4899": "#be185d", "#f8fafc": "#94a3b8", "#f97316": "#c2410c", "#06b6d4": "#0e7490",
};

function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

// Orijinal tasarımdaki kurdele gövdesi (swallowtail uçlu)
export function ribbonPath(x, y) {
  return `M${x - 3} ${y} C${x - 5} ${y + 30} ${x - 1} ${y + 55} ${x - 4} ${y + 85} L${x} ${y + 79} L${x + 4} ${y + 85} ` +
         `C${x + 1} ${y + 55} ${x + 5} ${y + 30} ${x + 3} ${y} Z`;
}

function buildRibbon(wish, { x, y }, animate) {
  const color = safeColor(wish.ribbon_color);
  const white = color === "#f8fafc";
  const slotG = el("g", { class: "ribbon-slot" + (animate ? " is-new" : ""), "data-id": wish.id });
  const g = el("g", {
    class: `ribbon ${SWAY[wish.slot % SWAY.length]}`,
    style: `transform-origin:${x}px ${y}px;animation-delay:${-((wish.slot * 7) % 23) / 10}s`,
    role: "button", tabindex: "0",
    "aria-label": `Dileği oku: ${wish.author_name || "Anonim"}`,
  });
  // Mobilde kolay dokunmak için görünmez geniş alan
  g.appendChild(el("rect", { x: x - 14, y: y - 6, width: 28, height: 96, fill: "transparent" }));
  g.appendChild(el("ellipse", { cx: x, cy: y, rx: 5, ry: 3.5, fill: KNOT[color] || "#334155" }));
  const body = el("path", { d: ribbonPath(x, y), fill: color, filter: "url(#ribbonShadow)" });
  if (white) { body.setAttribute("stroke", "#cbd5e1"); body.setAttribute("stroke-width", "0.8"); }
  g.appendChild(body);
  g.appendChild(el("circle", { cx: x, cy: y + 40, r: white ? 2.5 : 2.8, fill: white ? "#64748b" : "#ffffff", opacity: white ? 0.8 : 0.9 }));
  slotG.appendChild(g);
  return slotG;
}

export function createTree(layer, anchors, onSelect) {
  const nodes = new Map(); // dilek id -> { wish, node }

  function remove(id) {
    const entry = nodes.get(id);
    if (!entry) return;
    entry.node.remove();
    nodes.delete(id);
  }

  function upsert(wish, { animate = false } = {}) {
    const valid = wish && wish.status === "approved" && Number.isInteger(wish.slot) && wish.slot >= 0 && wish.slot < anchors.length;
    if (!valid) { if (wish) remove(wish.id); return; }

    const prev = nodes.get(wish.id);
    if (prev && prev.wish.slot === wish.slot && prev.wish.ribbon_color === wish.ribbon_color) {
      prev.wish = { ...prev.wish, ...wish }; // sadece veri güncelle (ör. beğeni sayısı)
      return;
    }
    for (const [id, e] of nodes) if (id !== wish.id && e.wish.slot === wish.slot) remove(id); // aynı slottaki eski kurdele düşer
    if (prev) remove(wish.id);

    const node = buildRibbon(wish, anchors[wish.slot], animate);
    const entry = { wish, node };
    const open = () => onSelect(entry.wish);
    node.addEventListener("click", open);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    layer.appendChild(node);
    nodes.set(wish.id, entry);
  }

  return {
    upsert,
    remove,
    has: (id) => nodes.has(id),
    get: (id) => (nodes.get(id) ? nodes.get(id).wish : null),
    patch(id, fields) { const e = nodes.get(id); if (e) e.wish = { ...e.wish, ...fields }; },
    size: () => nodes.size,
    // Listeyle tam eşitleme: eksikleri ekle, fazlaları kaldır
    syncAll(list) {
      const keep = new Set(list.map((w) => w.id));
      for (const id of [...nodes.keys()]) if (!keep.has(id)) remove(id);
      for (const w of list) upsert(w, { animate: false });
    },
  };
}
