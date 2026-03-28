import { supabase } from './supabase';

/** Returns true if this is a world-first discovery. */
export async function recordDiscovery(
  elementName: string,
  elementEmoji: string,
  username: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('world_discoveries').insert({
    element_name: elementName,
    element_emoji: elementEmoji,
    first_discovered_by: username,
  });
  // error code 23505 = unique violation = already discovered
  return !error;
}
