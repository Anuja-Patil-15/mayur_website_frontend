// Mirrors server/src/scoring.js so the form can preview results before saving.
const pct = (n, d) => (d > 0 ? (100 * n) / d : null);

export function computeScores({ a, b, c, d, e, total, timeMinutes }) {
  return {
    learningScore: (100 * (2 * a + 0.5 * b + d + 0.5 * e)) / (2 * total),
    conceptualClarity: pct(a, total),
    previouslyLearned: pct(a, a + b + c + e),
    retrievalReliability: pct(a, a + b),
    mcqsPerHour: timeMinutes > 0 ? (total * 60) / timeMinutes : null,
  };
}

export const fmtPct = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : Number(n).toFixed(1) + '%');
export const fmtNum = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : Number(n).toFixed(1));

export function adviceFor({ a, b, c, d, e, total }) {
  const tips = [];
  if (c) tips.push(`Conceptual errors (${c}): revisit the basic mechanism and explain it in your own words.`);
  if (b) tips.push(`Retrieval failures (${b}): practise closed-book active recall and spaced repetition.`);
  if (e) tips.push(`Confusion / decision failures (${e}): compare similar options and note the feature that tells them apart.`);
  if (d) tips.push(`New learning (${d}): study the explanation, then test yourself with a fresh question later.`);
  if (a === total) tips.push('All questions were marked conceptually correct. Make sure you could explain every answer without relying on recognition alone.');
  if (!tips.length) tips.push('Keep testing with fresh questions and revisit difficult concepts after a delay.');
  return tips;
}
