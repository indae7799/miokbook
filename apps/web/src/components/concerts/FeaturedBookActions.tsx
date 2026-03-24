'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { trackAddToCart } from '@/lib/gtag';

interface Props {
  isbn: string;
  title: string;
  price: number;
}

export default function FeaturedBookActions({ isbn, title, price }: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const setDirectPurchase = useCartStore((s) => s.setDirectPurchase);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-none"
        onClick={() => {
          addItem(isbn, 1);
          trackAddToCart({
            value: price,
            items: [{ item_id: isbn, item_name: title, price, quantity: 1 }],
          });
        }}
      >
        장바구니
      </Button>
      <Button
        type="button"
        className="h-11 rounded-none bg-[#4A1728] text-white hover:bg-[#3a1120]"
        onClick={() => {
          setDirectPurchase(isbn, 1);
          router.push('/checkout?mode=direct');
        }}
      >
        바로구매
      </Button>
    </div>
  );
}
