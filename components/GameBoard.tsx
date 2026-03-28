'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Element } from '@/lib/combinations';
import type { BoardItem } from '@/lib/storage';
import { genId } from '@/lib/storage';
import ElementTile from './ElementTile';

interface GameBoardProps {
  items: BoardItem[];
  onItemsChange: (items: BoardItem[]) => void;
  onCombine: (a: BoardItem, b: BoardItem) => void;
  combining: boolean;
  combineStatus: string;
  flashItem: string | null;
}

export default function GameBoard({
  items,
  onItemsChange,
  onCombine,
  combining,
  combineStatus,
  flashItem,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragging.current = { id, startX: clientX, startY: clientY, origX: item.x, origY: item.y };

    // Bring to front
    onItemsChange(items.map(i => i.id === id ? { ...i } : i));
  }, [items, onItemsChange]);

  const onMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragging.current.startX;
    const dy = clientY - dragging.current.startY;
    onItemsChange(
      items.map(i =>
        i.id === dragging.current!.id
          ? { ...i, x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }
          : i
      )
    );
  }, [items, onItemsChange]);

  const onMouseUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging.current) return;
    const released = items.find(i => i.id === dragging.current!.id);
    if (released) {
      // Check overlap with another item
      const THRESH = 60;
      const other = items.find(
        i =>
          i.id !== released.id &&
          Math.abs(i.x - released.x) < THRESH &&
          Math.abs(i.y - released.y) < THRESH
      );
      if (other) {
        onCombine(released, other);
      }
    }
    dragging.current = null;
  }, [items, onCombine]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const removeItem = (id: string) => {
    onItemsChange(items.filter(i => i.id !== id));
  };

  return (
    <div
      ref={boardRef}
      className="relative flex-1 overflow-hidden bg-[#0a0a14]"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Empty state */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/20">
            <p className="text-4xl mb-3">⚗️</p>
            <p className="text-sm">Click elements in the sidebar to add them here</p>
            <p className="text-xs mt-1">Drag elements onto each other to combine</p>
          </div>
        </div>
      )}

      {/* Combining overlay */}
      <AnimatePresence>
        {combining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/20 flex items-center gap-2"
          >
            <span className="animate-spin">⚙️</span>
            <span>{combineStatus}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board items */}
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: flashItem === item.id ? [1, 1.3, 1] : 1,
              opacity: 1,
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ position: 'absolute', left: item.x, top: item.y, cursor: 'grab', userSelect: 'none' }}
            onMouseDown={e => startDrag(e, item.id)}
            onTouchStart={e => startDrag(e, item.id)}
          >
            <div className="relative group">
              <ElementTile element={item.element} />
              <button
                onMouseDown={e => { e.stopPropagation(); removeItem(item.id); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] hidden group-hover:flex items-center justify-center leading-none hover:bg-red-500"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
