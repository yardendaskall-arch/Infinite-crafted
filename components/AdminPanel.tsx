'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  discovered: Element[];
  onAddElement: (el: Element) => void;
  onRemoveElement: (name: string) => void;
}

const BASE_NAMES = ['Fire', 'Water', 'Earth', 'Wind'];

export default function AdminPanel({ open, onClose, discovered, onAddElement, onRemoveElement }: AdminPanelProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    if (discovered.find(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Element already exists.'); return;
    }
    onAddElement({ name: trimmed, emoji: emoji.trim() || '\u2728' });
    setName('');
    setEmoji('');
    setError('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0d1117] border border-white/15 rounded-2xl w-[480px] max-h-[80vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">🛠️ Admin Panel</h2>
                <p className="text-white/40 text-xs mt-0.5">Manually add elements to the game</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Add form */}
            <div className="p-5 border-b border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Add Element</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Emoji (optional)"
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  className="w-24 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                />
                <input
                  type="text"
                  placeholder="Element name"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                />
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 rounded-lg bg-[#e94560] hover:bg-[#c73652] text-white text-sm font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            {/* Elements list */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">
                All Elements ({discovered.length})
              </p>
              <div className="flex flex-col gap-1">
                {discovered.map(el => (
                  <div
                    key={el.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 group"
                  >
                    <span className="text-white text-sm">
                      <span className="mr-2">{el.emoji}</span>{el.name}
                    </span>
                    {!BASE_NAMES.includes(el.name) && (
                      <button
                        onClick={() => onRemoveElement(el.name)}
                        className="text-white/20 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
