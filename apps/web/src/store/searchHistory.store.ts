import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT = 10;

interface SearchHistoryState {
  recentKeywords: string[];
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  clearHistory: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      recentKeywords: [],
      addKeyword: (keyword) => {
        const trimmed = keyword.trim();
        if (!trimmed) return;
        set((s) => {
          const filtered = s.recentKeywords.filter((k) => k !== trimmed);
          const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
          return { recentKeywords: next };
        });
      },
      removeKeyword: (keyword) =>
        set((s) => ({
          recentKeywords: s.recentKeywords.filter((k) => k !== keyword),
        })),
      clearHistory: () => set({ recentKeywords: [] }),
    }),
    { name: 'bookstore-search-history', skipHydration: true }
  )
);
