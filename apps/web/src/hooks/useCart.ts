'use client';

import { useQueries } from '@tanstack/react-query';
import { useCartStore, type CartItem } from '@/store/cart.store';
import { queryKeys } from '@/lib/queryKeys';

const SHIPPING_FEE = 3000;
const SHIPPING_FREE_THRESHOLD = 15000;

function calculateShippingFee(total: number): number {
  return total >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;
}

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
}

async function fetchBookByIsbn(isbn: string): Promise<CartBook | null> {
  const res = await fetch(`/api/books/${encodeURIComponent(isbn)}`);
  if (!res.ok) return null;
  const data = await res.json();
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

export function useCart(isDirectPurchase: boolean = false) {
  const storeItems = useCartStore((s) => s.items);
  const directItem = useCartStore((s) => s.directPurchaseItem);
  
  const items = isDirectPurchase && directItem ? [directItem] : storeItems;

  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const bookQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: queryKeys.books.byIsbn(item.isbn),
      queryFn: () => fetchBookByIsbn(item.isbn),
      staleTime: 60 * 1000,
    })),
  });

  const enrichedItems: EnrichedCartItem[] = items.map((item, index) => {
    const book = bookQueries[index]?.data ?? null;
    const unitPrice = book?.salePrice ?? 0;
    const lineTotal = item.quantity * unitPrice;
    return {
      ...item,
      book,
      lineTotal,
    };
  });

  const totalPrice = enrichedItems.reduce((sum, row) => sum + row.lineTotal, 0);
  const shippingFee = calculateShippingFee(totalPrice);
  const amountUntilFreeShipping =
    totalPrice > 0 && totalPrice < SHIPPING_FREE_THRESHOLD ? SHIPPING_FREE_THRESHOLD - totalPrice : 0;

  return {
    items,
    enrichedItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalPrice,
    shippingFee,
    amountUntilFreeShipping,
  };
}
