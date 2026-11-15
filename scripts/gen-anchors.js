// Kurdele bağlanma noktalarını (slot) üretir. Deterministik: aynı seed her zaman aynı sonucu verir.
// Çalıştır: node scripts/gen-anchors.js  -> public/js/anchors.js dosyasını yazar.
const fs = require("fs");
const path = require("path");

// ağacın "derin yaprak" katmanındaki elipsler (index.html içindeki #canopyDeepLayer ile aynı)
const CANOPY = [
  [500, 180, 200, 120], [320, 240, 160, 110], [680, 240, 160, 110],
  [190, 330, 135, 95], [810, 330, 135, 95], [270, 390, 120, 85], [730, 390, 120, 85],
  [410, 140, 105, 105], [590, 140, 105, 105],
];
const SHRINK = 0.86;           // düğüm yaprakların içinde kalsın
const Y_MIN = 112, Y_MAX = 462; // kurdele boyu ~98: kuyruk 600'ü aşmasın
const MIN_DX = 26;             // dikey olarak çakışan kurdelelerin yatay mesafesi (dokunma alanı)
const MIN_DY = 100;            // bu kadar dikey boşluk varsa aynı hizada olabilirler
const MIN_DIST = 34;           // genel minimum mesafe

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const inside = (x, y) =>
  y >= Y_MIN && y <= Y_MAX &&
  CANOPY.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * SHRINK)) ** 2 + ((y - cy) / (ry * SHRINK)) ** 2 <= 1);
const clash = (a, b) => {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return (dx < MIN_DX && dy < MIN_DY) || Math.hypot(dx, dy) < MIN_DIST;
};

function generate(seed = 20241115, tries = 60000) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < tries; i++) {
    const p = { x: Math.round(70 + rnd() * 860), y: Math.round(Y_MIN + rnd() * (Y_MAX - Y_MIN)) };
    if (!inside(p.x, p.y)) continue;
    if (pts.some((q) => clash(p, q))) continue;
    pts.push(p);
  }
  // sırayı karıştır: ilk dilekler ağacın bir köşesinde toplanmasın
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

function best(n = 300) {
  let top = null;
  for (let seed = 1; seed <= n; seed++) {
    const pts = generate(seed, 25000);
    if (!top || pts.length > top.length) top = pts;
  }
  return top;
}

if (require.main === module) {
  const pts = best();
  const out =
    "// Otomatik üretildi: scripts/gen-anchors.js (elle düzenleme)\n" +
    "// Her slot, ağaçtaki sabit bir kurdele bağlama noktasıdır. Veritabanı slot numarasını atar.\n" +
    "export const ANCHORS = " + JSON.stringify(pts) + ";\n";
  fs.writeFileSync(path.join(__dirname, "..", "public", "js", "anchors.js"), out);
  console.log("slot sayısı:", pts.length);
}
module.exports = { generate, best, inside, clash };
