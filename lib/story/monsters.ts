export interface Monster {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  reward: number; // diamonds
  attackDamage: number;
  weaknesses: string[]; // lowercase element/weapon names
  resistances: string[];
  description: string;
}

export const MONSTERS: Monster[] = [
  {
    id: 'zombie',
    name: 'Zombie',
    emoji: '🧟',
    maxHp: 80,
    reward: 3,
    attackDamage: 8,
    weaknesses: ['fire', 'flaming sword', 'lava', 'magma'],
    resistances: ['water', 'mud'],
    description: 'A shambling undead. Burns easily.',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    emoji: '💀',
    maxHp: 130,
    reward: 5,
    attackDamage: 12,
    weaknesses: ['earth', 'stone', 'sword', 'metal', 'boulder'],
    resistances: ['lightning', 'thunder blade'],
    description: 'Rattling bones. Crush it with earth or iron.',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    emoji: '👻',
    maxHp: 110,
    reward: 8,
    attackDamage: 15,
    weaknesses: ['holy sword', 'magic', 'light bulb', 'crystal', 'enchanted blade'],
    resistances: ['fire', 'water', 'earth', 'wind', 'sword'],
    description: 'Phasing spirit. Only magic and holy light can harm it.',
  },
  {
    id: 'vampire',
    name: 'Vampire',
    emoji: '🧛',
    maxHp: 200,
    reward: 12,
    attackDamage: 20,
    weaknesses: ['fire', 'flaming sword', 'holy sword', 'light bulb', 'sunlight'],
    resistances: ['shadow blade', 'ash', 'darkness'],
    description: 'Lord of night. Light and fire are its bane.',
  },
  {
    id: 'werewolf',
    name: 'Werewolf',
    emoji: '🐺',
    maxHp: 270,
    reward: 18,
    attackDamage: 25,
    weaknesses: ['sword', 'metal', 'thunder blade', 'steel'],
    resistances: ['fire', 'water', 'lava'],
    description: 'Cursed beast. Iron and thunder cut through its hide.',
  },
  {
    id: 'ice_giant',
    name: 'Ice Giant',
    emoji: '🧊',
    maxHp: 340,
    reward: 22,
    attackDamage: 28,
    weaknesses: ['fire', 'lava', 'flaming sword', 'lightning', 'thunder blade'],
    resistances: ['ice sword', 'water', 'snow', 'blizzard'],
    description: 'Frozen colossus. Melt it with fire and lightning.',
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    maxHp: 480,
    reward: 35,
    attackDamage: 35,
    weaknesses: ['ice sword', 'thunder blade', 'sniper rifle'],
    resistances: ['fire', 'lava', 'flaming sword'],
    description: 'Ancient fire-breather. Ice and lightning pierce its scales.',
  },
  {
    id: 'demon',
    name: 'Demon',
    emoji: '😈',
    maxHp: 650,
    reward: 50,
    attackDamage: 42,
    weaknesses: ['holy sword', 'dragon slayer', 'magic', 'magic gun'],
    resistances: ['shadow blade', 'fire', 'gun'],
    description: 'Hellspawn. Only holy power and dragon magic can banish it.',
  },
  {
    id: 'dark_lord',
    name: 'Dark Lord',
    emoji: '💀👑',
    maxHp: 1200,
    reward: 150,
    attackDamage: 55,
    weaknesses: ['dragon slayer', 'holy sword', 'thunder blade', 'magic gun'],
    resistances: ['shadow blade', 'fire', 'ice sword', 'gun'],
    description: 'The final boss. Bring every weapon you have.',
  },
];
