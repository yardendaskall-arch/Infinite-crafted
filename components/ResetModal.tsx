'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface ResetModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResetModal({ open, onConfirm, onCancel }: ResetModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0d1117] border border-white/15 rounded-2xl p-6 w-80 shadow-2xl"
          >
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-white font-bold text-lg mb-1">Reset everything?</h2>
            <p className="text-white/50 text-sm mb-6">
              This will clear your board and all discovered elements. You'll start back with just Fire, Water, Earth and Wind.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2 rounded-xl bg-[#e94560] hover:bg-[#c73652] text-white text-sm font-bold transition-colors"
              >
                Reset
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
