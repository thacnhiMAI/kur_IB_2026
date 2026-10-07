import type { RecommendationContext } from "@/lib/recommendations/types";

export type NeuralBook = {
  id: string; title: string; description?: string; authors: string[]; genres: string[];
  ratingAverage: number | null; ratingsCount: number | null;
};
type ProfileBook = { title: string; description?: string; authors?: string[]; genres?: string[] };
const DIM = 64, HIDDEN = 12;
const stopWords = new Set("и в на с по за от до для о the a an of to and in is это как что не книга book очень really мне мне этой this that with about".split(" "));
function hash(text: string) { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
function tokens(text: string) { return (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((t) => !stopWords.has(t)).slice(0, 160); }
function vector(book: ProfileBook): number[] {
  const v = Array<number>(DIM).fill(0);
  const add = (key: string, weight: number) => { const h = hash(key); v[h % DIM] += weight; };
  for (const genre of book.genres ?? []) add(`g:${genre.toLowerCase()}`, 4);
  for (const author of book.authors ?? []) add(`a:${author.toLowerCase()}`, 5);
  for (const word of new Set(tokens(book.title))) add(`t:${word}`, 1.2);
  for (const word of new Set(tokens(book.description ?? ""))) add(`t:${word}`, .35);
  const norm = Math.hypot(...v) || 1;
  return v.map((n) => n / norm);
}
function dot(a: number[], b: number[]) { return a.reduce((s, x, i) => s + x * b[i], 0); }
function sigmoid(x: number) { return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x)))); }

/** CPU-only personalized content MLP. The weights are trained, not random scores.
 * Explicit ratings override implicit interactions. Unknown books are weak sampled
 * negatives, not asserted dislikes. Hybrid content scoring handles sparse data.
 */
export function rankPersonalizedBooks(context: RecommendationContext, books: NeuralBook[]) {
  const byId = new Map(books.map((b) => [b.id, b]));
  const signals = new Map<string, { book: ProfileBook; target: number; weight: number }>();
  const set = (id: string, book: ProfileBook, target: number, weight: number) => {
    const previous = signals.get(id);
    if (!previous || weight >= previous.weight) signals.set(id, { book: { ...byId.get(id), ...book }, target, weight });
  };
  // Aggregate repeats by book instead of letting refreshes/page opens dominate.
  for (const s of context.readingSignals) set(s.bookId, s, s.eventType === "VIEWED" ? .62 : s.eventType === "INTERESTED" ? .8 : .88, s.eventType === "VIEWED" ? .6 : 1.5);
  for (const s of context.readingProgress ?? []) set(s.bookId, s, s.completedAt ? .9 : .85, 2 + Math.min(100, s.progressPercent) / 100);
  for (const s of context.favoriteBooks) set(s.bookId, s, .98, 4);
  for (const s of context.reviewedBooks) set(s.bookId, { ...s, description: `${byId.get(s.bookId)?.description ?? ""} ${s.content}` }, (Math.max(1, Math.min(5, s.rating)) - 1) / 4, 6);

  const preference = Array<number>(DIM).fill(0);
  const likedGenres = new Set<string>(), likedAuthors = new Set<string>();
  const dislikedGenres = new Set<string>(), dislikedAuthors = new Set<string>();
  const allTraining = [...signals.values()].map((s) => {
    const v = vector(s.book); const strength = (s.target - .5) * 2 * s.weight;
    v.forEach((n, i) => { preference[i] += n * strength; });
    if (s.target >= .6) { for (const g of s.book.genres ?? []) likedGenres.add(g); for (const a of s.book.authors ?? []) likedAuthors.add(a); }
    if (s.target <= .25) { for (const g of s.book.genres ?? []) dislikedGenres.add(g); for (const a of s.book.authors ?? []) dislikedAuthors.add(a); }
    return { v, target: s.target, weight: s.weight };
  });
  const training = [...allTraining].sort((a, b) => b.weight - a.weight).slice(0, 256);
  const norm = Math.hypot(...preference) || 1;
  preference.forEach((n, i) => { preference[i] = n / norm; });
  const features = (v: number[]) => [...v, ...v.map((x, i) => x * preference[i]), dot(v, preference), 1];
  const input = DIM * 2 + 2;
  // Seeded initialization and sample selection make repeated refresh reproducible.
  let seed = hash(context.userId) || 1;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const w = Array.from({ length: HIDDEN }, () => Array.from({ length: input }, () => (random() - .5) * .2));
  const out = Array.from({ length: HIDDEN }, () => (random() - .5) * .2);
  let bias = 0;
  const unknown = books.filter((b) => !signals.has(b.id)).sort((a, b) => hash(a.id) - hash(b.id)).slice(0, Math.min(training.length * 2, 128));
  const samples = [...training, ...unknown.map((b) => ({ v: vector(b), target: .15, weight: .25 }))].map((s) => ({ ...s, x: features(s.v) }));
  const hasPersonalSignals = signals.size > 0;
  const useNeural = training.length >= 3;
  if (useNeural) {
    for (let epoch = 0; epoch < 45; epoch++) {
      const rate = .045 / (1 + epoch / 30);
      for (const s of samples) {
        const hidden = w.map((row) => Math.tanh(dot(row, s.x)));
        const prediction = sigmoid(dot(out, hidden) + bias);
        const error = (prediction - s.target) * Math.min(s.weight, 4);
        const oldOut = [...out];
        out.forEach((n, j) => { out[j] -= rate * (error * hidden[j] + .002 * n); });
        bias -= rate * error;
        w.forEach((row, j) => { const delta = error * oldOut[j] * (1 - hidden[j] ** 2); row.forEach((n, k) => { row[k] -= rate * (delta * s.x[k] + .002 * n); }); });
      }
    }
  }
  const excluded = new Set(context.excludedBookIds);
  const scored = books.filter((b) => !excluded.has(b.id)).map((book) => {
    const v = vector(book); const content = dot(v, preference);
    const positiveMatch = book.genres.some((g) => likedGenres.has(g)) || book.authors.some((a) => likedAuthors.has(a));
    const negativeOnly = !positiveMatch && (book.genres.some((g) => dislikedGenres.has(g)) || book.authors.some((a) => dislikedAuthors.has(a)));
    const prediction = useNeural ? sigmoid(dot(out, w.map((row) => Math.tanh(dot(row, features(v))))) + bias) : .5;
    const relevance = .7 * Math.max(-1, content) + .3 * (prediction - .5) * 2;
    return { ...book, personalScore: Math.round(Math.max(0, Math.min(1, (relevance + 1) / 2)) * 1000) / 10, relevant: !hasPersonalSignals || (!negativeOnly && (positiveMatch || content >= .16)) };
  });
  return scored.filter((b) => b.relevant).sort((a, b) =>
    (b.ratingAverage ?? -1) - (a.ratingAverage ?? -1) || b.personalScore - a.personalScore ||
    (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0) || a.id.localeCompare(b.id));
}
