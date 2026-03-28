import { getCombination } from './combinations';
import { pickEmoji } from './emoji';

export interface CombineResult {
  result: string;
  emoji: string;
  isNew: boolean;
  source: 'database' | 'llama';
}

export async function combine(
  a: string,
  b: string,
  discovered: string[],
): Promise<CombineResult> {
  // 1. Pre-computed database (instant)
  const db = getCombination(a, b);
  if (db) {
    return {
      result: db.result,
      emoji: db.emoji,
      isNew: !discovered.includes(db.result),
      source: 'database',
    };
  }

  // 2. Same element
  if (a.toLowerCase() === b.toLowerCase()) {
    return { result: a, emoji: pickEmoji(a), isNew: false, source: 'database' };
  }

  // 3. Llama via Groq
  const res = await fetch('/api/combine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ element1: a, element2: b }),
  });

  const data = await res.json();
  const result: string = data.result ?? 'Mystery';

  return {
    result,
    emoji: pickEmoji(result),
    isNew: !discovered.includes(result),
    source: 'llama',
  };
}
