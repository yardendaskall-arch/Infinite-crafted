export interface ShopRecipe {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  ingredientA: string;
  ingredientB: string;
  damage: number;
  description: string;
}

// Base damage per element/weapon name (lowercase). Anything not listed = 18.
export const ELEMENT_DAMAGE: Record<string, number> = {
  // Base
  'fire': 25,
  'water': 18,
  'earth': 20,
  'wind': 12,
  // Tier 1
  'lava': 40,
  'steam': 22,
  'lightning': 48,
  'thunder': 40,
  'thunderbolt': 50,
  'explosion': 45,
  'storm': 35,
  'ice': 30,
  'blizzard': 40,
  'snow': 22,
  'crystal': 28,
  // Materials
  'stone': 25,
  'boulder': 32,
  'metal': 30,
  'steel': 38,
  'ash': 20,
  'magma': 42,
  'charcoal': 18,
  'gunpowder': 50,
  // Weapons (hardcoded)
  'sword': 60,
  'flaming sword': 90,
  'ice sword': 82,
  'thunder blade': 105,
  'shadow blade': 112,
  'holy sword': 138,
  'dragon slayer': 210,
  'enchanted blade': 95,
  'gun': 70,
  'sniper rifle': 120,
  'magic gun': 130,
  'steel shield': 10,
  'axe': 55,
  // Magic
  'magic': 55,
  'dark magic': 60,
  'light bulb': 40,
};

export const DEFAULT_DAMAGE = 18;

export const SHOP_RECIPES: ShopRecipe[] = [
  {
    id: 'sword',
    name: 'Sword',
    emoji: '⚔️',
    cost: 10,
    ingredientA: 'Metal',
    ingredientB: 'Stone',
    damage: 60,
    description: 'Basic iron blade. Solid damage, crafts into everything else.',
  },
  {
    id: 'flaming_sword',
    name: 'Flaming Sword',
    emoji: '🔥⚔️',
    cost: 20,
    ingredientA: 'Sword',
    ingredientB: 'Fire',
    damage: 90,
    description: 'Burns undead and vampires. 2× damage vs zombies and vampires.',
  },
  {
    id: 'ice_sword',
    name: 'Ice Sword',
    emoji: '❄️⚔️',
    cost: 20,
    ingredientA: 'Sword',
    ingredientB: 'Ice',
    damage: 82,
    description: 'Freezes enemies. 2× vs dragons and ice giants.',
  },
  {
    id: 'thunder_blade',
    name: 'Thunder Blade',
    emoji: '⚡⚔️',
    cost: 25,
    ingredientA: 'Sword',
    ingredientB: 'Lightning',
    damage: 105,
    description: 'Crackling with electricity. 2× vs werewolves and ice giants.',
  },
  {
    id: 'shadow_blade',
    name: 'Shadow Blade',
    emoji: '🌑⚔️',
    cost: 30,
    ingredientA: 'Sword',
    ingredientB: 'Ash',
    damage: 112,
    description: 'Forged in darkness. Phases through armor.',
  },
  {
    id: 'holy_sword',
    name: 'Holy Sword',
    emoji: '✨⚔️',
    cost: 40,
    ingredientA: 'Sword',
    ingredientB: 'Magic',
    damage: 138,
    description: 'Blessed blade. 2× vs demons, ghosts and vampires.',
  },
  {
    id: 'dragon_slayer',
    name: 'Dragon Slayer',
    emoji: '🐉⚔️',
    cost: 75,
    ingredientA: 'Sword',
    ingredientB: 'Dragon',
    damage: 210,
    description: 'The ultimate weapon. Made to defeat the Dark Lord.',
  },
  {
    id: 'gun',
    name: 'Gun',
    emoji: '🔫',
    cost: 15,
    ingredientA: 'Gunpowder',
    ingredientB: 'Metal',
    damage: 70,
    description: 'Ranged firearm. Consistent damage on any enemy.',
  },
  {
    id: 'sniper_rifle',
    name: 'Sniper Rifle',
    emoji: '🎯',
    cost: 35,
    ingredientA: 'Gun',
    ingredientB: 'Telescope',
    damage: 120,
    description: 'Long-range precision. High base damage.',
  },
  {
    id: 'magic_gun',
    name: 'Magic Gun',
    emoji: '✨🔫',
    cost: 50,
    ingredientA: 'Gun',
    ingredientB: 'Magic',
    damage: 130,
    description: 'Fires magical bullets. 2× vs demons and the Dark Lord.',
  },
];
