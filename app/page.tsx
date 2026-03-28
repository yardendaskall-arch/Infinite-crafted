'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GameBoard from '@/components/GameBoard';
import AdminPanel from '@/components/AdminPanel';
import SettingsPanel from '@/components/SettingsPanel';
import EverythingModal from '@/components/EverythingModal';
import StoryMode from '@/components/StoryMode';
import type { Element } from '@/lib/combinations';
import { BASE_ELEMENTS } from '@/lib/combinations';
import { combine } from '@/lib/gameLogic';
import {
  loadDiscovered, saveDiscovered,
  loadBoard, saveBoard,
  resetGame, genId,
} from '@/lib/storage';
import type { BoardItem } from '@/lib/storage';
import {
  generateUsername, getStoredUsername, storeUsername, registerUser,
} from '@/lib/userService';
import { recordDiscovery } from '@/lib/discoveryService';
import { fetchGifts } from '@/lib/giftService';
import { isSupabaseReady } from '@/lib/supabase';

const SECRET = 'Ihatethisshit1';

export default function Home() {
  const boardRef = useRef<HTMLDivElement>(null);
  const combiningRef = useRef(false);
  const keyBufferRef = useRef('');
  const [discovered, setDiscovered] = useState<Element[]>([]);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [newElements, setNewElements] = useState<Set<string>>(new Set());
  const [flashItem, setFlashItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; emoji: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [inboxCount, setInboxCount] = useState(0);
  const [everythingItem, setEverythingItem] = useState<BoardItem | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);

  // Secret key sequence listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keyBufferRef.current = (keyBufferRef.current + e.key).slice(-SECRET.length);
      if (keyBufferRef.current === SECRET) {
        setAdminOpen(prev => !prev);
        keyBufferRef.current = '';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hydrate game state + init username
  useEffect(() => {
    setDiscovered(loadDiscovered());
    setBoardItems(loadBoard());

    let stored = getStoredUsername();
    if (!stored) {
      stored = generateUsername();
      storeUsername(stored);
    }
    setUsername(stored);
    if (isSupabaseReady) {
      registerUser(stored);
      fetchGifts(stored).then(gifts => setInboxCount(gifts.length));
    }

    setHydrated(true);
  }, []);

  // Refresh inbox count when settings panel closes
  useEffect(() => {
    if (!settingsOpen && username && isSupabaseReady) {
      fetchGifts(username).then(gifts => setInboxCount(gifts.length));
    }
  }, [settingsOpen, username]);

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

    setBoardItems(prev => [
      ...prev.filter(i => i.id !== a.id && i.id !== b.id),
      { id: placeholderId, element: { name: '...', emoji: '✨' }, x: mx, y: my, isLoading: true },
    ]);

    try {
      const discoveredNames = discovered.map(e => e.name);
      const result = await combine(a.element.name, b.element.name, discoveredNames);

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

        if (isSupabaseReady && username) {
          const isWorldFirst = await recordDiscovery(result.result, result.emoji, username);
          if (isWorldFirst) {
            showToast(`🌍 World First! ${result.result}`, result.emoji);
          } else {
            showToast(`New Discovery! ${result.result}`, result.emoji);
          }
        } else {
          showToast(`New Discovery! ${result.result}`, result.emoji);
        }

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
      setBoardItems(prev => prev.filter(i => i.id !== placeholderId));
    } finally {
      setBoardItems(prev => prev.map(i => i.isLoading ? { ...i, isLoading: false } : i));
      combiningRef.current = false;
    }
  }, [discovered, username]);

  const handleReset = useCallback(() => {
    resetGame();
    setDiscovered([...BASE_ELEMENTS]);
    setBoardItems([]);
    setNewElements(new Set());
  }, []);

  const handleAdminAdd = useCallback((el: Element) => {
    setDiscovered(prev => {
      if (prev.find(e => e.name === el.name)) return prev;
      return [...prev, el];
    });
    setNewElements(prev => new Set(Array.from(prev).concat(el.name)));
    showToast(`Added: ${el.name}`, el.emoji);
  }, []);

  const handleBoardItemClick = useCallback((item: BoardItem) => {
    if (item.element.name === 'EVERYTHING') {
      setEverythingItem(item);
    }
  }, []);

  const handleEverythingChoose = useCallback((el: Element) => {
    if (!everythingItem) return;
    setBoardItems(prev => prev.map(i =>
      i.id === everythingItem.id ? { ...i, element: el } : i
    ));
    setEverythingItem(null);
  }, [everythingItem]);

  const handleAdminRemove = useCallback((name: string) => {
    setDiscovered(prev => prev.filter(e => e.name !== name));
    setBoardItems(prev => prev.filter(i => i.element.name !== name));
  }, []);

  const handleUsernameChange = useCallback((newName: string) => {
    setUsername(newName);
  }, []);

  const handleClaimGift = useCallback((element: Element) => {
    setDiscovered(prev => {
      if (prev.find(e => e.name === element.name)) return prev;
      return [...prev, element];
    });
    setNewElements(prev => new Set(Array.from(prev).concat(element.name)));
    showToast(`Gift claimed: ${element.name}`, element.emoji);
    setTimeout(() => {
      setNewElements(prev => {
        const next = new Set(Array.from(prev));
        next.delete(element.name);
        return next;
      });
    }, 8000);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="flex flex-col h-full">
      <Header
        discoveredCount={discovered.length}
        onReset={handleReset}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenStory={() => setStoryOpen(true)}
        inboxCount={inboxCount}
      />
      <div className="flex flex-1 overflow-hidden">
        <div ref={boardRef} className="flex-1 relative">
          <GameBoard
            items={boardItems}
            onItemsChange={setBoardItems}
            onCombine={handleCombine}
            flashItem={flashItem}
            onItemClick={handleBoardItemClick}
          />
        </div>
        <Sidebar
          elements={discovered}
          onSelect={handleSidebarSelect}
          newElements={newElements}
        />
      </div>

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        discovered={discovered}
        onAddElement={handleAdminAdd}
        onRemoveElement={handleAdminRemove}
        username={username}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        username={username}
        onUsernameChange={handleUsernameChange}
        onClaimGift={handleClaimGift}
      />

      <EverythingModal
        open={!!everythingItem}
        discovered={discovered}
        onChoose={handleEverythingChoose}
        onClose={() => setEverythingItem(null)}
      />

      <StoryMode
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        discovered={discovered}
        onNewElement={el => {
          setDiscovered(prev => {
            if (prev.find(e => e.name === el.name)) return prev;
            return [...prev, el];
          });
          setNewElements(prev => new Set(Array.from(prev).concat(el.name)));
          showToast(`New Discovery! ${el.name}`, el.emoji);
          setTimeout(() => {
            setNewElements(prev => { const n = new Set(Array.from(prev)); n.delete(el.name); return n; });
          }, 8000);
        }}
      />

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
