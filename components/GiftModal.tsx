'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import { sendGift } from '@/lib/giftService';
import { isSupabaseReady } from '@/lib/supabase';

interface GiftModalProps {
  open: boolean;
  element: Element | null;
  fromUsername: string;
  onClose: () => void;
  onSent: () => void;
}

export default function GiftModal({ open, element, fromUsername, onClose, onSent }: GiftModalProps) {
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!element) return;
    setError('');
    const to = recipient.trim();
    if (!to) { setError('Enter a username'); return; }
    setSending(true);
    const { error: err } = await sendGift(fromUsername, to, element.name, element.emoji);
    setSending(false);
    if (err) {
      setError(err);
    } else {
      setRecipient('');
      onSent();
      onClose();
    }
  }

  function handleClose() {
    setRecipient('');
    setError('');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && element && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          <motion.div
            key="modal"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-[#0d1117] border border-white/15 rounded-2xl z-50 p-6 shadow-2xl"
          >
            <h3 className="text-white font-bold text-lg mb-1">Gift Element</h3>
            <p className="text-white/40 text-sm mb-4">Send to another player by username</p>

            {/* Element preview */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
              <span className="text-3xl">{element.emoji}</span>
              <p className="text-white font-medium">{element.name}</p>
            </div>

            {!isSupabaseReady ? (
              <p className="text-yellow-400/70 text-sm">⚠️ Supabase not configured.</p>
            ) : (
              <>
                <input
                  type="text"
                  value={recipient}
                  onChange={e => { setRecipient(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Recipient username..."
                  autoFocus
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e94560]/60 mb-2"
                />
                {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSend}
                    disabled={sending || !recipient.trim()}
                    className="flex-1 py-2 rounded-lg bg-[#e94560] text-white text-sm font-medium disabled:opacity-40"
                  >
                    {sending ? 'Sending...' : 'Send 🎁'}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
