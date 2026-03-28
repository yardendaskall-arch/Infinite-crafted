'use client';
import { motion } from 'framer-motion';
import type { Element } from '@/lib/combinations';

interface ElementTileProps {
  element: Element;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  isNew?: boolean;
  loading?: boolean;
}

export default function ElementTile({
  element,
  onClick,
  selected,
  small,
  isNew,
  loading,
}: ElementTileProps) {
  return (
    <motion.button
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={!loading ? { scale: small ? 1.05 : 1.08, y: -2 } : {}}
      whileTap={!loading ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onClick}
      className={[
        'relative flex items-center gap-1.5 rounded-xl font-medium select-none cursor-pointer transition-colors',
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        selected
          ? 'bg-[#e94560] text-white shadow-lg shadow-[#e94560]/40 ring-2 ring-[#e94560]'
          : loading
          ? 'bg-white/5 text-white/50 border border-white/10 cursor-default'
          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
        isNew && !selected ? 'ring-2 ring-yellow-400/60' : '',
      ].join(' ')}
    >
      <span className={small ? 'text-sm' : 'text-base'}>{element.emoji}</span>
      <span className="truncate max-w-[120px]">{element.name}</span>
      {isNew && (
        <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-[9px] font-bold px-1 rounded-full leading-none py-0.5">
          NEW
        </span>
      )}
    </motion.button>
  );
}
