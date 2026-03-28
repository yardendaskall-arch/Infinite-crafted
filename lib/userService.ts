import { supabase } from './supabase';

const USERNAME_KEY = 'ic_username';

const ADJS = ['Cosmic','Ancient','Mystic','Shadow','Crystal','Thunder','Ember','Blazing','Frozen','Lunar','Solar','Arcane','Golden','Crimson','Neon','Phantom','Silent','Raging','Eternal','Hollow'];
const NOUNS = ['Dragon','Phoenix','Wizard','Knight','Titan','Wraith','Golem','Comet','Vortex','Serpent','Eagle','Wolf','Storm','Forge','Rune','Shard','Specter','Ember','Frost','Blade'];

export function generateUsername(): string {
  const a = ADJS[Math.floor(Math.random() * ADJS.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9999) + 1;
  return `${a}${n}${num}`;
}

export function getStoredUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function storeUsername(u: string): void {
  localStorage.setItem(USERNAME_KEY, u);
}

export async function registerUser(username: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('users').upsert({ username }, { onConflict: 'username' });
}

export async function changeUsername(oldUsername: string, newUsername: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const trimmed = newUsername.trim();
  if (!trimmed || trimmed.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { error: 'Letters, numbers and underscores only' };
  const { data } = await supabase.from('users').select('username').eq('username', trimmed).maybeSingle();
  if (data) return { error: 'Username already taken' };
  const { error } = await supabase.from('users').update({ username: trimmed }).eq('username', oldUsername);
  if (error) return { error: 'Failed to update. Try again.' };
  // Update gifts references (best effort)
  await supabase.from('gifts').update({ from_username: trimmed }).eq('from_username', oldUsername);
  await supabase.from('gifts').update({ to_username: trimmed }).eq('to_username', oldUsername);
  storeUsername(trimmed);
  return {};
}

export async function checkUserExists(username: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('users').select('username').eq('username', username).maybeSingle();
  return !!data;
}
