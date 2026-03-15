import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  isbn: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (isbn: string, quantity?: number) => void;
  removeItem: (isbn: string) => void;
  updateQuantity: (isbn: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (isbn, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.isbn === isbn);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.isbn === isbn ? { ...i, quantity: Math.min(10, i.quantity + quantity) } : i
              ),
            };
          }
          return { items: [...state.items, { isbn, quantity: Math.min(10, quantity) }] };
        });
      },

      removeItem: (isbn) => {
        set((state) => ({
          items: state.items.filter((i) => i.isbn !== isbn),
        }));
      },

      updateQuantity: (isbn, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.isbn === isbn ? { ...i, quantity: Math.min(10, quantity) } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: 'bookstore-cart', skipHydration: true }
  )
);
