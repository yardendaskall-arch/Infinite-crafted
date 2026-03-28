'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import ElementTile from './ElementTile';
import { isSupabaseReady } from '@/lib/supabase';

interface SidebarProps {
  elements: Element[];
  onSelect: (el: Element) => void;
  newElements: Set<string>;
  onGift?: (el: Element) => void;
}

export default function Sidebar({ elements, onSelect, newElements, onGift }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const filtered = elements.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0d1117] border-l border-white/10 flex flex-col h-full">
      <div className="p-3 border-b border-white/10">
        <input
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-white/30 text-xs mb-2">
          {elements.length} element{elements.length !== 1 ? 's' : ''} · click to add to board
        </p>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence>
            {filtered.map(el => (
              <div
                key={el.name}
                className="relative"
                onMouseEnter={() => setHoveredName(el.name)}
                onMouseLeave={() => setHoveredName(null)}
              >
                <ElementTile
                  element={el}
                  onClick={() => onSelect(el)}
                  small
                  isNew={newElements.has(el.name)}
                />
                {isSupabaseReady && onGift && hoveredName === el.name && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={e => { e.stopPropagation(); onGift(el); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#e94560] rounded-full text-white text-xs flex items-center justify-center shadow-lg z-10 hover:bg-[#ff6b82] transition-colors"
                    title="Gift to player"
                  >
                    🎁
                  </motion.button>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
