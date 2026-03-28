'use client';
import { motion } from 'framer-motion';

interface HeaderProps {
  discoveredCount: number;
  onReset: () => void;
}

export default function Header({ discoveredCount, onReset }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#0d1117] border-b border-white/10 z-10">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚗️</span>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Infinite <span className="text-[#e94560]">Crafted</span>
        </h1>
        <span className="text-xs text-white/40 ml-2 hidden sm:block">Neural Edition</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-white/60">
          <span className="text-white font-semibold">{discoveredCount}</span> discovered
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          Reset
        </motion.button>
      </div>
    </header>
  );
}
