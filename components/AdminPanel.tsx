'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import { sendGift } from '@/lib/giftService';
import { isSupabaseReady } from '@/lib/supabase';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  discovered: Element[];
  onAddElement: (el: Element) => void;
  onRemoveElement: (name: string) => void;
  username: string;
}

const BASE_NAMES = ['Fire', 'Water', 'Earth', 'Wind'];

type Tab = 'elements' | 'gift';

export default function AdminPanel({ open, onClose, discovered, onAddElement, onRemoveElement, username }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('elements');

  // Add element state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [addError, setAddError] = useState('');

  // Gift state
  const [giftName, setGiftName] = useState('');
  const [giftEmoji, setGiftEmoji] = useState('');
  const [giftTo, setGiftTo] = useState('');
  const [giftError, setGiftError] = useState('');
  const [giftSuccess, setGiftSuccess] = useState('');
  const [sending, setSending] = useState(false);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setAddError('Name is required.'); return; }
    if (discovered.find(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('Element already exists.'); return;
    }
    onAddElement({ name: trimmed, emoji: emoji.trim() || '✨' });
    setName('');
    setEmoji('');
    setAddError('');
  };

  const handleGift = async () => {
    setGiftError('');
    setGiftSuccess('');
    const eName = giftName.trim();
    const eTo = giftTo.trim();
    if (!eName) { setGiftError('Element name is required.'); return; }
    if (!eTo) { setGiftError('Recipient username is required.'); return; }
    setSending(true);
    const { error } = await sendGift(username, eTo, eName, giftEmoji.trim() || '✨');
    setSending(false);
    if (error) {
      setGiftError(error);
    } else {
      setGiftSuccess(`Sent "${eName}" to ${eTo}!`);
      setGiftName('');
      setGiftEmoji('');
      setGiftTo('');
      setTimeout(() => setGiftSuccess(''), 3000);
    }
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
                <p className="text-white/40 text-xs mt-0.5">Manage elements and gift to players</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {(['elements', 'gift'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors relative ${
                    tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t === 'elements' ? '🧪 Elements' : '🎁 Gift to Player'}
                  {tab === t && (
                    <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e94560]" />
                  )}
                </button>
              ))}
            </div>

            {tab === 'elements' && (
              <>
                {/* Add element form */}
                <div className="p-5 border-b border-white/10">
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Add Element</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Emoji"
                      value={emoji}
                      onChange={e => setEmoji(e.target.value)}
                      className="w-20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                    />
                    <input
                      type="text"
                      placeholder="Element name"
                      value={name}
                      onChange={e => { setName(e.target.value); setAddError(''); }}
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
                  {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
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
              </>
            )}

            {tab === 'gift' && (
              <div className="p-5 flex-1 overflow-y-auto">
                <p className="text-white/40 text-sm mb-5">Create any element and send it directly to a player's inbox.</p>

                {!isSupabaseReady ? (
                  <p className="text-yellow-400/70 text-sm">⚠️ Supabase not configured.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1.5">Element</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Emoji"
                          value={giftEmoji}
                          onChange={e => setGiftEmoji(e.target.value)}
                          className="w-20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                        />
                        <input
                          type="text"
                          placeholder="Element name"
                          value={giftName}
                          onChange={e => { setGiftName(e.target.value); setGiftError(''); }}
                          className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1.5">Recipient</p>
                      <input
                        type="text"
                        placeholder="Recipient's username..."
                        value={giftTo}
                        onChange={e => { setGiftTo(e.target.value); setGiftError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleGift()}
                        className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60"
                      />
                    </div>

                    {giftError && <p className="text-red-400 text-xs">{giftError}</p>}
                    {giftSuccess && <p className="text-green-400 text-xs">{giftSuccess}</p>}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGift}
                      disabled={sending || !giftName.trim() || !giftTo.trim()}
                      className="w-full py-2.5 rounded-lg bg-[#e94560] text-white text-sm font-semibold disabled:opacity-40 transition-opacity mt-1"
                    >
                      {sending ? 'Sending...' : 'Send Gift 🎁'}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
