'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GameBoard from '@/components/GameBoard';
import type { Element } from '@/lib/combinations';
import { BASE_ELEMENTS } from '@/lib/combinations';
import { combine } from '@/lib/gameLogic';
import {
  loadDiscovered, saveDiscovered,
  loadBoard, saveBoard,
  resetGame, genId,
} from '@/lib/storage';
import type { BoardItem } from '@/lib/storage';

export default function Home() {
  const boardRef = useRef<HTMLDivElement>(null);
  const combiningRef = useRef(false);
  const [discovered, setDiscovered] = useState<Element[]>([]);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [newElements, setNewElements] = useState<Set<string>>(new Set());
  const [flashItem, setFlashItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; emoji: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDiscovered(loadDiscovered());
    setBoardItems(loadBoard());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDiscovered(discovered);
  }, [discovered, hydrated]);

  useEffect(() => {
    if (hydrated) saveBoard(boardItems);
  }, [boardItems, hydrated]);

  const showToast = (msg: string, emoji: string) => {
    setToast({ msg, emoji });
    setTimeout(() => setToast(null), 3000);
  };

  const addToBoard = useCallback((el: Element) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 600;
    const h = rect?.height ?? 400;
    const x = Math.random() * Math.max(w - 180, 80) + 20;
    const y = Math.random() * Math.max(h - 80, 80) + 20;
    setBoardItems(prev => [...prev, { id: genId(), element: el, x, y }]);
  }, []);

  const handleSidebarSelect = useCallback((el: Element) => {
    addToBoard(el);
  }, [addToBoard]);

  const handleCombine = useCallback(async (a: BoardItem, b: BoardItem) => {
    if (combiningRef.current) return;
    combiningRef.current = true;

    const placeholderId = genId();
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    // Remove source items, add loading placeholder
    setBoardItems(prev => [
      ...prev.filter(i => i.id !== a.id && i.id !== b.id),
      { id: placeholderId, element: { name: '...', emoji: '\u2728' }, x: mx, y: my, isLoading: true },
    ]);

    try {
      const discoveredNames = discovered.map(e => e.name);
      const result = await combine(a.element.name, b.element.name, discoveredNames);

      // Update placeholder IN-PLACE (same id/key) so framer-motion
      // transitions smoothly instead of fighting an exit animation
      setBoardItems(prev => prev.map(i =>
        i.id === placeholderId
          ? { ...i, element: { name: result.result, emoji: result.emoji }, isLoading: false }
          : i
      ));

      setFlashItem(placeholderId);
      setTimeout(() => setFlashItem(null), 600);

      if (result.isNew) {
        setDiscovered(prev => {
          if (prev.find(e => e.name === result.result)) return prev;
          return [...prev, { name: result.result, emoji: result.emoji }];
        });
        setNewElements(prev => new Set(Array.from(prev).concat(result.result)));
        showToast(`New Discovery! ${result.result}`, result.emoji);
        setTimeout(() => {
          setNewElements(prev => {
            const next = new Set(Array.from(prev));
            next.delete(result.result);
            return next;
          });
        }, 8000);
      }
    } catch (err) {
      console.error(err);
      // Remove placeholder on error
      setBoardItems(prev => prev.filter(i => i.id !== placeholderId));
    } finally {
      // Ensure no loading items linger
      setBoardItems(prev => prev.map(i => i.isLoading ? { ...i, isLoading: false } : i));
      combiningRef.current = false;
    }
  }, [discovered]);

  const handleReset = useCallback(() => {
    resetGame();
    setDiscovered([...BASE_ELEMENTS]);
    setBoardItems([]);
    setNewElements(new Set());
  }, []);

  if (!hydrated) return null;

  return (
    <div className="flex flex-col h-full">
      <Header discoveredCount={discovered.length} onReset={handleReset} />
      <div className="flex flex-1 overflow-hidden">
        <div ref={boardRef} className="flex-1 relative">
          <GameBoard
            items={boardItems}
            onItemsChange={setBoardItems}
            onCombine={handleCombine}
            flashItem={flashItem}
          />
        </div>
        <Sidebar
          elements={discovered}
          onSelect={handleSidebarSelect}
          newElements={newElements}
        />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-white/20 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm"
          >
            <span className="text-2xl">{toast.emoji}</span>
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
