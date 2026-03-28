import type { Element } from './combinations';
import { VOCABULARY, getVocabEmoji } from './vocabulary';

let model: any = null;
let vocabEmbeddings: Map<string, number[]> | null = null;
let loadingModel = false;
let modelLoadCallbacks: Array<() => void> = [];

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function getEmbedding(text: string): Promise<number[]> {
  const embeddings = await model.embed([text]);
  const data = await embeddings.array();
  embeddings.dispose();
  return data[0] as number[];
}

async function ensureModel(): Promise<void> {
  if (model) return;
  if (loadingModel) {
    return new Promise(resolve => modelLoadCallbacks.push(resolve));
  }
  loadingModel = true;
  const tf = await import('@tensorflow/tfjs');
  await tf.ready();
  const use = await import('@tensorflow-models/universal-sentence-encoder');
  model = await use.load();
  loadingModel = false;
  modelLoadCallbacks.forEach(cb => cb());
  modelLoadCallbacks = [];
}

async function ensureVocabEmbeddings(): Promise<void> {
  if (vocabEmbeddings) return;
  vocabEmbeddings = new Map();
  // Batch encode vocabulary
  const words = VOCABULARY.map(v => v.word);
  const batchSize = 20;
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const embeddings = await model.embed(batch);
    const data = await embeddings.array();
    embeddings.dispose();
    batch.forEach((word, idx) => {
      vocabEmbeddings!.set(word, data[idx]);
    });
  }
}

export async function neuralCombine(
  a: string,
  b: string,
  onProgress?: (msg: string) => void
): Promise<{ result: string; emoji: string }> {
  onProgress?.('Loading neural network...');
  await ensureModel();
  onProgress?.('Encoding vocabulary...');
  await ensureVocabEmbeddings();
  onProgress?.('Computing combination...');

  const [embA, embB] = await Promise.all([
    getEmbedding(a),
    getEmbedding(b),
  ]);

  // Average embeddings to represent the combination
  const combined = embA.map((v, i) => (v + embB[i]) / 2);

  // Find nearest vocabulary word
  let best = '';
  let bestScore = -Infinity;
  for (const [word, emb] of vocabEmbeddings!) {
    // Skip if result equals one of the inputs
    if (word.toLowerCase() === a.toLowerCase() || word.toLowerCase() === b.toLowerCase()) continue;
    const score = cosineSimilarity(combined, emb);
    if (score > bestScore) {
      bestScore = score;
      best = word;
    }
  }

  return { result: best || 'Mystery', emoji: getVocabEmoji(best) || '✨' };
}

export function isModelLoaded(): boolean {
  return model !== null;
}
