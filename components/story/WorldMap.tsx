'use client';
import { useRef, useEffect, useState } from 'react';
import { MONSTERS } from '@/lib/story/monsters';

const TILE_SIZE = 52;
const MAP_W = 25;
const MAP_H = 15;
const MOVE_SPEED = 7;
const VP_W = 15;
const VP_H = 11;

type Tile = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// 0=grass 1=forest 2=wall 3=water 4=lava 5=snow 6=dark 7=path 8=cave

const TILE_CSS: Record<number, { bg: string; border: string; shadow: string }> = {
  0: { bg: '#3a7030', border: '#285020', shadow: 'inset 0 -3px 5px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.06)' },
  1: { bg: '#1d4817', border: '#122e0e', shadow: 'inset 0 -3px 5px rgba(0,0,0,.5), inset 0 2px 2px rgba(255,255,255,.04)' },
  2: { bg: '#606060', border: '#404040', shadow: 'inset 0 -4px 8px rgba(0,0,0,.6), inset 0 3px 4px rgba(255,255,255,.15)' },
  3: { bg: '#1a50b8', border: '#0d347a', shadow: 'inset 0 0 14px rgba(40,120,255,.35)' },
  4: { bg: '#c04200', border: '#882e00', shadow: 'inset 0 0 16px rgba(255,100,0,.45)' },
  5: { bg: '#c8daf0', border: '#98aac0', shadow: 'inset 0 -3px 5px rgba(0,0,0,.2), inset 0 2px 3px rgba(255,255,255,.3)' },
  6: { bg: '#07071a', border: '#04040e', shadow: 'inset 0 0 18px rgba(120,0,255,.12)' },
  7: { bg: '#907a5a', border: '#6a5a3a', shadow: 'inset 0 -2px 4px rgba(0,0,0,.3), inset 0 1px 2px rgba(255,255,255,.1)' },
  8: { bg: '#2e1e08', border: '#1a1004', shadow: 'inset 0 0 12px rgba(0,0,0,.5)' },
};

const TILE_ICON: Record<number, string> = { 1: '🌲', 2: '⛰️', 3: '🌊', 4: '🔥' };
const PASSABLE = new Set([0, 1, 5, 6, 7, 8]);

/* prettier-ignore */
const MAP: Tile[] = [
  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
  2,6,6,6,6,6,6,6,6,6,6,6,6,2,6,6,6,6,6,6,8,8,8,6,2,
  2,6,6,6,6,6,6,6,6,6,7,7,6,2,7,7,6,6,6,6,8,8,6,6,2,
  2,6,6,7,7,6,6,6,6,7,7,6,6,6,6,6,6,6,6,6,8,8,6,6,2,
  2,1,1,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,6,6,6,2,
  2,1,1,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,6,6,6,2,
  2,1,1,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,2,
  2,1,0,0,0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,2,
  2,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,2,
  2,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,2,
  2,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,2,
  2,5,5,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,4,4,4,2,
  2,5,5,5,5,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,4,4,4,4,2,
  2,5,5,5,5,5,5,0,0,0,3,3,0,0,0,0,0,0,0,4,4,4,4,4,2,
  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
];

export const MONSTER_POSITIONS = [
  { id: 'zombie',    x: 4,  y: 7,  zone: 'Grasslands',   zoneColor: '#0d2a0a' },
  { id: 'skeleton',  x: 8,  y: 5,  zone: 'Grasslands',   zoneColor: '#0d2a0a' },
  { id: 'ghost',     x: 14, y: 7,  zone: 'Haunted Path',  zoneColor: '#1a1a3a' },
  { id: 'vampire',   x: 18, y: 9,  zone: 'East Moors',    zoneColor: '#2a0a1a' },
  { id: 'werewolf',  x: 8,  y: 13, zone: 'Snowfields',    zoneColor: '#0a1a2a' },
  { id: 'ice_giant', x: 3,  y: 12, zone: 'Snowfields',    zoneColor: '#0a1a2a' },
  { id: 'dragon',    x: 20, y: 11, zone: 'Lava Wastes',   zoneColor: '#2a0a00' },
  { id: 'demon',     x: 20, y: 3,  zone: 'The Dark Cave', zoneColor: '#12001a' },
  { id: 'dark_lord', x: 14, y: 2,  zone: 'The Abyss',     zoneColor: '#04040e' },
];

function getTile(x: number, y: number): Tile {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 2;
  return MAP[y * MAP_W + x] as Tile;
}

interface Props {
  defeated: Set<string>;
  onEncounter: (id: string) => void;
  onClose: () => void;
  diamonds: number;
  playerHp: number;
  maxHp: number;
}

export default function WorldMap({ defeated, onEncounter, onClose, diamonds, playerHp, maxHp }: Props) {
  const s = useRef({
    px: 2.5, py: 8.5,
    gx: 2, gy: 8,
    tx: 2, ty: 8,
    moving: false,
    keys: new Set<string>(),
    lastTime: 0,
    cooldown: 0,
  });
  const rafRef = useRef(0);
  const [render, setRender] = useState({ px: 2.5, py: 8.5, cam: { x: 0, y: 0 } });
  const defeatedRef = useRef(defeated);
  defeatedRef.current = defeated;
  const encounterRef = useRef(onEncounter);
  encounterRef.current = onEncounter;

  function cam(px: number, py: number) {
    return {
      x: Math.max(0, Math.min(MAP_W - VP_W, px - VP_W / 2)),
      y: Math.max(0, Math.min(MAP_H - VP_H, py - VP_H / 2)),
    };
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const blockers = ['INPUT', 'TEXTAREA'];
      if (blockers.includes((e.target as HTMLElement).tagName)) return;
      s.current.keys.add(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => s.current.keys.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    const loop = (t: number) => {
      const st = s.current;
      const dt = Math.min((t - st.lastTime) / 1000, 0.05);
      st.lastTime = t;

      if (st.moving) {
        const dx = st.tx - st.px;
        const dy = st.ty - st.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = MOVE_SPEED * dt;
        if (dist <= step) {
          st.px = st.tx; st.py = st.ty;
          st.gx = st.tx; st.gy = st.ty;
          st.moving = false;
          const hit = MONSTER_POSITIONS.find(m => m.x === st.gx && m.y === st.gy);
          if (hit && !defeatedRef.current.has(hit.id)) {
            encounterRef.current(hit.id);
          }
        } else {
          st.px += (dx / dist) * step;
          st.py += (dy / dist) * step;
        }
      }

      if (!st.moving && st.cooldown <= 0) {
        const k = st.keys;
        let nx = st.gx, ny = st.gy;
        if (k.has('ArrowUp') || k.has('w') || k.has('W')) ny--;
        else if (k.has('ArrowDown') || k.has('s') || k.has('S')) ny++;
        else if (k.has('ArrowLeft') || k.has('a') || k.has('A')) nx--;
        else if (k.has('ArrowRight') || k.has('d') || k.has('D')) nx++;
        if ((nx !== st.gx || ny !== st.gy) && PASSABLE.has(getTile(nx, ny))) {
          st.tx = nx; st.ty = ny;
          st.moving = true;
          st.cooldown = 0.05;
        }
      } else {
        st.cooldown = Math.max(0, st.cooldown - dt);
      }

      setRender({ px: st.px, py: st.py, cam: cam(st.px, st.py) });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { px, py, cam: c } = render;
  const startX = Math.floor(c.x);
  const startY = Math.floor(c.y);
  const endX = Math.min(startX + VP_W + 1, MAP_W);
  const endY = Math.min(startY + VP_H + 1, MAP_H);

  const toScreen = (wx: number, wy: number) => ({
    left: (wx - c.x) * TILE_SIZE,
    top: (wy - c.y) * TILE_SIZE,
  });

  const playerZone = MONSTER_POSITIONS.find(m =>
    Math.abs(m.x - px) < 4 && Math.abs(m.y - py) < 3
  )?.zone ?? 'World Map';

  return (
    <div className="flex-1 flex flex-col bg-[#060612] overflow-hidden">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/70 border-b border-white/10 shrink-0 z-20">
        <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">
          ← Back to Crafting
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">📍 {playerZone}</span>
          <span className="text-white/20 text-xs">· WASD to move · Walk into monster to fight</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 text-xs">HP</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(playerHp / maxHp) * 100}%`,
                  background: playerHp / maxHp > 0.5 ? '#22c55e' : playerHp / maxHp > 0.25 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
            <span className="text-white/50 text-xs">{playerHp}</span>
          </div>
          <span className="text-yellow-300 font-bold text-sm">💎 {diamonds}</span>
        </div>
      </div>

      {/* Map */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ perspective: '900px' }}
      >
        <div
          className="w-full h-full"
          style={{ transform: 'rotateX(14deg) scale(1.08)', transformOrigin: 'center 25%' }}
        >
          {/* Tile grid */}
          <div className="absolute inset-0">
            {Array.from({ length: endY - startY }, (_, row) =>
              Array.from({ length: endX - startX }, (_, col) => {
                const tx = startX + col;
                const ty = startY + row;
                const tile = getTile(tx, ty);
                const css = TILE_CSS[tile];
                const icon = TILE_ICON[tile];
                const { left, top } = toScreen(tx, ty);
                return (
                  <div
                    key={`${tx},${ty}`}
                    style={{
                      position: 'absolute',
                      left, top,
                      width: TILE_SIZE, height: TILE_SIZE,
                      backgroundColor: css.bg,
                      border: `1px solid ${css.border}`,
                      boxShadow: css.shadow,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: TILE_SIZE * 0.38,
                      userSelect: 'none',
                    }}
                  >
                    {icon}
                  </div>
                );
              })
            )}
          </div>

          {/* Monsters */}
          {MONSTER_POSITIONS.map(pos => {
            const mon = MONSTERS.find(m => m.id === pos.id);
            if (!mon) return null;
            const { left, top } = toScreen(pos.x, pos.y);
            const isDefeated = defeated.has(pos.id);
            return (
              <div
                key={pos.id}
                style={{
                  position: 'absolute',
                  left, top,
                  width: TILE_SIZE, height: TILE_SIZE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: TILE_SIZE * 0.72,
                  zIndex: 5,
                  userSelect: 'none',
                  filter: isDefeated
                    ? 'grayscale(1) opacity(0.35)'
                    : 'drop-shadow(0 0 10px rgba(255,80,80,0.7))',
                  animation: isDefeated ? 'none' : 'mBob 2.2s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              >
                {isDefeated ? '🪦' : mon.emoji}
              </div>
            );
          })}

          {/* Player */}
          <div
            style={{
              position: 'absolute',
              left: toScreen(px, py).left,
              top: toScreen(px, py).top,
              width: TILE_SIZE, height: TILE_SIZE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: TILE_SIZE * 0.78,
              zIndex: 10,
              filter: 'drop-shadow(0 0 12px rgba(120,220,255,0.9))',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            🧙
          </div>
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)' }}
        />
      </div>

      <style>{`
        @keyframes mBob {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  );
}
