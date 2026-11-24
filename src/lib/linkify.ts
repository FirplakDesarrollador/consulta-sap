/** Enlaces en texto libre: solo http/https (nunca javascript:, data:, etc.) */

export type TextPart = { type: 'text'; text: string } | { type: 'link'; text: string; href: string };

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?)\]}»]+$/;

/** Devuelve la URL normalizada si `value` es un http/https válido; si no, null */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** Divide un texto en trozos de texto y enlaces http/https (quita puntuación final pegada a la URL) */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let raw = m[0];
    const trail = TRAILING.exec(raw);
    if (trail) raw = raw.slice(0, raw.length - trail[0].length);
    const href = safeHttpUrl(raw);
    if (!href) continue;
    if (start > last) parts.push({ type: 'text', text: text.slice(last, start) });
    parts.push({ type: 'link', text: raw, href });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', text }];
}
