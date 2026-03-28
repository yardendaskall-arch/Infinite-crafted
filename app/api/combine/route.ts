import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { element1, element2 } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not set', result: 'Mystery', emoji: '\u2753' },
      { status: 500 }
    );
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content:
            'You are a creative element combination game. When given two elements, respond with ONLY the resulting element name (1-3 words, no punctuation, no explanation). Be imaginative and logical.\n\nExamples:\nFire + Water = Steam\nEarth + Wind = Dust\nLava + Ash = Obsidian\nFire + Life = Dragon\nWater + Mountain = Waterfall\nIce + Fire = Water\nHuman + Dragon = Dragon Rider\nLightning + Metal = Magnet',
        },
        {
          role: 'user',
          content: `${element1} + ${element2} =`,
        },
      ],
      max_tokens: 12,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? 'Mystery';
    // Strip leading "= " if model echoes it, keep only first line, strip non-word chars
    const result = raw
      .replace(/^=\s*/, '')
      .split('\n')[0]
      .replace(/[^\w\s'-]/g, '')
      .trim() || 'Mystery';

    return NextResponse.json({ result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ result: 'Mystery', emoji: '\u2753' }, { status: 500 });
  }
}
