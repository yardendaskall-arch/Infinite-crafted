'use client';
import { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoardItem } from '@/lib/storage';
import ElementTile from './ElementTile';

interface GameBoardProps {
  items: BoardItem[];
  onItemsChange: (items: BoardItem[]) => void;
  onCombine: (a: BoardItem, b: BoardItem) => void;
  flashItem: string | null;
  onItemClick?: (item: BoardItem) => void;
}

export default function GameBoard({
  items,
  onItemsChange,
  onCombine,
  flashItem,
  onItemClick,
}: GameBoardProps) {
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    const item = itemsRef.current.find(i => i.id === id);
    if (!item) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragging.current = { id, startX: clientX, startY: clientY, origX: item.x, origY: item.y };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragging.current.startX;
      const dy = clientY - dragging.current.startY;
      const { id, origX, origY } = dragging.current;
      onItemsChange(itemsRef.current.map(i =>
        i.id === id ? { ...i, x: origX + dx, y: origY + dy } : i
      ));
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const { id, startX, startY } = dragging.current;
      const clientX = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
      const moved = Math.abs(clientX - startX) + Math.abs(clientY - startY);
      const released = itemsRef.current.find(i => i.id === id);
      if (released && !released.isLoading) {
        if (moved < 5 && onItemClick) {
          // it's a click, not a drag
          dragging.current = null;
          onItemClick(released);
          return;
        }
        const THRESH = 60;
        const other = itemsRef.current.find(i =>
          i.id !== released.id &&
          !i.isLoading &&
          Math.abs(i.x - released.x) < THRESH &&
          Math.abs(i.y - released.y) < THRESH
        );
        if (other) onCombine(released, other);
      }
      dragging.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [onItemsChange, onCombine]);

  const removeItem = (id: string) => onItemsChange(items.filter(i => i.id !== id));

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0a0a14]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/20">
            <p className="text-4xl mb-3">⚗️</p>
            <p className="text-sm">Click elements in the sidebar to place them here</p>
            <p className="text-xs mt-1">Drag two elements onto each other to combine</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: item.isLoading ? [1, 1.15, 1] : flashItem === item.id ? [1, 1.35, 1] : 1,
              opacity: item.isLoading ? [1, 0.3, 1] : 1,
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              scale: item.isLoading
                ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 400, damping: 22 },
              opacity: item.isLoading
                ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 },
            }}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              cursor: item.isLoading ? 'default' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              pointerEvents: item.isLoading ? 'none' : 'auto',
            }}
            onMouseDown={e => !item.isLoading && startDrag(e, item.id)}
            onTouchStart={e => !item.isLoading && startDrag(e, item.id)}
          >
            <div className="relative group">
              <ElementTile element={item.element} loading={item.isLoading} />
              {!item.isLoading && (
                <button
                  onMouseDown={e => { e.stopPropagation(); removeItem(item.id); }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] hidden group-hover:flex items-center justify-center leading-none hover:bg-red-500 z-10"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
