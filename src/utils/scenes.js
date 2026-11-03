export const WORDS_PER_SECOND = 2.5;
export const ANIMATIONS = ['zoom', 'pan', 'bounce', 'fade'];

export function countWords(text) {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

export function estimateDuration(text) {
  return Math.ceil(countWords(text) / WORDS_PER_SECOND);
}

export function splitSentences(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?۔؟।]+[.!?۔؟।]*/g) || [clean];
  return parts.map((s) => s.trim()).filter(Boolean);
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Splits a script into scenes (one per sentence) and spreads them over `duration` seconds. */
export function buildScenes(script, duration, characterCount) {
  const sentences = splitSentences(script);
  if (!sentences.length) return [];
  const weights = sentences.map((s) => Math.max(1, countWords(s)));
  const total = weights.reduce((a, b) => a + b, 0);
  const chars = Math.max(1, characterCount);
  let cursor = 0;
  return sentences.map((text, i) => {
    const length = (duration * weights[i]) / total;
    const start = cursor;
    cursor += length;
    const isLast = i === sentences.length - 1;
    return {
      id: i + 1,
      text,
      start: round2(start),
      end: round2(isLast ? duration : cursor),
      characterIndex: i % chars,
      animation: ANIMATIONS[i % ANIMATIONS.length],
    };
  });
}
