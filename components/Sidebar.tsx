'use client';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import ElementTile from './ElementTile';

interface SidebarProps {
  elements: Element[];
  onSelect: (el: Element) => void;
  newElements: Set<string>;
}

export default function Sidebar({ elements, onSelect, newElements }: SidebarProps) {
  const [search, setSearch] = useState('');

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
              <ElementTile
                key={el.name}
                element={el}
                onClick={() => onSelect(el)}
                small
                isNew={newElements.has(el.name)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
