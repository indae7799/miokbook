'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

interface BookEntry {
  title: string;
  isbn: string;
  quantity: number;
}

interface Suggestion {
  isbn: string;
  title: string;
  author: string;
  coverImage: string;
}

interface SearchState {
  results: Suggestion[];
  open: boolean;
}

interface MemberProfile {
  displayName: string;
  email: string;
  phone: string;
  organization?: string;
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
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [books, setBooks] = useState<BookEntry[]>([defaultBook()]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // 도서 검색 상태 (index별)
  const [searchStates, setSearchStates] = useState<Record<number, SearchState>>({});
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  // 로그인 이메일 자동 입력
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json() as Partial<MemberProfile>;
        if (cancelled) return;

        setProfile({
          displayName: typeof data.displayName === 'string' ? data.displayName : (user.displayName ?? ''),
          email: typeof data.email === 'string' ? data.email : (user.email ?? ''),
          phone: typeof data.phone === 'string' ? data.phone : (user.phoneNumber ?? ''),
          organization: typeof data.organization === 'string' ? data.organization : '',
        });
      } catch {
        if (cancelled) return;
        setProfile({
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          phone: user.phoneNumber ?? '',
          organization: '',
        });
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!profile) return;

    setOrganization((prev) => prev || profile.organization || '');
    setContactName((prev) => prev || profile.displayName || '');
    setPhone((prev) => prev || profile.phone || '');
    setEmail((prev) => prev || profile.email || '');
  }, [profile]);

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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([idx, ref]) => {
        if (ref && !ref.contains(e.target as Node)) {
          setSearchStates((prev) => ({
            ...prev,
            [Number(idx)]: { ...prev[Number(idx)], open: false },
          }));
        }
      });
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
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
    setOrganization(profile?.organization ?? '');
    setContactName(profile?.displayName ?? '');
    setPhone(profile?.phone ?? '');
    setEmail(profile?.email ?? user?.email ?? '');
    setDeliveryDate('');
    setBooks([defaultBook()]);
    setNotes('');
    setError('');
    setSuccess(false);
    setSearchStates({});
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
    setSearchStates((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateBook = (idx: number, field: keyof BookEntry, value: string | number) => {
    setBooks((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b))
    );
  };

  // 도서명 검색 autocomplete
  const searchBooks = useCallback(async (idx: number, keyword: string) => {
    if (!keyword.trim()) {
      setSearchStates((prev) => ({ ...prev, [idx]: { results: [], open: false } }));
      return;
    }
    try {
      const res = await fetch(`/api/search?autocomplete=true&keyword=${encodeURIComponent(keyword)}`);
      if (!res.ok) return;
      const data = await res.json();
      const suggestions: Suggestion[] = (data?.data?.suggestions ?? []).map((s: Suggestion) => ({
        isbn: s.isbn,
        title: s.title,
        author: s.author,
        coverImage: s.coverImage,
      }));
      setSearchStates((prev) => ({ ...prev, [idx]: { results: suggestions, open: suggestions.length > 0 } }));
    } catch {
      // silent
    }
  }, []);

  const handleTitleChange = (idx: number, value: string) => {
    updateBook(idx, 'title', value);
    clearTimeout(debounceTimers.current[idx]);
    debounceTimers.current[idx] = setTimeout(() => {
      void searchBooks(idx, value);
    }, 150);
  };

  const selectSuggestion = (idx: number, suggestion: Suggestion) => {
    setBooks((prev) =>
      prev.map((b, i) =>
        i === idx ? { ...b, title: suggestion.title, isbn: suggestion.isbn } : b
      )
    );
    setSearchStates((prev) => ({ ...prev, [idx]: { results: [], open: false } }));
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
  const labelCls = 'block text-[14px] font-bold text-gray-800 mb-2';

  return (
    <>
      <button onClick={handleOpen} className={triggerClassName}>
        도서 견적 문의하기
        <ArrowRight className="size-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden overscroll-none bg-black/55 px-0 py-0 backdrop-blur-sm sm:items-start sm:px-4 sm:py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="relative flex h-[100dvh] w-full max-w-[640px] flex-col overflow-x-hidden overflow-y-hidden bg-white shadow-2xl touch-pan-y sm:my-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl">

            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-7 py-5">
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

            {/* 담당자 협의 필요 공지 */}
            <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:mx-7 sm:mt-5">
              <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="mb-0.5 text-[14px] font-bold leading-tight text-amber-800">
                  <span className="sm:hidden">
                    담당자 협의
                    <br />
                    필요
                  </span>
                  <span className="hidden sm:inline">담당자 협의 필요</span>
                </p>
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
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
                <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 space-y-7 overscroll-contain touch-pan-y sm:px-7 sm:py-6">

                  {/* 기본 정보 */}
                  <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 pb-5 pt-1 backdrop-blur supports-[backdrop-filter]:bg-white/88 sm:static sm:border-b-0 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-0">
                    <p className="text-[13px] font-black text-[#7B2D3E] uppercase tracking-[0.2em] mb-5">기본 정보</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    <div className="mt-5">
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
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[13px] font-black text-[#7B2D3E] uppercase tracking-[0.2em]">도서 목록</p>
                      <button
                        type="button"
                        onClick={addBook}
                        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7B2D3E] hover:text-[#5C1F30] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#7B2D3E]/8"
                      >
                        <Plus className="size-3.5" />
                        도서 추가
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="hidden sm:grid grid-cols-[1fr_140px_80px_36px] gap-2 px-0.5">
                        <span className="text-[13px] font-bold text-gray-500">도서명</span>
                        <span className="text-[13px] font-bold text-gray-500">ISBN</span>
                        <span className="text-[13px] font-bold text-gray-500">수량</span>
                        <span />
                      </div>

                      {books.map((book, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-3 items-start rounded-xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[1fr_140px_80px_36px] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
                        >
                          {/* 도서명 검색 */}
                          <div
                            className="relative"
                            ref={(el) => { dropdownRefs.current[idx] = el; }}
                          >
                            <label className="mb-2 block text-[12px] font-bold text-gray-500 sm:hidden">
                              도서 검색
                            </label>
                            <input
                              type="text"
                              value={book.title}
                              onChange={(e) => handleTitleChange(idx, e.target.value)}
                              onFocus={() => {
                                if (searchStates[idx]?.results.length) {
                                  setSearchStates((prev) => ({ ...prev, [idx]: { ...prev[idx], open: true } }));
                                }
                              }}
                              placeholder="도서명 검색"
                              className={inputCls}
                              autoComplete="off"
                            />
                            {searchStates[idx]?.open && searchStates[idx].results.length > 0 && (
                              <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-[70] max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
                                {searchStates[idx].results.map((s) => (
                                  <li key={s.isbn}>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                      onClick={() => selectSuggestion(idx, s)}
                                    >
                                      {s.coverImage ? (
                                        <div className="relative size-9 shrink-0 overflow-hidden rounded-sm bg-gray-100">
                                          <Image src={s.coverImage} alt={s.title} fill sizes="36px" className="object-cover" />
                                        </div>
                                      ) : (
                                        <div className="size-9 shrink-0 rounded-sm bg-gray-100" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-[14px] font-semibold text-gray-900">{s.title}</p>
                                        <p className="truncate text-[12px] text-gray-500">{s.author}</p>
                                      </div>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* ISBN */}
                          <div className="sm:contents">
                            <div className="sm:hidden">
                              <label className="mb-2 block text-[12px] font-bold text-gray-500">
                                ISBN
                              </label>
                              <input
                                type="text"
                                value={book.isbn}
                                onChange={(e) => updateBook(idx, 'isbn', e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                                placeholder="선택 입력"
                                maxLength={13}
                                className={`${inputCls} font-mono text-[13px]`}
                              />
                            </div>
                            <input
                              type="text"
                              value={book.isbn}
                              onChange={(e) => updateBook(idx, 'isbn', e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                              placeholder="9780000000000"
                              maxLength={13}
                              className={`${inputCls} hidden sm:block font-mono text-[13px]`}
                            />
                          </div>

                          {/* 수량 - onFocus 전체선택으로 덮어쓰기 */}
                          <div className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-2 sm:contents">
                            <div>
                              <label className="mb-2 block text-[12px] font-bold text-gray-500 sm:hidden">
                                수량
                              </label>
                              <input
                              type="text"
                              inputMode="numeric"
                              value={book.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                updateBook(idx, 'quantity', raw === '' ? 1 : Math.max(1, Number(raw)));
                              }}
                              className={`${inputCls} text-center`}
                              />
                            </div>

                            {/* 삭제 */}
                            <button
                              type="button"
                              onClick={() => removeBook(idx)}
                              disabled={books.length === 1}
                              className="flex h-12 w-11 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed sm:size-9"
                              aria-label="도서 항목 삭제"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
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

                <div className="sticky bottom-0 z-20 flex gap-3 border-t border-gray-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_rgba(15,23,42,0.06)] sm:px-7 sm:py-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
