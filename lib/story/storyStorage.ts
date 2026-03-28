const DIAMONDS_KEY = 'ic_diamonds';
const RECIPES_KEY = 'ic_unlocked_recipes';
const DEFEATED_KEY = 'ic_defeated_monsters';

export function getDiamonds(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(DIAMONDS_KEY) || '0', 10);
}

export function addDiamonds(amount: number): number {
  const next = getDiamonds() + amount;
  localStorage.setItem(DIAMONDS_KEY, String(next));
  return next;
}

export function spendDiamonds(amount: number): boolean {
  const current = getDiamonds();
  if (current < amount) return false;
  localStorage.setItem(DIAMONDS_KEY, String(current - amount));
  return true;
}

export function getUnlockedRecipes(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]'); }
  catch { return []; }
}

export function unlockRecipe(id: string): void {
  const current = getUnlockedRecipes();
  if (!current.includes(id)) {
    localStorage.setItem(RECIPES_KEY, JSON.stringify([...current, id]));
  }
}

export function getDefeatedMonsters(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(DEFEATED_KEY) || '[]'); }
  catch { return []; }
}

export function addDefeatedMonster(id: string): void {
  const current = getDefeatedMonsters();
  if (!current.includes(id)) {
    localStorage.setItem(DEFEATED_KEY, JSON.stringify([...current, id]));
  }
}

export function resetStory(): void {
  localStorage.removeItem(DEFEATED_KEY);
  localStorage.removeItem(DIAMONDS_KEY);
  localStorage.removeItem(RECIPES_KEY);
}

