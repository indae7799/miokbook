'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

interface BookEntry {
  title: string;
  isbn: string;
  quantity: number;
}

interface BulkInquiryModalProps {
  triggerClassName?: string;
}

const defaultBook = (): BookEntry => ({ title: '', isbn: '', quantity: 1 });

export default function BulkInquiryModal({ triggerClassName }: BulkInquiryModalProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [books, setBooks] = useState<BookEntry[]>([defaultBook()]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleOpen = () => {
    // 로그인 확인
    if (!authLoading && !user) {
      router.push('/login?redirect=/bulk-order');
      return;
    }
    setOpen(true);
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setOrganization('');
    setContactName('');
    setPhone('');
    setEmail('');
    setDeliveryDate('');
    setBooks([defaultBook()]);
    setNotes('');
    setError('');
    setSuccess(false);
  };

  const handlePhoneInput = (val: string) => {
    setPhone(val.replace(/[^0-9-]/g, ''));
  };

  const addBook = () => {
    setBooks((prev) => [...prev, defaultBook()]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const removeBook = (idx: number) => {
    if (books.length === 1) return;
    setBooks((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBook = (idx: number, field: keyof BookEntry, value: string | number) => {
    setBooks((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const validBooks = books.filter((b) => b.title.trim());
      if (validBooks.length === 0) {
        setError('도서를 최소 1권 이상 입력해 주세요.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/bulk-order/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          contactName,
          phone,
          email,
          deliveryDate,
          books: validBooks,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '문의 접수 중 오류가 발생했습니다.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full h-12 px-4 rounded-lg border border-gray-300 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D3E]/25 focus:border-[#7B2D3E] transition-all bg-white';
  const labelCls = 'block text-[13px] font-bold text-gray-700 mb-1.5';

  return (
    <>
      <button onClick={handleOpen} className={triggerClassName}>
        도서 견적 문의하기
        <ArrowRight className="size-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 backdrop-blur-sm overflow-y-auto py-8 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="relative w-full max-w-[640px] bg-white rounded-2xl shadow-2xl my-auto">

            {/* 헤더 */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200">
              <div>
                <h2 className="font-myeongjo text-xl font-bold text-gray-900 tracking-tight">대량구매 견적 문의</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">영업일 1~2일 내 담당자가 연락드립니다</p>
              </div>
              <button
                onClick={handleClose}
                className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* ⚠️ 담당자 협의 필요 공지 */}
            <div className="mx-7 mt-5 flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-bold text-amber-800 mb-0.5">담당자 협의 필요</p>
                <p className="text-[13px] text-amber-700 leading-relaxed">
                  문의 접수 후 <strong>반드시 담당자와 협의</strong>가 완료되어야 배송이 진행됩니다.<br />
                  견적서·계약서 검토 전 임의로 배송을 요청하실 수 없습니다.
                </p>
              </div>
            </div>

            {success ? (
              <div className="px-7 py-14 text-center">
                <div className="size-16 rounded-full bg-[#7B2D3E]/10 flex items-center justify-center mx-auto mb-5">
                  <svg className="size-8 text-[#7B2D3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-myeongjo text-2xl font-bold text-gray-900 mb-3 tracking-tight">문의가 접수되었습니다</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  담당자가 확인 후 영업일 1~2일 내<br />이메일 또는 전화로 답변드립니다.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-8 inline-flex items-center justify-center px-8 py-3.5 bg-[#7B2D3E] text-white font-bold rounded-full text-[15px] hover:bg-[#6B2435] transition-colors tracking-wide"
                >
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div ref={scrollRef} className="px-7 py-6 space-y-6 max-h-[60vh] overflow-y-auto">

                  {/* 기본 정보 */}
                  <div>
                    <p className="text-[11px] font-black text-[#7B2D3E] uppercase tracking-[0.2em] mb-4">기본 정보</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>
                          기관명 / 학원명 <span className="text-[#7B2D3E]">*</span>
                        </label>
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          required
                          placeholder="예: ○○초등학교, ○○학원"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          담당자 이름 <span className="text-[#7B2D3E]">*</span>
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          required
                          placeholder="홍길동"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          연락처 <span className="text-[#7B2D3E]">*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handlePhoneInput(e.target.value)}
                          required
                          placeholder="010-0000-0000"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          이메일 <span className="text-[#7B2D3E]">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="example@email.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelCls}>
                        납품 희망일 <span className="text-[#7B2D3E]">*</span>
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        required
                        min={new Date().toISOString().slice(0, 10)}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* 도서 목록 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-black text-[#7B2D3E] uppercase tracking-[0.2em]">도서 목록</p>
                      <button
                        type="button"
                        onClick={addBook}
                        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7B2D3E] hover:text-[#5C1F30] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#7B2D3E]/8"
                      >
                        <Plus className="size-3.5" />
                        도서 추가
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="hidden sm:grid grid-cols-[1fr_140px_80px_36px] gap-2 px-0.5">
                        <span className="text-[12px] font-bold text-gray-500">도서명</span>
                        <span className="text-[12px] font-bold text-gray-500">ISBN</span>
                        <span className="text-[12px] font-bold text-gray-500">수량</span>
                        <span />
                      </div>
                      {books.map((book, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_80px_36px] gap-2 items-center p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl sm:rounded-none border sm:border-0 border-gray-100">
                          <input
                            type="text"
                            value={book.title}
                            onChange={(e) => updateBook(idx, 'title', e.target.value)}
                            placeholder="도서명"
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={book.isbn}
                            onChange={(e) => updateBook(idx, 'isbn', e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                            placeholder="9780000000000"
                            maxLength={13}
                            className={`${inputCls} font-mono text-[13px]`}
                          />
                          <input
                            type="number"
                            value={book.quantity}
                            min={1}
                            onChange={(e) => updateBook(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                            className={`${inputCls} text-center`}
                          />
                          <button
                            type="button"
                            onClick={() => removeBook(idx)}
                            disabled={books.length === 1}
                            className="size-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 기타 요청사항 */}
                  <div>
                    <label className={labelCls}>기타 요청사항</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="배송 방법, 특이사항, 예산 한도 등 자유롭게 입력해 주세요."
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D3E]/25 focus:border-[#7B2D3E] resize-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[14px] text-red-700 font-medium">
                      {error}
                    </div>
                  )}
                </div>

                <div className="px-7 py-5 border-t border-gray-200 flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-12 rounded-full border border-gray-300 text-gray-600 font-bold text-[15px] hover:bg-gray-50 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] h-12 rounded-full bg-[#7B2D3E] text-white font-bold text-[15px] hover:bg-[#6B2435] disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wide shadow-lg shadow-[#7B2D3E]/20"
                  >
                    {submitting ? '접수 중...' : '문의 접수하기'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
