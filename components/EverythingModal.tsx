'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';

interface EverythingModalProps {
  open: boolean;
  discovered: Element[];
  onChoose: (el: Element) => void;
  onClose: () => void;
}

export default function EverythingModal({ open, discovered, onChoose, onClose }: EverythingModalProps) {
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');

  const filtered = discovered.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleChoose(el: Element) {
    setSearch('');
    setCustomName('');
    setCustomEmoji('');
    onChoose(el);
  }

  function handleCustom() {
    const name = customName.trim();
    if (!name) return;
    handleChoose({ name, emoji: customEmoji.trim() || '✨' });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            key="modal"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-h-[70vh] bg-[#0d1117] border border-white/15 rounded-2xl z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-bold text-lg">🤯🤯🤯 EVERYTHING</h3>
              <p className="text-white/40 text-sm mt-0.5">What do you want this to become?</p>
            </div>

            <div className="p-4 border-b border-white/10 space-y-2">
              <input
                type="text"
                placeholder="Search discovered elements..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Emoji"
                  value={customEmoji}
                  onChange={e => setCustomEmoji(e.target.value)}
                  className="w-20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                />
                <input
                  type="text"
                  placeholder="Or type any element name..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustom()}
                  className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                />
                <button
                  onClick={handleCustom}
                  disabled={!customName.trim()}
                  className="px-3 py-2 rounded-lg bg-[#e94560] text-white text-sm font-semibold disabled:opacity-30"
                >
                  Use
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-1.5">
                {filtered.map(el => (
                  <motion.button
                    key={el.name}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleChoose(el)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-[#e94560]/50 text-white text-sm transition-colors"
                  >
                    <span>{el.emoji}</span>
                    <span>{el.name}</span>
                  </motion.button>
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="text-white/30 text-sm text-center py-6">No elements match</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
