'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import { MONSTERS } from '@/lib/story/monsters';
import { SHOP_RECIPES, ELEMENT_DAMAGE, DEFAULT_DAMAGE } from '@/lib/story/weapons';
import {
  getDiamonds, addDiamonds, spendDiamonds,
  getUnlockedRecipes, unlockRecipe,
  getStoryWave, saveStoryWave, resetStory,
} from '@/lib/story/storyStorage';
import { combine } from '@/lib/gameLogic';

interface StoryModeProps {
  open: boolean;
  onClose: () => void;
  discovered: Element[];
  onNewElement: (el: Element) => void;
}

type BattlePhase = 'battle' | 'victory' | 'defeat';
type SidePanel = 'none' | 'shop' | 'crafting';

const PLAYER_MAX_HP = 100;

function calcDamage(name: string): number {
  return ELEMENT_DAMAGE[name.toLowerCase()] ?? DEFAULT_DAMAGE;
}

function checkWeak(elementName: string, list: string[]): boolean {
  const n = elementName.toLowerCase();
  return list.some(w => n === w || n.includes(w) || w.includes(n));
}

export default function StoryMode({ open, onClose, discovered, onNewElement }: StoryModeProps) {
  const [monsterIdx, setMonsterIdx] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTERS[0].maxHp);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [diamonds, setDiamonds] = useState(0);
  const [unlockedRecipes, setUnlockedRecipes] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>(['⚔️ A new adventure begins!']);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('battle');
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [busy, setBusy] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  // Crafting
  const [slotA, setSlotA] = useState<Element | null>(null);
  const [slotB, setSlotB] = useState<Element | null>(null);
  const [crafting, setCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState<Element | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const monster = MONSTERS[monsterIdx];

  useEffect(() => {
    if (!open) return;
    const wave = Math.min(getStoryWave(), MONSTERS.length - 1);
    setMonsterIdx(wave);
    setMonsterHp(MONSTERS[wave].maxHp);
    setPlayerHp(PLAYER_MAX_HP);
    setDiamonds(getDiamonds());
    setUnlockedRecipes(getUnlockedRecipes());
    setLog([`⚔️ ${MONSTERS[wave].name} stands before you!`]);
    setBattlePhase('battle');
    setSidePanel('none');
    setSlotA(null);
    setSlotB(null);
    setCraftResult(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-30), msg]);
  }, []);

  const handleAttack = useCallback((el: Element) => {
    if (busy || battlePhase !== 'battle') return;
    setBusy(true);

    let dmg = calcDamage(el.name);
    const isWeak = checkWeak(el.name, monster.weaknesses);
    const isResist = checkWeak(el.name, monster.resistances);

    if (isWeak) {
      dmg = Math.round(dmg * 2);
      addLog(`${el.emoji} ${el.name} is super effective! ${monster.emoji} takes ${dmg} damage! 💥`);
    } else if (isResist) {
      dmg = Math.round(dmg * 0.5);
      addLog(`${el.emoji} ${el.name} barely scratches ${monster.name}... ${dmg} damage.`);
    } else {
      addLog(`${el.emoji} ${el.name} hits ${monster.emoji} for ${dmg} damage.`);
    }

    setMonsterHit(true);
    setTimeout(() => setMonsterHit(false), 350);

    setMonsterHp(prev => {
      const next = Math.max(0, prev - dmg);
      if (next === 0) {
        setTimeout(() => {
          const earned = monster.reward;
          const total = addDiamonds(earned);
          setDiamonds(total);
          addLog(`💀 ${monster.name} defeated! You earn ${earned}💎`);
          const nextIdx = monsterIdx + 1;
          setTimeout(() => {
            if (nextIdx >= MONSTERS.length) {
              setBattlePhase('victory');
              addLog('🏆 All enemies defeated! You are victorious!');
            } else {
              saveStoryWave(nextIdx);
              setMonsterIdx(nextIdx);
              setMonsterHp(MONSTERS[nextIdx].maxHp);
              addLog(`⚔️ ${MONSTERS[nextIdx].name} appears!`);
              setBusy(false);
            }
          }, 600);
        }, 200);
      } else {
        // Monster counterattacks
        setTimeout(() => {
          const mDmg = monster.attackDamage;
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 350);
          addLog(`${monster.emoji} ${monster.name} strikes back for ${mDmg} damage!`);
          setPlayerHp(pp => {
            const np = Math.max(0, pp - mDmg);
            if (np === 0) {
              setBattlePhase('defeat');
              addLog('💔 You have fallen...');
            }
            return np;
          });
          setBusy(false);
        }, 450);
      }
      return next;
    });
  }, [busy, battlePhase, monster, monsterIdx, addLog]);

  const handleCraft = useCallback(async () => {
    if (!slotA || !slotB || crafting) return;
    setCrafting(true);
    setCraftResult(null);
    try {
      const result = await combine(slotA.name, slotB.name, discovered.map(e => e.name));
      const el = { name: result.result, emoji: result.emoji };
      setCraftResult(el);
      if (result.isNew) {
        onNewElement(el);
        addLog(`✨ Crafted new element: ${el.emoji} ${el.name}!`);
      } else {
        addLog(`🔨 Crafted: ${el.emoji} ${el.name}`);
      }
    } catch {
      addLog('❌ Crafting failed. Try different elements.');
    }
    setCrafting(false);
  }, [slotA, slotB, crafting, discovered, onNewElement, addLog]);

  const handleBuy = useCallback((recipe: typeof SHOP_RECIPES[0]) => {
    if (diamonds < recipe.cost || unlockedRecipes.includes(recipe.id)) return;
    spendDiamonds(recipe.cost);
    setDiamonds(d => d - recipe.cost);
    unlockRecipe(recipe.id);
    setUnlockedRecipes(r => [...r, recipe.id]);
    addLog(`📖 Recipe unlocked: ${recipe.emoji} ${recipe.name}!`);
  }, [diamonds, unlockedRecipes, addLog]);

  const restartWave = useCallback(() => {
    setMonsterHp(monster.maxHp);
    setPlayerHp(PLAYER_MAX_HP);
    setBattlePhase('battle');
    setBusy(false);
    addLog(`🔄 Retrying ${monster.name}...`);
  }, [monster, addLog]);

  const revive = useCallback(() => {
    if (!spendDiamonds(5)) return;
    setDiamonds(d => d - 5);
    setPlayerHp(PLAYER_MAX_HP);
    setBattlePhase('battle');
    setBusy(false);
    addLog('💊 Revived! Back in the fight!');
  }, [addLog]);

  const newGame = useCallback(() => {
    resetStory();
    setMonsterIdx(0);
    setMonsterHp(MONSTERS[0].maxHp);
    setPlayerHp(PLAYER_MAX_HP);
    setBattlePhase('battle');
    setBusy(false);
    setLog(['⚔️ A new adventure begins!']);
  }, []);

  if (!open) return null;

  const mHpPct = (monsterHp / monster.maxHp) * 100;
  const pHpPct = (playerHp / PLAYER_MAX_HP) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #060612 65%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-black/40 shrink-0">
        <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">⚔️ Story Mode</span>
          <span className="text-white/30 text-xs">Wave {monsterIdx + 1}/{MONSTERS.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-300 font-bold text-sm">💎 {diamonds}</span>
          <button
            onClick={() => setSidePanel(p => p === 'shop' ? 'none' : 'shop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sidePanel === 'shop' ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-200' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'}`}
          >
            🛒 Shop
          </button>
          <button
            onClick={() => setSidePanel(p => p === 'crafting' ? 'none' : 'crafting')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sidePanel === 'crafting' ? 'bg-purple-500/30 border-purple-500/50 text-purple-200' : 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'}`}
          >
            🔨 Craft
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main battle area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monster / end-state display */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
            {battlePhase === 'victory' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <p className="text-8xl mb-4">🏆</p>
                <h2 className="text-3xl font-bold text-yellow-300 mb-2">Victory!</h2>
                <p className="text-white/50 mb-6">You defeated all enemies and earned {diamonds}💎</p>
                <button
                  onClick={newGame}
                  className="px-6 py-2.5 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors"
                >
                  Play Again
                </button>
              </motion.div>
            ) : battlePhase === 'defeat' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <p className="text-8xl mb-4">💀</p>
                <h2 className="text-3xl font-bold text-red-400 mb-2">Defeated!</h2>
                <p className="text-white/50 mb-1">{monster.name} was too powerful.</p>
                <p className="text-white/30 text-sm mb-6">Tip: craft weapons or buy shop recipes!</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={restartWave}
                    className="px-5 py-2 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={revive}
                    disabled={diamonds < 5}
                    className="px-5 py-2 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-40 transition-colors"
                  >
                    Revive (5💎)
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Monster */}
                <motion.div
                  animate={monsterHit ? { x: [-8, 8, -5, 5, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-8"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-8xl mb-3 leading-none"
                  >
                    {monster.emoji}
                  </motion.div>
                  <h3 className="text-white font-bold text-2xl">{monster.name}</h3>
                  <p className="text-white/30 text-xs mt-1">{monster.description}</p>
                </motion.div>

                {/* HP bars */}
                <div className="w-72 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>Enemy HP</span>
                      <span>{monsterHp} / {monster.maxHp}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${mHpPct}%` }}
                        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                        className="h-full bg-red-500 rounded-full"
                      />
                    </div>
                  </div>

                  <motion.div animate={playerHit ? { x: [-4, 4, -2, 2, 0] } : {}} transition={{ duration: 0.25 }}>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>Your HP</span>
                      <span>{playerHp} / {PLAYER_MAX_HP}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${pHpPct}%` }}
                        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                        className={`h-full rounded-full ${pHpPct > 50 ? 'bg-green-500' : pHpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </motion.div>

                  <p className="text-white/20 text-xs text-center">
                    Weak to: {monster.weaknesses.slice(0, 4).join(', ')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Battle log */}
          <div ref={logRef} className="h-24 overflow-y-auto px-4 py-2 border-t border-white/10 bg-black/30 shrink-0">
            {log.map((msg, i) => (
              <p key={i} className="text-white/50 text-xs leading-5">{msg}</p>
            ))}
          </div>

          {/* Attack bar */}
          <div className="border-t border-white/10 bg-black/40 p-3 shrink-0">
            <p className="text-white/25 text-xs mb-2">
              Click any element to attack · combine two in Craft to forge weapons
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {discovered.map(el => (
                <motion.button
                  key={el.name}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleAttack(el)}
                  disabled={busy || battlePhase !== 'battle'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-[#e94560]/40 text-white text-xs transition-colors disabled:opacity-40"
                >
                  <span>{el.emoji}</span>
                  <span>{el.name}</span>
                  <span className="text-white/25 text-[10px]">{calcDamage(el.name)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <AnimatePresence>
          {sidePanel !== 'none' && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="w-76 bg-[#0d1117] border-l border-white/10 flex flex-col overflow-hidden"
              style={{ width: '304px' }}
            >
              {/* Shop */}
              {sidePanel === 'shop' && (
                <>
                  <div className="px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="text-yellow-300 font-bold">🛒 Weapon Shop</h3>
                    <p className="text-white/30 text-xs">Buy recipes to learn how to craft weapons</p>
                    <p className="text-yellow-300 font-semibold text-sm mt-1">💎 {diamonds} diamonds</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {SHOP_RECIPES.map(recipe => {
                      const owned = unlockedRecipes.includes(recipe.id);
                      const canAfford = diamonds >= recipe.cost;
                      return (
                        <div
                          key={recipe.id}
                          className={`p-3 rounded-xl border ${owned ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/3'}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold">{recipe.emoji} {recipe.name}</p>
                              <p className="text-white/35 text-xs mt-0.5 leading-4">{recipe.description}</p>
                              <p className="text-white/20 text-xs mt-1">⚔️ {recipe.damage} dmg</p>
                              {owned && (
                                <p className="text-green-400 text-xs mt-1 font-medium">
                                  {recipe.ingredientA} + {recipe.ingredientB}
                                </p>
                              )}
                            </div>
                            {owned ? (
                              <span className="text-green-400 text-xs shrink-0 mt-0.5">✓</span>
                            ) : (
                              <button
                                onClick={() => handleBuy(recipe)}
                                disabled={!canAfford}
                                className="px-2.5 py-1 rounded-lg bg-yellow-500 text-black text-xs font-bold disabled:opacity-30 hover:bg-yellow-400 transition-colors shrink-0"
                              >
                                {recipe.cost}💎
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Crafting */}
              {sidePanel === 'crafting' && (
                <>
                  <div className="px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="text-purple-300 font-bold">🔨 Crafting</h3>
                    <p className="text-white/30 text-xs">Combine elements to forge weapons for battle</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Known recipe hints */}
                    {unlockedRecipes.length > 0 && (
                      <div className="mb-4 p-3 bg-white/3 rounded-xl border border-white/8">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Known Recipes</p>
                        {SHOP_RECIPES.filter(r => unlockedRecipes.includes(r.id)).map(r => (
                          <p key={r.id} className="text-white/50 text-xs mb-1">
                            {r.emoji} {r.ingredientA} + {r.ingredientB}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Craft slots */}
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Select two elements</p>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setSlotA(null)}
                        className={`flex-1 h-11 rounded-xl border text-xs transition-colors ${slotA ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-white/20'}`}
                      >
                        {slotA ? `${slotA.emoji} ${slotA.name}` : 'Slot A'}
                      </button>
                      <span className="text-white/20 text-lg">+</span>
                      <button
                        onClick={() => setSlotB(null)}
                        className={`flex-1 h-11 rounded-xl border text-xs transition-colors ${slotB ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-white/20'}`}
                      >
                        {slotB ? `${slotB.emoji} ${slotB.name}` : 'Slot B'}
                      </button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCraft}
                      disabled={!slotA || !slotB || crafting}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-30 transition-colors mb-4"
                    >
                      {crafting ? '⚗️ Crafting...' : '⚗️ Craft'}
                    </motion.button>

                    {/* Craft result */}
                    <AnimatePresence>
                      {craftResult && (
                        <motion.div
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.85, opacity: 0 }}
                          className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 text-center mb-4"
                        >
                          <p className="text-3xl mb-1">{craftResult.emoji}</p>
                          <p className="text-white text-sm font-bold">{craftResult.name}</p>
                          <p className="text-purple-300 text-xs mt-0.5">⚔️ {calcDamage(craftResult.name)} damage</p>
                          <button
                            onClick={() => handleAttack(craftResult)}
                            disabled={battlePhase !== 'battle' || busy}
                            className="mt-2 px-4 py-1.5 rounded-lg bg-[#e94560] text-white text-xs font-bold hover:bg-[#ff6b82] disabled:opacity-30 transition-colors"
                          >
                            Attack now!
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Element picker */}
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your elements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {discovered.map(el => (
                        <button
                          key={el.name}
                          onClick={() => {
                            if (!slotA) setSlotA(el);
                            else if (!slotB) setSlotB(el);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 border border-white/8 text-white text-xs transition-colors"
                        >
                          {el.emoji} {el.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
