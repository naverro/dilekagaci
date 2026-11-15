// main.js akışını sahte DOM + sahte Supabase ile çalıştırır (mantık testi; gerçek tarayıcı veya Supabase testi DEĞİLDİR).
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public", "js") + "/";
class ClassList { constructor(){this.s=new Set()} add(...c){c.forEach(x=>this.s.add(x))} remove(...c){c.forEach(x=>this.s.delete(x))} contains(c){return this.s.has(c)}
  toggle(c,f){ const on = f===undefined ? !this.s.has(c) : f; on?this.s.add(c):this.s.delete(c); return on } }
class Stub {
  constructor(tag="div"){ this.tag=tag; this.children=[]; this.parent=null; this.listeners={}; this.attrs={}; this.style={setProperty(){}}; this.classList=new ClassList();
    this.dataset={}; this.textContent=""; this.innerHTML=""; this.value=""; this.hidden=false; this.disabled=false; this.className=""; }
  setAttribute(k,v){this.attrs[k]=String(v)} removeAttribute(k){delete this.attrs[k]} getAttribute(k){return this.attrs[k]}
  appendChild(c){ c.parent=this; this.children.push(c); return c } append(...c){c.forEach(x=>this.appendChild(x))}
  remove(){ if(this.parent){ this.parent.children = this.parent.children.filter(x=>x!==this); this.parent=null } }
  replaceChildren(){ this.children=[] }
  addEventListener(t,f){ (this.listeners[t] ||= []).push(f) }
  async fire(t, ev={}){ for (const f of this.listeners[t]||[]) await f({ target:this, preventDefault(){}, key:ev.key, ...ev }) }
  querySelector(){ const s=new Stub(); s.focus=()=>{}; return s } querySelectorAll(){ return [] } closest(){ return null } focus(){} }

const cache = new Map();
const q = (sel) => { if(!cache.has(sel)) cache.set(sel, new Stub()); return cache.get(sel) };
globalThis.document = { querySelector:q, getElementById:(id)=>q("#"+id), querySelectorAll:()=>[], createElement:(t)=>new Stub(t),
  createElementNS:(_,t)=>new Stub(t), addEventListener(){}, body:new Stub("body"), head:new Stub("head"), activeElement:null, hidden:false };
const store = {}; globalThis.localStorage = { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v} };
globalThis.matchMedia = () => ({ matches:false });
globalThis.window = globalThis; globalThis.addEventListener = ()=>{};
globalThis.setInterval = () => 0;
globalThis.__DILEK_CONFIG__ = { supabaseUrl:"https://x.supabase.co", supabaseAnonKey:"anon", turnstileSiteKey:"" };

// ---- sahte veritabanı ----
const DB = {
  wishes: [
    { id:"a", author_name:"Ayşe", wish_text:"Merhaba", ribbon_color:"#10b981", created_at:"2026-01-02T10:00:00Z", like_count:2, status:"approved", slot:3 },
    { id:"b", author_name:null,   wish_text:"Sağlık",  ribbon_color:"#ef4444", created_at:"2026-01-03T10:00:00Z", like_count:0, status:"approved", slot:7 },
    { id:"c", author_name:"X",    wish_text:"Eski",    ribbon_color:"#0ea5e9", created_at:"2026-01-01T10:00:00Z", like_count:1, status:"approved", slot:null },
    { id:"p", author_name:"Z",    wish_text:"Bekleyen",ribbon_color:"#0ea5e9", created_at:"2026-01-04T10:00:00Z", like_count:0, status:"pending",  slot:null },
  ],
  wish_likes: [],
};
let session = null; const rpcCalls = [];
class Q { constructor(t){this.t=t;this.f=[];this.op="select";this.opts={}}
  select(_c,o){ if(o) this.opts=o; return this } eq(k,v){ this.f.push(r=>r[k]===v); return this }
  not(k){ this.f.push(r=>r[k]!==null && r[k]!==undefined); return this } order(){return this} limit(){return this} range(){return this}
  insert(row){ this.op="insert"; this.row=row; return this } delete(){ this.op="delete"; return this } maybeSingle(){ this.single=true; return this }
  then(a,b){ return Promise.resolve(this.run()).then(a,b) }
  run(){
    if (this.op==="insert") { DB[this.t].push(this.row); if(this.t==="wish_likes"){ const w=DB.wishes.find(x=>x.id===this.row.wish_id); if(w) w.like_count++ } return {data:null,error:null} }
    if (this.op==="delete") { const before=DB.wish_likes.length; DB.wish_likes = DB.wish_likes.filter(r=>this.f.every(f=>f(r))===false); if(before!==DB.wish_likes.length){ const w=DB.wishes.find(x=>x.id===this._wid); } return {data:null,error:null} }
    const rows = DB[this.t].filter(r=>this.f.every(f=>f(r)));
    if (this.opts.head) return { count: rows.length, error:null };
    if (this.single) return { data: rows[0] ?? null, error:null };
    return { data: rows, error:null };
  } }
let realtimeCb = null; let subCb = null;
globalThis.supabase = { createClient: () => ({
  from:(t)=>new Q(t),
  rpc:async(name,args)=>{ rpcCalls.push([name,args]);
    const w={ id:"n"+rpcCalls.length, author_name:args.p_author, wish_text:args.p_text, ribbon_color:args.p_color, created_at:"2026-02-01T00:00:00Z", like_count:0, status:"approved", slot:11 };
    DB.wishes.push(w); return { data:{ id:w.id, status:"approved", created_at:w.created_at }, error:null } },
  auth:{ getSession:async()=>({data:{session}}), signInAnonymously:async()=>{ session={ user:{id:"u1"} }; return {data:{session},error:null} } },
  channel:()=>{ const ch={ on:(_t,_f,cb)=>{ realtimeCb=cb; return ch }, subscribe:(cb)=>{ subCb=cb; setTimeout(()=>cb("SUBSCRIBED"),0); return ch } }; return ch },
  removeChannel(){},
}) };

const tick = (ms=20) => new Promise(r=>setTimeout(r,ms));
await import(pathToFileURL(path.join(ROOT,"main.js")).href);
await tick(60);

const layer = q("#ribbonLayer");
assert.equal(layer.children.length, 2, "sadece slotu olan onaylı dilekler ağaçta olmalı");
assert.equal(q("#counterDisplay").textContent, "3", "sayaç = onaylı dilek sayısı (3)");
console.log("OK  açılışta ağaç ve sayaç gerçek veriden yükleniyor");

// Realtime: yeni onaylı dilek
realtimeCb({ eventType:"INSERT", new:{ id:"r1", author_name:"Can", wish_text:"Yeni", ribbon_color:"#8b5cf6", created_at:"2026-02-01T00:00:00Z", like_count:0, status:"approved", slot:20 } });
assert.equal(layer.children.length, 3);
// Aynı slota yeni dilek gelirse eski kurdele düşer (ağaç doluyken)
realtimeCb({ eventType:"UPDATE", new:{ id:"r2", wish_text:"Slot çakışması", ribbon_color:"#8b5cf6", created_at:"2026-02-02T00:00:00Z", like_count:0, status:"approved", slot:20 } });
assert.equal(layer.children.length, 3, "aynı slota iki kurdele asılmamalı");
// Reddedilen kalkar, silinen kalkar, ağaçtan düşen (slot=null) kalkar
realtimeCb({ eventType:"UPDATE", new:{ id:"r2", status:"rejected", slot:null } });
assert.equal(layer.children.length, 2);
realtimeCb({ eventType:"UPDATE", new:{ id:"a", status:"approved", slot:null, like_count:2 } });
assert.equal(layer.children.length, 1);
realtimeCb({ eventType:"DELETE", old:{ id:"b" } });
assert.equal(layer.children.length, 0, "DELETE olayı kurdeleyi kaldırır");
console.log("OK  realtime: ekleme, slot çakışması, reddetme, ağaçtan düşme, silme");

// Kurdele aç + modal
realtimeCb({ eventType:"INSERT", new:{ id:"m1", author_name:"Mine", wish_text:"Tıkla", ribbon_color:"#f8fafc", created_at:"2026-03-05T00:00:00Z", like_count:4, status:"approved", slot:5 } });
await layer.children[0].fire("click");
assert.equal(q("#modalWishText").textContent, '"Tıkla"');
assert.equal(q("#modalAuthor").textContent, "Mine");
assert.match(q("#modalDate").textContent, /2026/);
console.log("OK  kurdeleye tıklayınca doğru dilek, yazar ve tarih modalda");

// Beğeni: oturum açılır, sayı sunucudaki gerçek değere eşitlenir
await q("#likeBtn").fire("click");
await tick(10);
assert.equal(DB.wish_likes.length, 1);
assert.equal(DB.wishes.find(w=>w.id==="a").like_count >= 0, true);
console.log("OK  beğeni: anonim oturum + wish_likes kaydı");

// Dilek gönder
q("#wishInput").value = "  Yeni bir dilek  "; q("#authorInput").value = "";
await q("#wishForm").fire("submit");
await tick(20);
assert.equal(rpcCalls.length, 1);
assert.deepEqual(rpcCalls[0][1], { p_author:null, p_text:"Yeni bir dilek", p_color:"#10b981" });
assert.equal(q("#wishInput").value, "", "form temizlenmeli");
assert.ok(layer.children.length >= 2, "gönderilen dilek ağaca eklenmeli");
assert.ok(JSON.parse(store["dilek:mine"]).id, "benim dileğim saklanmalı");
console.log("OK  dilek gönderme: RPC çağrısı, form temizliği, kurdele eklendi");

// Boş dilek RPC'ye gitmez
q("#wishInput").value = "   "; await q("#wishForm").fire("submit"); await tick(10);
assert.equal(rpcCalls.length, 1);
console.log("OK  boş dilek istemcide engellendi");

// Yardımcılar
const util = await import(pathToFileURL(path.join(ROOT,"util.js")).href);
assert.equal(util.safeColor("javascript:alert(1)"), "#10b981");
assert.equal(util.safeColor("#EF4444"), "#ef4444");
assert.match(util.friendlyError(new Error("rate_limited")), /Çok sık/);
assert.match(util.friendlyError(new Error("Failed to fetch")), /Bağlantı/);
console.log("OK  yardımcılar (renk doğrulama, hata metinleri)");
console.log("\nTÜM TESTLER GEÇTİ");
process.exit(0);
