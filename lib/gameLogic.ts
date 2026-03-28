import { getCombination } from './combinations';
import { neuralCombine } from './neuralCombiner';

export interface CombineResult {
  result: string;
  emoji: string;
  isNew: boolean;
  source: 'database' | 'neural';
}

export async function combine(
  a: string,
  b: string,
  discovered: string[],
  onProgress?: (msg: string) => void
): Promise<CombineResult> {
  // 1. Check pre-computed database first
  const db = getCombination(a, b);
  if (db) {
    return {
      result: db.result,
      emoji: db.emoji,
      isNew: !discovered.includes(db.result),
      source: 'database',
    };
  }

  // 2. Same element combined with itself — just return it
  if (a.toLowerCase() === b.toLowerCase()) {
    return { result: a, emoji: '✨', isNew: false, source: 'database' };
  }

  // 3. Neural network fallback
  onProgress?.('Thinking...');
  const neural = await neuralCombine(a, b, onProgress);
  return {
    result: neural.result,
    emoji: neural.emoji,
    isNew: !discovered.includes(neural.result),
    source: 'neural',
  };
}
