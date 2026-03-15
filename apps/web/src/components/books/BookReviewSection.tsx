'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

export interface ReviewItem {
  reviewId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: string | null;
}

async function fetchReviews(isbn: string): Promise<ReviewItem[]> {
  const res = await fetch(`/api/books/${isbn}/reviews`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export interface BookReviewSectionProps {
  isbn: string;
}

export default function BookReviewSection({ isbn }: BookReviewSectionProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: queryKeys.books.reviews(isbn),
    queryFn: () => fetchReviews(isbn),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { rating: number; content: string }) => {
      const token = await user!.getIdToken();
      const res = await fetch('/api/review/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookIsbn: isbn, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '리뷰 작성에 실패했습니다.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.books.reviews(isbn) });
      setContent('');
      setRating(5);
      toast.success('리뷰가 등록되었습니다.');
    },
    onError: (err: Error) => {
      const msg = err.message;
      if (msg.includes('PURCHASE_REQUIRED')) toast.error('해당 도서를 구매한 회원만 리뷰를 작성할 수 있습니다.');
      else if (msg.includes('ALREADY_REVIEWED')) toast.error('이미 리뷰를 작성하셨습니다.');
      else toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('로그인 후 리뷰를 작성할 수 있습니다.');
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      toast.error('리뷰는 10자 이상 입력해 주세요.');
      return;
    }
    if (trimmed.length > 1000) {
      toast.error('리뷰는 1000자 이내로 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    createMutation.mutate(
      { rating, content: trimmed },
      { onSettled: () => setSubmitting(false) }
    );
  };

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <h2 className="text-lg font-semibold mb-4">리뷰 ({reviews.length})</h2>

      {user && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3">
          <div>
            <label className="text-sm font-medium">별점</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 block w-full max-w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}점
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">리뷰 내용 (10자 이상)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="구매 후기를 남겨 주세요."
              rows={4}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[48px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/1000</p>
          </div>
          <Button type="submit" disabled={submitting || content.trim().length < 10}>
            {submitting ? '등록 중…' : '리뷰 등록'}
          </Button>
        </form>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground mb-4">로그인 후 리뷰를 작성할 수 있습니다.</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">리뷰를 불러오는 중…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 리뷰가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.reviewId} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{r.userName}</span>
                <span className="text-sm text-muted-foreground">★ {r.rating}</span>
                {r.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
