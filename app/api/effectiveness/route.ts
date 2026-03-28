import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Server-side cache — survives across requests in the same process
const cache = new Map<string, 'super' | 'normal' | 'resist'>();

export async function POST(req: NextRequest) {
  const { elementName, monsterName } = await req.json();
  const key = `${elementName.toLowerCase()}|${monsterName.toLowerCase()}`;

  if (cache.has(key)) {
    return NextResponse.json({ effectiveness: cache.get(key) });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ effectiveness: 'normal' });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are a fantasy RPG combat judge. Decide if an element/weapon is super effective, resisted, or normal against a monster.
- "super" = 2x damage (e.g. Fire vs Zombie, Ice vs Dragon, Holy Sword vs Demon, Lightning vs Werewolf, Sword vs Skeleton)
- "resist" = 0.5x damage (e.g. Fire vs Fire Dragon, Water vs Ghost, Darkness vs Vampire)
- "normal" = 1x damage (no notable interaction)
Respond with ONLY one word: super, resist, or normal.`,
        },
        { role: 'user', content: `${elementName} vs ${monsterName}` },
      ],
      max_tokens: 4,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim().toLowerCase() ?? 'normal';
    const effectiveness: 'super' | 'normal' | 'resist' =
      raw.includes('super') ? 'super' : raw.includes('resist') ? 'resist' : 'normal';
    cache.set(key, effectiveness);
    return NextResponse.json({ effectiveness });
  } catch {
    return NextResponse.json({ effectiveness: 'normal' });
  }
}
