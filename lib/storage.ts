import type { Element } from './combinations';
import { BASE_ELEMENTS } from './combinations';

const DISCOVERED_KEY = 'ic_discovered';
const BOARD_KEY = 'ic_board';

export interface BoardItem {
  id: string;
  element: Element;
  x: number;
  y: number;
}

export function loadDiscovered(): Element[] {
  if (typeof window === 'undefined') return BASE_ELEMENTS;
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    if (!raw) return [...BASE_ELEMENTS];
    return JSON.parse(raw);
  } catch {
    return [...BASE_ELEMENTS];
  }
}

export function saveDiscovered(elements: Element[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISCOVERED_KEY, JSON.stringify(elements));
}

export function loadBoard(): BoardItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBoard(items: BoardItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOARD_KEY, JSON.stringify(items));
}

export function resetGame(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISCOVERED_KEY);
  localStorage.removeItem(BOARD_KEY);
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
