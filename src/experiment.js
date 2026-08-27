export const EXPERIMENT_KEY = "brand-my-fold-cta-variant-v1";
export const ANONYMOUS_KEY = "brand-my-fold-anonymous-v1";

export function pickVariant(search = "", stored = "") {
  const requested = new URLSearchParams(search).get("variant");
  if (requested === "a" || requested === "b") return requested;
  if (stored === "a" || stored === "b") return stored;
  return Math.random() < 0.5 ? "a" : "b";
}

export function ctaCopy(lang, variant) {
  if (lang === "zh") return variant === "b" ? "查看可竞拍位置" : "选择广告位";
  return variant === "b" ? "See available spots" : "Choose a spot";
}

export function anonymousId(stored = "") {
  if (/^[a-z0-9-]{12,80}$/i.test(stored)) return stored;
  return globalThis.crypto?.randomUUID?.() || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
