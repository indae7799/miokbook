'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useCartStore, type CartItem } from '@/store/cart.store';
import { queryKeys } from '@/lib/queryKeys';
import {
  DEFAULT_STORE_SETTINGS,
  calculateShippingFee as calculateShippingFeeBySettings,
  type StoreSettings,
} from '@/lib/store-settings';

export interface CartBook {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
}

export interface EnrichedCartItem extends CartItem {
  book: CartBook | null;
  lineTotal: number;
  /** true = 아직 fetch 중 / false = fetch 완료 (book이 null이면 DB에 없는 상품) */
  isLoading: boolean;
}

async function fetchBookByIsbn(isbn: string): Promise<CartBook | null> {
  const res = await fetch(`/api/books/${encodeURIComponent(isbn)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return {
    isbn: data.isbn,
    slug: data.slug,
    title: data.title,
    author: data.author,
    coverImage: data.coverImage,
    listPrice: data.listPrice,
    salePrice: data.salePrice,
  };
}

async function fetchStoreSettings(): Promise<StoreSettings> {
  const res = await fetch('/api/store/settings');
  if (!res.ok) return DEFAULT_STORE_SETTINGS;
  return res.json();
}

export function useCart(isDirectPurchase: boolean = false) {
  const storeItems = useCartStore((s) => s.items);
  const directItem = useCartStore((s) => s.directPurchaseItem);
  
  const items = isDirectPurchase && directItem ? [directItem] : storeItems;

  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const { data: settings = DEFAULT_STORE_SETTINGS } = useQuery({
    queryKey: queryKeys.store.settings(),
    queryFn: fetchStoreSettings,
    staleTime: 5 * 60 * 1000,
  });

  const bookQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: queryKeys.books.byIsbn(item.isbn),
      queryFn: () => fetchBookByIsbn(item.isbn),
      staleTime: 60 * 1000,
    })),
  });

  const enrichedItems: EnrichedCartItem[] = items.map((item, index) => {
    const q = bookQueries[index];
    const isLoading = !q || q.isPending || q.fetchStatus === 'fetching';
    const book = q?.data ?? null;
    const unitPrice = book?.salePrice ?? 0;
    const lineTotal = item.quantity * unitPrice;
    return { ...item, book, lineTotal, isLoading };
  });

  const totalPrice = enrichedItems.reduce((sum, row) => sum + row.lineTotal, 0);
  const shippingFee = calculateShippingFeeBySettings(totalPrice, settings);
  const amountUntilFreeShipping =
    totalPrice > 0 && totalPrice < settings.freeShippingThreshold
      ? settings.freeShippingThreshold - totalPrice
      : 0;

  return {
    items,
    enrichedItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    settings,
    totalPrice,
    shippingFee,
    amountUntilFreeShipping,
  };
}
