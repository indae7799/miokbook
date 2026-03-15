import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));
