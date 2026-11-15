// Ziyaretçi kimliği: Supabase anonim oturumu (hesap gerekmez). Sadece dilek/beğeni anında açılır.
import { getCaptchaToken } from "./captcha.js";

export function createSession(sb) {
  let inflight = null;

  async function peek() {
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  async function ensure() {
    const existing = await peek();
    if (existing) return existing;
    if (!inflight) {
      inflight = (async () => {
        const captchaToken = await getCaptchaToken();
        const { data, error } = await sb.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : {});
        if (error) throw error;
        return data.session;
      })().finally(() => { inflight = null; });
    }
    return inflight;
  }

  return { peek, ensure };
}
