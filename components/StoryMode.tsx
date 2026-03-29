'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMBINATIONS, BASE_ELEMENTS, type Element } from '@/lib/combinations';
import { MONSTERS, type Monster } from '@/lib/story/monsters';
import { SHOP_RECIPES, ELEMENT_DAMAGE, DEFAULT_DAMAGE } from '@/lib/story/weapons';
import {
  getDiamonds, addDiamonds, spendDiamonds,
  getUnlockedRecipes, unlockRecipe,
  getDefeatedMonsters, addDefeatedMonster, resetStory,
} from '@/lib/story/storyStorage';
import { combine } from '@/lib/gameLogic';
import WorldMap, { MONSTER_POSITIONS } from '@/components/story/WorldMap';

// ── Recipe tree helpers ──────────────────────────────────────────────────────
const _BASE = new Set(BASE_ELEMENTS.map(e => e.name.toLowerCase()));
const _REV: Record<string, { a: string; b: string; result: string; emoji: string }> = {};
for (const [key, val] of Object.entries(COMBINATIONS)) {
  const lower = val.result.toLowerCase();
  if (!_REV[lower]) {
    const [a, b] = key.split('+');
    _REV[lower] = { a, b, result: val.result, emoji: val.emoji };
  }
}
interface RecipeStep { result: string; emoji: string; a: string; b: string }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function getRecipeSteps(name: string, visited = new Set<string>()): RecipeStep[] {
  const lower = name.toLowerCase();
  if (visited.has(lower) || _BASE.has(lower)) return [];
  visited.add(lower);
  const r = _REV[lower];
  if (!r) return [];
  return [...getRecipeSteps(r.a, visited), ...getRecipeSteps(r.b, visited),
    { result: r.result, emoji: r.emoji, a: cap(r.a), b: cap(r.b) }];
}
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  discovered: Element[];
  onNewElement: (el: Element) => void;
}

type View = 'map' | 'battle';
type BattlePhase = 'fighting' | 'victory' | 'defeat';
type SidePanel = 'none' | 'shop' | 'crafting';

interface DmgNum { id: number; value: number; type: 'super' | 'normal' | 'resist' | 'player'; x: number }

const PLAYER_MAX_HP = 120;
let dmgId = 0;

function calcDamage(name: string) {
  return ELEMENT_DAMAGE[name.toLowerCase()] ?? DEFAULT_DAMAGE;
}

export default function StoryMode({ open, onClose, discovered, onNewElement }: Props) {
  const [view, setView] = useState<View>('map');
  const [activeMonster, setActiveMonster] = useState<Monster | null>(null);
  const [monsterHp, setMonsterHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [diamonds, setDiamonds] = useState(0);
  const [unlockedRecipes, setUnlockedRecipes] = useState<string[]>([]);
  const [defeated, setDefeated] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<string[]>([]);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('fighting');
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [busy, setBusy] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [dmgNums, setDmgNums] = useState<DmgNum[]>([]);
  const [effectCache, setEffectCache] = useState<Record<string, 'super' | 'normal' | 'resist'>>({});
  const [slotA, setSlotA] = useState<Element | null>(null);
  const [slotB, setSlotB] = useState<Element | null>(null);
  const [crafting, setCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState<Element | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDiamonds(getDiamonds());
    setUnlockedRecipes(getUnlockedRecipes());
    setDefeated(new Set(getDefeatedMonsters()));
    setView('map');
    setPlayerHp(PLAYER_MAX_HP);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-25), msg]), []);

  const spawnDmg = useCallback((value: number, type: DmgNum['type']) => {
    const id = ++dmgId;
    const x = 30 + Math.random() * 40;
    setDmgNums(prev => [...prev, { id, value, type, x }]);
    setTimeout(() => setDmgNums(prev => prev.filter(d => d.id !== id)), 1400);
  }, []);

  const getEffectiveness = useCallback(async (
    elementName: string, monsterName: string
  ): Promise<'super' | 'normal' | 'resist'> => {
    const key = `${elementName}|${monsterName}`;
    if (effectCache[key]) return effectCache[key];
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
      const res = await fetch(`${base}/api/effectiveness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementName, monsterName }),
      });
      const { effectiveness } = await res.json();
      setEffectCache(prev => ({ ...prev, [key]: effectiveness }));
      return effectiveness;
    } catch {
      return 'normal';
    }
  }, [effectCache]);

  const enterBattle = useCallback((monsterId: string) => {
    const mon = MONSTERS.find(m => m.id === monsterId);
    if (!mon) return;
    setActiveMonster(mon);
    setMonsterHp(mon.maxHp);
    setPlayerHp(PLAYER_MAX_HP);
    setLog([`⚔️ ${mon.name} blocks your path!`, `💬 "${mon.description}"`]);
    setBattlePhase('fighting');
    setSidePanel('none');
    setBusy(false);
    setDmgNums([]);
    setCraftResult(null);
    setView('battle');
  }, []);

  const handleAttack = useCallback(async (el: Element) => {
    if (busy || battlePhase !== 'fighting' || !activeMonster) return;
    setBusy(true);

    const effectiveness = await getEffectiveness(el.name, activeMonster.name);
    let dmg = calcDamage(el.name);
    if (effectiveness === 'super') dmg = Math.round(dmg * 2);
    if (effectiveness === 'resist') dmg = Math.round(dmg * 0.5);

    spawnDmg(dmg, effectiveness);
    setMonsterHit(true);
    setTimeout(() => setMonsterHit(false), 380);

    if (effectiveness === 'super') {
      addLog(`💥 ${el.emoji} ${el.name} is SUPER EFFECTIVE! −${dmg} HP`);
    } else if (effectiveness === 'resist') {
      addLog(`🛡️ ${el.emoji} ${el.name} is resisted… −${dmg} HP`);
    } else {
      addLog(`⚔️ ${el.emoji} ${el.name} hits for −${dmg} HP`);
    }

    setMonsterHp(prev => {
      const next = Math.max(0, prev - dmg);
      if (next === 0) {
        setTimeout(() => {
          const earned = activeMonster.reward;
          const total = addDiamonds(earned);
          setDiamonds(total);
          addDefeatedMonster(activeMonster.id);
          setDefeated(d => new Set([...d, activeMonster.id]));
          setBattlePhase('victory');
          addLog(`🏆 ${activeMonster.name} defeated! +${earned}💎`);
          setBusy(false);
        }, 300);
      } else {
        setTimeout(() => {
          const mDmg = activeMonster.attackDamage;
          spawnDmg(mDmg, 'player');
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 300);
          addLog(`${activeMonster.emoji} ${activeMonster.name} retaliates! −${mDmg} HP`);
          setPlayerHp(pp => {
            const np = Math.max(0, pp - mDmg);
            if (np === 0) {
              setBattlePhase('defeat');
              addLog('💀 You have fallen...');
            }
            return np;
          });
          setBusy(false);
        }, 500);
      }
      return next;
    });
  }, [busy, battlePhase, activeMonster, getEffectiveness, addLog, spawnDmg]);

  const handleCraft = useCallback(async () => {
    if (!slotA || !slotB || crafting) return;
    setCrafting(true); setCraftResult(null);
    try {
      const result = await combine(slotA.name, slotB.name, discovered.map(e => e.name));
      const el = { name: result.result, emoji: result.emoji };
      setCraftResult(el);
      if (result.isNew) { onNewElement(el); addLog(`✨ Crafted new: ${el.emoji} ${el.name}!`); }
      else addLog(`🔨 Crafted: ${el.emoji} ${el.name}`);
    } catch { addLog('❌ Crafting failed.'); }
    setCrafting(false);
  }, [slotA, slotB, crafting, discovered, onNewElement, addLog]);

  const handleBuy = useCallback((recipe: typeof SHOP_RECIPES[0]) => {
    if (diamonds < recipe.cost || unlockedRecipes.includes(recipe.id)) return;
    spendDiamonds(recipe.cost);
    setDiamonds(d => d - recipe.cost);
    unlockRecipe(recipe.id);
    setUnlockedRecipes(r => [...r, recipe.id]);
    addLog(`📖 Recipe unlocked: ${recipe.emoji} ${recipe.name}`);
  }, [diamonds, unlockedRecipes, addLog]);

  const revive = useCallback(() => {
    if (!spendDiamonds(5)) return;
    setDiamonds(d => d - 5);
    setPlayerHp(PLAYER_MAX_HP);
    setBattlePhase('fighting');
    setBusy(false);
    addLog('💊 Revived!');
  }, [addLog]);

  const returnToMap = useCallback(() => {
    setView('map');
    setActiveMonster(null);
    setDmgNums([]);
  }, []);

  const handleFullReset = useCallback(() => {
    resetStory();
    setDefeated(new Set());
    setDiamonds(0);
    setUnlockedRecipes([]);
    setView('map');
    setActiveMonster(null);
  }, []);

  if (!open) return null;

  const mon = activeMonster;
  const monPos = mon ? MONSTER_POSITIONS.find(p => p.id === mon.id) : null;
  const mHpPct = mon ? (monsterHp / mon.maxHp) * 100 : 0;
  const pHpPct = (playerHp / PLAYER_MAX_HP) * 100;
  const allDefeated = defeated.size >= MONSTERS.length;

  // ── MAP VIEW ──
  if (view === 'map') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-black/80 border-b border-white/10 shrink-0 z-20">
          <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">← Exit Story</button>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm">⚔️ Story Mode</span>
            <span className="text-white/30 text-xs">{defeated.size}/{MONSTERS.length} defeated</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-yellow-300 font-bold text-sm">💎 {diamonds}</span>
            <button
              onClick={() => setSidePanel(p => p === 'shop' ? 'none' : 'shop')}
              className="px-2.5 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 text-xs font-medium hover:bg-yellow-500/25 transition-colors"
            >🛒 Shop</button>
            <button
              onClick={handleFullReset}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors"
            >Reset</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <WorldMap
            defeated={defeated}
            onEncounter={enterBattle}
            onClose={onClose}
            diamonds={diamonds}
            playerHp={playerHp}
            maxHp={PLAYER_MAX_HP}
          />

          {/* Shop panel on map */}
          <AnimatePresence>
            {sidePanel === 'shop' && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                className="w-72 bg-[#0a0a14] border-l border-white/10 flex flex-col overflow-hidden z-10"
              >
                <div className="px-4 py-3 border-b border-white/10 shrink-0">
                  <h3 className="text-yellow-300 font-bold">🛒 Weapon Shop</h3>
                  <p className="text-white/30 text-xs mt-0.5">Buy recipes to craft powerful weapons</p>
                  <p className="text-yellow-300 font-semibold text-sm mt-1.5">💎 {diamonds}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {SHOP_RECIPES.map(recipe => {
                    const owned = unlockedRecipes.includes(recipe.id);
                    const steps = owned ? getRecipeSteps(recipe.name) : [];
                    return (
                      <div key={recipe.id} className={`p-3 rounded-xl border ${owned ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/3'}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold">{recipe.emoji} {recipe.name}</p>
                            <p className="text-white/30 text-xs mt-0.5 leading-4">{recipe.description}</p>
                            <p className="text-white/20 text-xs mt-1">⚔️ {recipe.damage} dmg</p>
                          </div>
                          {owned ? (
                            <span className="text-green-400 text-xs shrink-0">✓</span>
                          ) : (
                            <button
                              onClick={() => handleBuy(recipe)}
                              disabled={diamonds < recipe.cost}
                              className="px-2.5 py-1 rounded-lg bg-yellow-500 text-black text-xs font-bold disabled:opacity-30 hover:bg-yellow-400 shrink-0"
                            >
                              {recipe.cost}💎
                            </button>
                          )}
                        </div>
                        {owned && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Crafting chain</p>
                            {steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs">
                                <span className="text-white/20 w-3 text-right shrink-0">{i + 1}.</span>
                                <span className="text-white/40">{step.a}</span>
                                <span className="text-white/20">+</span>
                                <span className="text-white/40">{step.b}</span>
                                <span className="text-white/20 mx-1">→</span>
                                <span className="text-green-300/80">{step.emoji} {step.result}</span>
                              </div>
                            ))}
                            <div className="flex items-center gap-1 text-xs mt-1">
                              <span className="text-white/20 w-3 text-right shrink-0">{steps.length + 1}.</span>
                              <span className="text-white/40">{recipe.ingredientA}</span>
                              <span className="text-white/20">+</span>
                              <span className="text-white/40">{recipe.ingredientB}</span>
                              <span className="text-white/20 mx-1">→</span>
                              <span className="text-yellow-300/90 font-semibold">{recipe.emoji} {recipe.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {allDefeated && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-8 py-3 rounded-2xl font-bold text-lg shadow-2xl z-50"
          >
            🏆 All enemies defeated! You are the champion!
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ── BATTLE VIEW ──
  if (!mon) return null;

  const zoneColor = monPos?.zoneColor ?? '#0a0a1a';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${zoneColor} 0%, #040410 70%)` }}
    >
      {/* Screen flash on player hit */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-red-600 z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Battle top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-black/50 border-b border-white/10 shrink-0 z-10">
        <button onClick={returnToMap} className="text-white/50 hover:text-white text-sm transition-colors">← Map</button>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">{mon.emoji} {mon.name}</span>
          <span className="text-white/30 text-xs">{monPos?.zone}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-300 font-bold text-sm">💎 {diamonds}</span>
          <button
            onClick={() => setSidePanel(p => p === 'shop' ? 'none' : 'shop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sidePanel === 'shop' ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-200' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}
          >🛒</button>
          <button
            onClick={() => setSidePanel(p => p === 'crafting' ? 'none' : 'crafting')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sidePanel === 'crafting' ? 'bg-purple-500/30 border-purple-500/50 text-purple-200' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}
          >🔨</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main battle area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monster area */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {battlePhase === 'victory' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                  className="text-8xl mb-4"
                >🏆</motion.div>
                <h2 className="text-3xl font-bold text-yellow-300 mb-2">Victory!</h2>
                <p className="text-white/50 mb-6">+{mon.reward}💎 earned</p>
                <button
                  onClick={returnToMap}
                  className="px-8 py-2.5 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors text-lg"
                >
                  Back to Map →
                </button>
              </motion.div>
            ) : battlePhase === 'defeat' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <div className="text-8xl mb-4">💀</div>
                <h2 className="text-3xl font-bold text-red-400 mb-2">Defeated!</h2>
                <p className="text-white/40 text-sm mb-6">Tip: craft weapons or visit the shop!</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setMonsterHp(mon.maxHp);
                      setPlayerHp(PLAYER_MAX_HP);
                      setBattlePhase('fighting');
                      setBusy(false);
                      setLog([`🔄 Facing ${mon.name} again...`]);
                    }}
                    className="px-6 py-2 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
                  >Retry</button>
                  <button
                    onClick={revive}
                    disabled={diamonds < 5}
                    className="px-6 py-2 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-40 transition-colors"
                  >Revive (5💎)</button>
                  <button onClick={returnToMap} className="px-6 py-2 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-colors">← Map</button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Floating damage numbers */}
                <div className="absolute top-0 left-0 right-0 h-2/3 pointer-events-none overflow-hidden">
                  <AnimatePresence>
                    {dmgNums.map(d => (
                      <motion.div
                        key={d.id}
                        initial={{ y: 0, opacity: 1, scale: 1 }}
                        animate={{ y: -100, opacity: 0, scale: 1.3 }}
                        exit={{}}
                        transition={{ duration: 1.3, ease: 'easeOut' }}
                        style={{ position: 'absolute', left: `${d.x}%`, top: '45%' }}
                        className={`font-black text-2xl select-none pointer-events-none drop-shadow-lg ${
                          d.type === 'super' ? 'text-yellow-300' :
                          d.type === 'resist' ? 'text-slate-400' :
                          d.type === 'player' ? 'text-red-400' :
                          'text-white'
                        }`}
                      >
                        {d.type === 'player' ? `-${d.value}` : (
                          <>
                            {d.type === 'super' && '⚡'}
                            -{d.value}
                            {d.type === 'super' && '!'}
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Monster */}
                <motion.div
                  animate={monsterHit ? { x: [-10, 10, -6, 6, 0], filter: ['brightness(3)', 'brightness(1)'] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-6 relative"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      fontSize: '6rem',
                      filter: `drop-shadow(0 0 20px ${monPos?.zoneColor ?? '#ff0000'}) drop-shadow(0 0 40px rgba(255,100,100,0.4))`,
                      lineHeight: 1,
                    }}
                  >
                    {mon.emoji}
                  </motion.div>
                  <h3 className="text-white font-bold text-2xl mt-2">{mon.name}</h3>
                  <p className="text-white/30 text-xs mt-1 max-w-xs">{mon.description}</p>
                </motion.div>

                {/* HP bars */}
                <div className="w-80 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400/70">Enemy HP</span>
                      <span className="text-white/50">{monsterHp} / {mon.maxHp}</span>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                      <motion.div
                        animate={{ width: `${mHpPct}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400/70">Your HP</span>
                      <span className="text-white/50">{playerHp} / {PLAYER_MAX_HP}</span>
                    </div>
                    <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                      <motion.div
                        animate={{ width: `${pHpPct}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        className="h-full rounded-full"
                        style={{
                          background: pHpPct > 50
                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                            : pHpPct > 25
                            ? 'linear-gradient(90deg, #ca8a04, #eab308)'
                            : 'linear-gradient(90deg, #991b1b, #ef4444)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Battle log */}
          <div
            ref={logRef}
            className="h-20 overflow-y-auto px-4 py-2 border-t border-white/10 bg-black/40 shrink-0"
          >
            {log.map((msg, i) => (
              <p key={i} className="text-white/50 text-xs leading-5">{msg}</p>
            ))}
          </div>

          {/* Attack bar */}
          <div className="border-t border-white/10 bg-black/50 p-3 shrink-0">
            <p className="text-white/20 text-xs mb-2">Select element to attack · AI determines effectiveness</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {discovered.map(el => {
                const cached = effectCache[`${el.name}|${mon.name}`];
                return (
                  <motion.button
                    key={el.name}
                    whileHover={{ scale: 1.07 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleAttack(el)}
                    disabled={busy || battlePhase !== 'fighting'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-40 ${
                      cached === 'super'
                        ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200'
                        : cached === 'resist'
                        ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/15 hover:border-[#e94560]/40'
                    }`}
                  >
                    <span>{el.emoji}</span>
                    <span>{el.name}</span>
                    <span className="text-white/20 text-[10px]">{calcDamage(el.name)}</span>
                    {cached === 'super' && <span className="text-yellow-400 text-[10px]">✦</span>}
                    {cached === 'resist' && <span className="text-slate-500 text-[10px]">↓</span>}
                  </motion.button>
                );
              })}
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
              className="w-72 bg-[#0a0a14] border-l border-white/10 flex flex-col overflow-hidden"
            >
              {/* Shop */}
              {sidePanel === 'shop' && (
                <>
                  <div className="px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="text-yellow-300 font-bold">🛒 Shop</h3>
                    <p className="text-yellow-300 text-sm mt-1">💎 {diamonds}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {SHOP_RECIPES.map(recipe => {
                      const owned = unlockedRecipes.includes(recipe.id);
                      const steps = owned ? getRecipeSteps(recipe.name) : [];
                      return (
                        <div key={recipe.id} className={`p-3 rounded-xl border ${owned ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/3'}`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold">{recipe.emoji} {recipe.name}</p>
                              <p className="text-white/30 text-xs mt-0.5 leading-4">{recipe.description}</p>
                            </div>
                            {owned ? <span className="text-green-400 text-xs shrink-0">✓</span> : (
                              <button onClick={() => handleBuy(recipe)} disabled={diamonds < recipe.cost}
                                className="px-2 py-1 rounded-lg bg-yellow-500 text-black text-xs font-bold disabled:opacity-30 hover:bg-yellow-400 shrink-0">
                                {recipe.cost}💎
                              </button>
                            )}
                          </div>
                          {owned && (
                            <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Crafting chain</p>
                              {steps.map((step, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs">
                                  <span className="text-white/20 w-3 text-right shrink-0">{i + 1}.</span>
                                  <span className="text-white/40">{step.a}</span>
                                  <span className="text-white/20">+</span>
                                  <span className="text-white/40">{step.b}</span>
                                  <span className="text-white/20 mx-1">→</span>
                                  <span className="text-green-300/80">{step.emoji} {step.result}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 text-xs mt-1">
                                <span className="text-white/20 w-3 text-right shrink-0">{steps.length + 1}.</span>
                                <span className="text-white/40">{recipe.ingredientA}</span>
                                <span className="text-white/20">+</span>
                                <span className="text-white/40">{recipe.ingredientB}</span>
                                <span className="text-white/20 mx-1">→</span>
                                <span className="text-yellow-300/90 font-semibold">{recipe.emoji} {recipe.name}</span>
                              </div>
                            </div>
                          )}
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
                    {unlockedRecipes.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {SHOP_RECIPES.filter(r => unlockedRecipes.includes(r.id)).map(r => (
                          <p key={r.id} className="text-purple-400/60 text-xs">{r.emoji} {r.ingredientA} + {r.ingredientB}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setSlotA(null)}
                        className={`flex-1 h-10 rounded-xl border text-xs truncate transition-colors ${slotA ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-white/20'}`}>
                        {slotA ? `${slotA.emoji} ${slotA.name}` : 'Slot A'}
                      </button>
                      <span className="text-white/20">+</span>
                      <button onClick={() => setSlotB(null)}
                        className={`flex-1 h-10 rounded-xl border text-xs truncate transition-colors ${slotB ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-white/20'}`}>
                        {slotB ? `${slotB.emoji} ${slotB.name}` : 'Slot B'}
                      </button>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleCraft} disabled={!slotA || !slotB || crafting}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-30 mb-3 transition-colors">
                      {crafting ? '⚗️ Crafting...' : '⚗️ Craft'}
                    </motion.button>
                    <AnimatePresence>
                      {craftResult && (
                        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 text-center mb-3">
                          <p className="text-3xl mb-1">{craftResult.emoji}</p>
                          <p className="text-white text-sm font-bold">{craftResult.name}</p>
                          <p className="text-purple-300 text-xs mt-0.5">⚔️ {calcDamage(craftResult.name)} dmg</p>
                          <button onClick={() => handleAttack(craftResult)}
                            disabled={battlePhase !== 'fighting' || busy}
                            className="mt-2 px-4 py-1 rounded-lg bg-[#e94560] text-white text-xs font-bold hover:bg-[#ff6b82] disabled:opacity-30 transition-colors">
                            Attack!
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <p className="text-white/30 text-xs mb-2">Your elements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {discovered.map(el => (
                        <button key={el.name}
                          onClick={() => { if (!slotA) setSlotA(el); else if (!slotB) setSlotB(el); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 border border-white/8 text-white text-xs transition-colors">
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
