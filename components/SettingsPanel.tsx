'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import type { Gift } from '@/lib/giftService';
import { changeUsername } from '@/lib/userService';
import { fetchGifts, claimGift, claimAllGifts } from '@/lib/giftService';
import { isSupabaseReady } from '@/lib/supabase';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  username: string;
  onUsernameChange: (newUsername: string) => void;
  onClaimGift: (element: Element) => void;
}

export default function SettingsPanel({ open, onClose, username, onUsernameChange, onClaimGift }: SettingsPanelProps) {
  const [tab, setTab] = useState<'profile' | 'inbox'>('profile');
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && tab === 'inbox') {
      loadGifts();
    }
  }, [open, tab, username]);

  async function loadGifts() {
    setLoadingGifts(true);
    const data = await fetchGifts(username);
    setGifts(data);
    setLoadingGifts(false);
  }

  async function handleSaveUsername() {
    setUsernameError('');
    setUsernameSuccess('');
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await changeUsername(username, trimmed);
    setSaving(false);
    if (error) {
      setUsernameError(error);
    } else {
      onUsernameChange(trimmed);
      setNewUsername('');
      setUsernameSuccess('Username updated!');
      setTimeout(() => setUsernameSuccess(''), 3000);
    }
  }

  async function handleClaim(gift: Gift) {
    setClaimingId(gift.id);
    await claimGift(gift.id);
    onClaimGift({ name: gift.element_name, emoji: gift.element_emoji });
    setGifts(prev => prev.filter(g => g.id !== gift.id));
    setClaimingId(null);
  }

  async function handleClaimAll() {
    await claimAllGifts(username);
    gifts.forEach(g => onClaimGift({ name: g.element_name, emoji: g.element_emoji }));
    setGifts([]);
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
            className="fixed inset-0 bg-black/60 z-40"
          />
          <motion.div
            key="panel"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-[#0d1117] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-bold text-lg">Settings</h2>
              <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {(['profile', 'inbox'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors relative ${
                    tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t === 'inbox' && gifts.length > 0 && (
                    <span className="absolute top-1.5 right-4 bg-[#e94560] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {gifts.length}
                    </span>
                  )}
                  {t}
                  {tab === t && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e94560]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your Username</p>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-mono text-sm">{username}</p>
                    </div>
                    {!isSupabaseReady && (
                      <p className="text-yellow-400/70 text-xs mt-2">⚠️ Supabase not configured — username is local only</p>
                    )}
                  </div>

                  {isSupabaseReady && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Change Username</p>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={e => { setNewUsername(e.target.value); setUsernameError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                        placeholder="New username..."
                        className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60 mb-2"
                      />
                      {usernameError && <p className="text-red-400 text-xs mb-2">{usernameError}</p>}
                      {usernameSuccess && <p className="text-green-400 text-xs mb-2">{usernameSuccess}</p>}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveUsername}
                        disabled={saving || !newUsername.trim()}
                        className="w-full py-2 rounded-lg bg-[#e94560] text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                      >
                        {saving ? 'Saving...' : 'Save Username'}
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'inbox' && (
                <div>
                  {!isSupabaseReady ? (
                    <p className="text-white/40 text-sm">Supabase not configured.</p>
                  ) : loadingGifts ? (
                    <p className="text-white/40 text-sm">Loading gifts...</p>
                  ) : gifts.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-4xl mb-3">🎁</p>
                      <p className="text-white/40 text-sm">No gifts yet!</p>
                      <p className="text-white/25 text-xs mt-1">Ask friends to gift you elements.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white/60 text-xs">{gifts.length} gift{gifts.length !== 1 ? 's' : ''}</p>
                        <button
                          onClick={handleClaimAll}
                          className="text-[#e94560] text-xs hover:underline"
                        >
                          Claim all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {gifts.map(gift => (
                          <motion.div
                            key={gift.id}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
                          >
                            <span className="text-2xl">{gift.element_emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{gift.element_name}</p>
                              <p className="text-white/30 text-xs truncate">from {gift.from_username}</p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleClaim(gift)}
                              disabled={claimingId === gift.id}
                              className="px-2.5 py-1 bg-[#e94560] text-white text-xs rounded-lg disabled:opacity-50"
                            >
                              {claimingId === gift.id ? '...' : 'Claim'}
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
