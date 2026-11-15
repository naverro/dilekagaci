// Veri erişimi. Tüm yazma işlemleri sunucu tarafı kurallardan (RPC + RLS) geçer.
const COLS = "id,author_name,wish_text,ribbon_color,created_at,like_count,status,slot";

export function createApi(sb, session) {
  return {
    async fetchTreeWishes() {
      const { data, error } = await sb.from("wishes").select(COLS)
        .eq("status", "approved").not("slot", "is", null)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    async fetchApprovedCount() {
      const { count, error } = await sb.from("wishes").select("id", { count: "exact", head: true }).eq("status", "approved");
      if (error) throw error;
      return count ?? 0;
    },
    async fetchWish(id) {
      const { data, error } = await sb.from("wishes").select(COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data; // onaylı değilse RLS yüzünden null döner
    },
    async submitWish({ author, text, color }) {
      await session.ensure();
      const { data, error } = await sb.rpc("submit_wish", { p_author: author || null, p_text: text, p_color: color });
      if (error) throw error;
      return data; // { id, status, created_at }
    },
    async fetchMyLikes() {
      if (!(await session.peek())) return new Set();
      const { data, error } = await sb.from("wish_likes").select("wish_id");
      if (error) throw error;
      return new Set(data.map((r) => r.wish_id));
    },
    async setLike(wishId, like) {
      const { user } = await session.ensure();
      if (like) {
        const { error } = await sb.from("wish_likes").insert({ wish_id: wishId, user_id: user.id });
        if (error && error.code !== "23505") throw error; // 23505: zaten beğenilmiş
      } else {
        const { error } = await sb.from("wish_likes").delete().eq("wish_id", wishId).eq("user_id", user.id);
        if (error) throw error;
      }
      return this.fetchWish(wishId); // gerçek beğeni sayısı
    },
  };
}
