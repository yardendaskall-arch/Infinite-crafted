import { supabase } from './supabase';

export interface Gift {
  id: string;
  from_username: string;
  element_name: string;
  element_emoji: string;
  sent_at: string;
}

export async function sendGift(
  fromUsername: string,
  toUsername: string,
  elementName: string,
  elementEmoji: string
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { data: recipient } = await supabase.from('users').select('username').eq('username', toUsername).maybeSingle();
  if (!recipient) return { error: `Player "${toUsername}" not found` };
  if (toUsername === fromUsername) return { error: 'You cannot gift yourself' };
  const { error } = await supabase.from('gifts').insert({
    from_username: fromUsername,
    to_username: toUsername,
    element_name: elementName,
    element_emoji: elementEmoji,
  });
  if (error) return { error: 'Failed to send gift' };
  return {};
}

export async function fetchGifts(username: string): Promise<Gift[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gifts')
    .select('id, from_username, element_name, element_emoji, sent_at')
    .eq('to_username', username)
    .eq('claimed', false)
    .order('sent_at', { ascending: false });
  return data ?? [];
}

export async function claimGift(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('gifts').update({ claimed: true }).eq('id', id);
}

export async function claimAllGifts(username: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('gifts').update({ claimed: true }).eq('to_username', username).eq('claimed', false);
}
