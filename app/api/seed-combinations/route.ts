import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COMBINATIONS } from '@/lib/combinations';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key);

  // Build rows from the entire hardcoded COMBINATIONS map
  const rows = Object.entries(COMBINATIONS).map(([key, val]) => ({
    combo_key: key,
    result: val.result,
    emoji: val.emoji,
  }));

  // Upsert in batches of 100 to avoid request size limits
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from('combinations')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'combo_key' });
    if (error) {
      console.error('Seed batch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ seeded: rows.length });
}
