'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CartAddedModalProps {
  open: boolean;
  onClose: () => void;
  bookTitle: string;
}

export default function CartAddedModal({ open, onClose, bookTitle }: CartAddedModalProps) {
  const router = useRouter();

  function goToCart() {
    onClose();
    router.push('/cart');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-center mb-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </span>
          </div>
          <DialogTitle className="text-center text-base">장바구니에 담겼습니다</DialogTitle>
          <p className="text-center text-sm text-muted-foreground line-clamp-1 px-2">
            {bookTitle}
          </p>
        </DialogHeader>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button className="flex-1" onClick={goToCart}>
            장바구니 보기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
