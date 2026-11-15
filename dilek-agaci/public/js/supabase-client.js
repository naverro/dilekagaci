// Supabase istemcisi. URL ve anon anahtarı build sırasında ortam değişkenlerinden gelir (public/config.js).
// Anon anahtarı herkese açıktır; veriyi RLS politikaları korur. service_role anahtarı ASLA burada olmamalı.
export const config = window.__DILEK_CONFIG__ || {};
export const isConfigured =
  Boolean(config.supabaseUrl && config.supabaseAnonKey) && !/YOUR_/.test(config.supabaseUrl) && Boolean(window.supabase);

export function createClient(storageKey = "dilek-auth") {
  if (!isConfigured) return null;
  return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey },
  });
}
