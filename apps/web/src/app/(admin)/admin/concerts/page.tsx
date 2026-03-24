'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';

/* ─────────────────────────────── types ─────────────────────────────── */

interface TableRow {
  label: string;
  value: string;
}

interface Concert {
  id: string;
  title: string;
  archiveTitle: string;
  slug: string;
  isActive: boolean;
  imageUrl: string;
  eventCardImageUrl: string;
  tableRows: TableRow[];
  bookIsbns: string[];
  description: string;
  googleMapsEmbedUrl: string;
  bookingUrl: string;
  bookingLabel: string;
  bookingNoticeTitle: string;
  bookingNoticeBody: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  reviewYoutubeIds: string[];
  date: string | null;
  order: number;
}

interface EventRow {
  eventId: string;
  title: string;
  type: string;
  date: string | null;
  capacity: number;
  registeredCount: number;
  isActive: boolean;
}

interface RegistrationRow {
  registrationId: string;
  eventId: string;
  userName: string;
  userEmail: string;
  phone: string;
  address: string;
  status: string;
  cancelReason: string;
  createdAt: string | null;
}

type ConcertForm = Omit<Concert, 'id'>;

const FIXED_NAVER_URL = 'https://naver.me/53lKvYM7';

const defaultForm = (): ConcertForm => ({
  title: '',
  archiveTitle: '',
  slug: '',
  isActive: true,
  imageUrl: '',
  eventCardImageUrl: '',
  tableRows: [{ label: '', value: '' }],
  bookIsbns: [],
  description: '',
  googleMapsEmbedUrl: FIXED_NAVER_URL,
  bookingUrl: FIXED_NAVER_URL,
  bookingLabel: '예약 신청',
  bookingNoticeTitle: '',
  bookingNoticeBody: '',
  feeLabel: '',
  feeNote: '현장 결제 가능',
  hostNote: '',
  statusBadge: '',
  ticketPrice: 0,
  ticketOpen: false,
  reviewYoutubeIds: [],
  date: '',
  order: 0,
});

const CONCERT_IMAGE_PRESETS = {
  main: {
    cropAspectRatio: 16 / 9,
    previewAspectRatio: 16 / 9,
    outputWidth: 1280,
    outputHeight: 720,
    cropTitle: '북콘서트 대표 이미지 자르기',
    cropDescription: '/concerts 메인과 상세 화면에 맞게 잘라서 업로드합니다.',
  },
  eventCard: {
    cropAspectRatio: 4 / 5,
    previewAspectRatio: 4 / 5,
    outputWidth: 800,
    outputHeight: 1000,
    cropTitle: '이벤트 카드 이미지 자르기',
    cropDescription: '/events 카드 비율에 맞게 잘라서 업로드합니다.',
  },
} as const;

/* ─────────────────────────────── helpers ─────────────────────────────── */

function buildConcertTitle(date: string | null) {
  if (!date) return '북콘서트';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '북콘서트';
  const month = value.getMonth() + 1;
  const day = value.getDate();
  return `${month}월 ${day}일 북콘서트`;
}

interface BookSearchItem {
  isbn: string;
  title: string;
  author: string;
  coverImage?: string;
}

function isIsbnLike(value: string) {
  return /^(978|979)\d{10}$/.test(value.replace(/-/g, '').trim());
}

function buildConcertSlug(date: string | null) {
  if (!date) return `concert-${Date.now()}`;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return `concert-${Date.now()}`;
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `concert-${yyyy}${mm}${dd}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ko-KR');
}

/* ─────────────────────────────── fetch ─────────────────────────────── */

async function fetchConcerts(token: string): Promise<Concert[]> {
  const res = await fetch('/api/admin/concerts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function fetchEvents(token: string): Promise<EventRow[]> {
  const res = await fetch('/api/admin/events', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function fetchRegistrations(token: string, eventId: string): Promise<RegistrationRow[]> {
  const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/registrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function AdminConcertsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'cms' | 'participants'>('cms');

  /* ── CMS 상태 ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ConcertForm>(defaultForm());
  const [imgUploading, setImgUploading] = useState(false);
  const [bookSearchKeyword, setBookSearchKeyword] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchItem[]>([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── 참가자 관리 상태 ── */
  const [registrationsEventId, setRegistrationsEventId] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeChecked, setPurgeChecked] = useState(false);

  /* ─────────── 쿼리 ─────────── */
  const { data: concerts = [], isLoading: loadingConcerts, error: concertError } = useQuery({
    queryKey: queryKeys.admin.concerts(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchConcerts(token);
    },
    enabled: !!user,
  });

  const { data: allEvents = [], isLoading: loadingEvents, error: eventsError } = useQuery({
    queryKey: queryKeys.admin.events(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchEvents(token);
    },
    enabled: !!user && tab === 'participants',
  });
  const bookConcertEvents = allEvents.filter((e) => e.type === 'book_concert');

  const { data: registrations = [], isLoading: loadingReg } = useQuery({
    queryKey: queryKeys.admin.eventRegistrations(registrationsEventId ?? ''),
    queryFn: async () => {
      if (!user || !registrationsEventId) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchRegistrations(token, registrationsEventId);
    },
    enabled: !!user && !!registrationsEventId,
  });

  /* ─────────── mutation ─────────── */
  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: ConcertForm }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const url = payload.id ? `/api/admin/concerts/${payload.id}` : '/api/admin/concerts';
      const method = payload.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    },
    onSuccess: () => {
      toast.success(editingId ? '수정되었습니다.' : '생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.concerts() });
      setFormOpen(false);
      setEditingId(null);
      setForm(defaultForm());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/concerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    },
    onSuccess: () => {
      toast.success('삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.concerts() });
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  const purgeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/concerts/purge-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
      return data as { deletedRegistrations: number; bookConcertEventCount: number };
    },
    onSuccess: (data) => {
      toast.success(`북콘서트 신청 ${data.deletedRegistrations}건 삭제 완료`);
      setPurgeOpen(false);
      setPurgeChecked(false);
      setRegistrationsEventId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.events() });
    },
    onError: (e: Error) => toast.error(e.message || '삭제 실패'),
  });

  /* ─────────── 폼 핸들러 ─────────── */
  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setBookSearchKeyword('');
    setBookSearchResults([]);
    setSelectedBook(null);
    setFormOpen(true);
  };

  const openEdit = (c: Concert) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      archiveTitle: c.archiveTitle ?? '',
      slug: c.slug,
      isActive: c.isActive,
      imageUrl: c.imageUrl,
      eventCardImageUrl: c.eventCardImageUrl ?? '',
      tableRows: c.tableRows.length > 0 ? c.tableRows : [{ label: '', value: '' }],
      bookIsbns: c.bookIsbns,
      description: c.description,
      googleMapsEmbedUrl: FIXED_NAVER_URL,
      bookingUrl: FIXED_NAVER_URL,
      bookingLabel: '예약 신청',
      bookingNoticeTitle: '',
      bookingNoticeBody: '',
      feeLabel: c.feeLabel,
      feeNote: c.feeNote || '현장 결제 가능',
      hostNote: c.hostNote || '',
      statusBadge: c.statusBadge,
      ticketPrice: c.ticketPrice ?? 0,
      ticketOpen: c.ticketOpen ?? false,
      reviewYoutubeIds: c.reviewYoutubeIds ?? [],
      date: c.date ? c.date.slice(0, 10) : '',
      order: c.order,
    });
    setBookSearchKeyword('');
    setBookSearchResults([]);
    setSelectedBook(null);
    setFormOpen(true);
  };

  const handleBookSearch = async () => {
    const keyword = bookSearchKeyword.trim();
    if (!keyword) {
      setBookSearchResults([]);
      setSelectedBook(null);
      setForm((prev) => ({ ...prev, bookIsbns: [] }));
      return;
    }
    if (!user) return;
    setBookSearching(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/books/search?keyword=${encodeURIComponent(keyword)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
      const items = Array.isArray(data.items) ? data.items as BookSearchItem[] : [];
      const normalizedKeyword = keyword.replace(/-/g, '').trim();
      const exactIsbnMatch = items.find((item) => item.isbn === normalizedKeyword) ?? null;
      const autoSelectedBook =
        exactIsbnMatch ?? (isIsbnLike(keyword) && items.length === 1 ? items[0] ?? null : null);

      if (autoSelectedBook) {
        handleSelectBook(autoSelectedBook);
        toast.success(`도서가 선택되었습니다: ${autoSelectedBook.title}`);
        return;
      }

      setBookSearchResults(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '도서 검색 실패');
    } finally {
      setBookSearching(false);
    }
  };

  const handleSelectBook = (book: BookSearchItem) => {
    setForm((prev) => ({ ...prev, bookIsbns: [book.isbn] }));
    setSelectedBook(book);
    setBookSearchKeyword(book.title);
    setBookSearchResults([]);
  };


  const handleSave = () => {
    if (imgUploading) { toast.error('이미지 업로드 중입니다.'); return; }
    if (!form.date) { toast.error('날짜를 선택해 주세요.'); return; }
    if (Number(form.ticketPrice ?? 0) <= 0) { toast.error('참가권 금액을 입력해 주세요.'); return; }
    if (bookSearchKeyword.trim() && form.bookIsbns.length === 0) {
      toast.error('조회된 도서를 선택해야 /concerts에 책 정보가 노출됩니다.');
      return;
    }
    const autoTitle = buildConcertTitle(form.date);
    const autoSlug = buildConcertSlug(form.date);
    const data: ConcertForm = {
      ...form,
      slug: autoSlug,
      title: autoTitle,
      archiveTitle: form.archiveTitle.trim(),
      eventCardImageUrl: form.eventCardImageUrl.trim(),
      tableRows: [],
      bookIsbns: form.bookIsbns,
      description: '',
      googleMapsEmbedUrl: FIXED_NAVER_URL,
      bookingUrl: FIXED_NAVER_URL,
      bookingLabel: '예약 신청',
      bookingNoticeTitle: '',
      bookingNoticeBody: '',
      feeLabel: `${Number(form.ticketPrice).toLocaleString('ko-KR')}원`,
      feeNote: '현장 결제 가능',
      hostNote: '',
      statusBadge: form.statusBadge.trim(),
      ticketOpen: Number(form.ticketPrice ?? 0) > 0,
      reviewYoutubeIds: [],
      date: form.date ? new Date(form.date).toISOString() : null,
      order: 0,
    };
    saveMutation.mutate({ id: editingId ?? undefined, data });
  };

  /* ─────────── 로딩/에러 ─────────── */
  if (concertError || eventsError) {
    const err = concertError || eventsError;
    return <EmptyState title="오류" message={err instanceof Error ? err.message : '오류가 발생했습니다.'} />;
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">북콘서트</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {(['cms', 'participants'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'cms' ? '북콘서트 관리' : '참가자 관리'}
          </button>
        ))}
      </div>

      {/* ════════════════ CMS 탭 ════════════════ */}
      {tab === 'cms' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>+ 북콘서트 추가</Button>
          </div>

          {loadingConcerts ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : concerts.length === 0 ? (
            <EmptyState title="등록된 북콘서트 없음" message="위의 '북콘서트 추가' 버튼으로 첫 북콘서트를 등록해 보세요." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">이미지</th>
                    <th className="px-4 py-3 text-left font-medium">일정</th>
                    <th className="px-4 py-3 text-center font-medium">상태</th>
                    <th className="px-4 py-3 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {concerts.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="relative w-20 h-12 rounded overflow-hidden bg-muted shrink-0">
                          {c.imageUrl ? (
                            <AdminPreviewImage src={c.imageUrl} alt="" fill className="object-cover" sizes="80px" priority={idx === 0} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">없음</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatDate(c.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${c.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}>
                            {c.isActive ? '노출' : '비노출'}
                          </span>
                          {c.statusBadge ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-[#722f37]/20 bg-[#f8f1f2] text-[#722f37]">
                              {c.statusBadge}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => openEdit(c)}>수정</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteId(c.id)}>삭제</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ 참가자 관리 탭 ════════════════ */}
      {tab === 'participants' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => { setPurgeChecked(false); setPurgeOpen(true); }}>
              북콘서트 신청 DB 비우기
            </Button>
          </div>

          {loadingEvents ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : bookConcertEvents.length === 0 ? (
            <EmptyState title="등록된 북콘서트 이벤트 없음" message="이벤트 관리에서 '북콘서트' 유형의 이벤트를 먼저 등록해 주세요." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">콘서트 제목</th>
                    <th className="px-4 py-3 text-left font-medium">일시</th>
                    <th className="px-4 py-3 text-center font-medium">참가 현황</th>
                    <th className="px-4 py-3 text-center font-medium">상태</th>
                    <th className="px-4 py-3 text-right font-medium">참가자 명단</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookConcertEvents.map((e) => (
                    <tr key={e.eventId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{e.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-primary">{e.registeredCount}</span>
                        <span className="text-muted-foreground"> / {e.capacity}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${e.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'}`}>
                          {e.isActive ? '모집 중' : '종료'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => setRegistrationsEventId(e.eventId)}>참가자 관리</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ 북콘서트 생성/수정 다이얼로그 ═══════ */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '북콘서트 수정' : '북콘서트 추가'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 날짜 */}
            <div>
              <label className="text-sm font-medium">날짜 *</label>
              <Input
                type="date"
                className="mt-1 min-h-[48px]"
                value={form.date ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value || null }))}
              />
            </div>

            {/* 노출 여부 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="concert-active"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="size-4"
              />
              <label htmlFor="concert-active" className="text-sm">스토어에 노출</label>
            </div>

            {/* 홍보 이미지 */}
            <div>
              <label className="text-sm font-medium">북콘서트 대표 이미지</label>
              {form.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-[20px] border border-[#722f37]/15 bg-[#f7f1eb] shadow-sm">
                  <div className="border-b border-[#722f37]/10 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">
                    /concerts Preview
                  </div>
                  <div className="relative aspect-[16/9]">
                    <AdminPreviewImage src={form.imageUrl} alt="홍보 이미지" fill className="object-cover" sizes="600px" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 pb-4 pt-10 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">Next Concert</p>
                      <p className="mt-2 font-myeongjo text-xl font-bold leading-tight">
                        {form.title?.trim() || buildConcertTitle(form.date)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-2">
                <ImagePreviewUploader
                  storagePath={`concerts/${buildConcertSlug(form.date)}-${Date.now()}.jpg`}
                  onUploadComplete={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                  onUploadingChange={setImgUploading}
                  enableCrop
                  cropAspectRatio={CONCERT_IMAGE_PRESETS.main.cropAspectRatio}
                  previewAspectRatio={CONCERT_IMAGE_PRESETS.main.previewAspectRatio}
                  cropTitle={CONCERT_IMAGE_PRESETS.main.cropTitle}
                  cropDescription={CONCERT_IMAGE_PRESETS.main.cropDescription}
                  outputWidth={CONCERT_IMAGE_PRESETS.main.outputWidth}
                  outputHeight={CONCERT_IMAGE_PRESETS.main.outputHeight}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">/concerts 메인과 북콘서트 상세에 사용됩니다.</p>
            </div>

            <div>
              <label className="text-sm font-medium">이벤트 카드 이미지</label>
              {form.eventCardImageUrl && (
                <div className="mt-2 w-full max-w-[240px] overflow-hidden rounded-[22px] border border-border bg-white shadow-sm">
                  <div className="relative aspect-[4/5]">
                    <AdminPreviewImage src={form.eventCardImageUrl} alt="이벤트 카드 이미지" fill className="object-cover" sizes="240px" />
                    <div className="absolute left-3 top-3 rounded-md border border-primary/20 bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm">
                      북콘서트
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                      {form.title?.trim() || buildConcertTitle(form.date)}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {form.date || '일정 미정'}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <div className="h-9 flex-1 rounded-lg border border-border bg-background" />
                      <div className="h-9 flex-1 rounded-lg bg-primary/90" />
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-2">
                <ImagePreviewUploader
                  storagePath={`concerts/event-card-${buildConcertSlug(form.date)}-${Date.now()}.jpg`}
                  onUploadComplete={(url) => setForm((p) => ({ ...p, eventCardImageUrl: url }))}
                  onUploadingChange={setImgUploading}
                  enableCrop
                  cropAspectRatio={CONCERT_IMAGE_PRESETS.eventCard.cropAspectRatio}
                  previewAspectRatio={CONCERT_IMAGE_PRESETS.eventCard.previewAspectRatio}
                  cropTitle={CONCERT_IMAGE_PRESETS.eventCard.cropTitle}
                  cropDescription={CONCERT_IMAGE_PRESETS.eventCard.cropDescription}
                  outputWidth={CONCERT_IMAGE_PRESETS.eventCard.outputWidth}
                  outputHeight={CONCERT_IMAGE_PRESETS.eventCard.outputHeight}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">/events 카드 목록에만 사용됩니다. 비워두면 대표 이미지를 사용합니다.</p>
            </div>

            <div>
              <label className="text-sm font-medium">지난 북콘서트 제목</label>
              <Input
                className="mt-1 min-h-[48px]"
                placeholder="지난 북콘서트 목록에만 노출될 제목"
                value={form.archiveTitle}
                onChange={(e) => setForm((p) => ({ ...p, archiveTitle: e.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">비워두면 기본 북콘서트 제목을 그대로 사용합니다. 다른 영역에는 노출되지 않습니다.</p>
            </div>

            <div>
              <label className="text-sm font-medium">도서 ISBN 검색</label>
              <div className="mt-1 flex gap-2">
                <Input
                  className="min-h-[48px]"
                  placeholder="책 제목, 저자, ISBN 검색"
                  value={bookSearchKeyword}
                  onChange={(e) => setBookSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleBookSearch();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => void handleBookSearch()} disabled={bookSearching}>
                  {bookSearching ? '검색 중…' : '검색'}
                </Button>
              </div>
              {form.bookIsbns[0] ? (
                <div className="mt-3 rounded-md border border-[#722f37]/15 bg-[#fcf6f7] p-3">
                  <p className="text-xs font-semibold text-[#722f37]">선택된 ISBN: {form.bookIsbns[0]}</p>
                  {selectedBook ? (
                    <p className="mt-1 text-sm text-foreground">
                      {selectedBook.title} · {selectedBook.author}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">ISBN 검색 결과가 1건이면 자동 선택됩니다. 선택한 도서가 있으면 다음 북콘서트 일정에 표지, 도서명, 저자, 책소개가 노출됩니다.</p>
              )}
              {bookSearchResults.length > 0 ? (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-border">
                  {bookSearchResults.map((book) => (
                    <button
                      key={book.isbn}
                      type="button"
                      onClick={() => handleSelectBook(book)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{book.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{book.author} · {book.isbn}</p>
                      </div>
                      <span className="text-xs font-medium text-[#722f37]">선택</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium">참가권 금액</label>
              <Input
                className="mt-1 min-h-[48px]"
                inputMode="numeric"
                placeholder="예: 20000"
                value={form.ticketPrice ? String(form.ticketPrice) : ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '');
                  setForm((p) => ({ ...p, ticketPrice: digits ? Number(digits) : 0 }));
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">숫자만 입력하면 됩니다. 화면에는 자동으로 원 표기와 고정 문구가 들어갑니다.</p>
            </div>

            <div>
              <label className="text-sm font-medium">상태 배지</label>
              <Input
                className="mt-1 min-h-[48px]"
                placeholder="예: 예약중, 마감임박"
                value={form.statusBadge}
                onChange={(e) => setForm((p) => ({ ...p, statusBadge: e.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">비워두면 표시하지 않습니다.</p>
            </div>

            <div className="rounded border border-dashed border-[#722f37]/18 bg-[#fcfaf8] px-4 py-3 text-xs leading-6 text-[#5f4a42]">
              제목과 주소는 날짜 기준으로 자동 생성됩니다. 다음 북콘서트 일정 카드는 다음 도래일 순서대로 자동 노출됩니다.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || imgUploading}>
              {saveMutation.isPending ? '저장 중…' : editingId ? '수정 저장' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ 삭제 확인 다이얼로그 ═══════ */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>북콘서트 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">이 북콘서트를 삭제합니다. 스토어에서 즉시 내려갑니다.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>취소</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? '삭제 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ 참가자 명단 다이얼로그 ═══════ */}
      <Dialog open={!!registrationsEventId} onOpenChange={(open) => !open && setRegistrationsEventId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>북콘서트 참가자 현황</DialogTitle>
          </DialogHeader>
          {loadingReg ? (
            <div className="py-10 text-center">
              <div className="inline-block size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">명단을 불러오는 중…</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">아직 신청자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">전체: <span className="text-foreground font-bold">{registrations.length}</span>명</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ev = bookConcertEvents.find((e) => e.eventId === registrationsEventId);
                    const csv = 'data:text/csv;charset=utf-8,'
                      + '이름,연락처,이메일,주소,상태,신청일\n'
                      + registrations.map((r) => [r.userName, r.phone, r.userEmail, `"${r.address.replace(/"/g, '""')}"`, r.status, r.createdAt].join(',')).join('\n');
                    const a = document.createElement('a');
                    a.href = encodeURI(csv);
                    a.download = `${ev?.title || '북콘서트'}_참가자명단.csv`;
                    document.body.appendChild(a);
                    a.click();
                  }}
                >
                  CSV 다운로드
                </Button>
              </div>
              <div className="h-[400px] overflow-y-auto border border-border rounded-lg">
                <ul className="divide-y divide-border">
                  {registrations.map((r) => (
                    <li key={r.registrationId} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold">{r.userName || '이름 없음'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${r.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {r.status === 'cancelled' ? '취소됨' : '신청완료'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <div><p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">연락처</p><p className="text-foreground">{r.phone || '-'}</p></div>
                        <div><p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">이메일</p><p className="text-foreground">{r.userEmail || '-'}</p></div>
                        <div className="col-span-2"><p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">주소</p><p className="text-foreground">{r.address || '-'}</p></div>
                        <div className="col-span-2"><p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">신청일</p><p className="text-foreground">{formatDate(r.createdAt)}</p></div>
                      </div>
                      {r.cancelReason && <div className="mt-2 bg-red-50/50 p-2 rounded text-xs text-red-600 border border-red-100 italic">취소 사유: {r.cancelReason}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationsEventId(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ DB 비우기 다이얼로그 ═══════ */}
      <Dialog open={purgeOpen} onOpenChange={(open) => { setPurgeOpen(open); if (!open) setPurgeChecked(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>북콘서트 신청 데이터만 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">북콘서트</strong> 유형 이벤트의 <strong className="text-foreground">참가 신청 기록</strong>만 삭제합니다.</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>이벤트 글·파일은 삭제하지 않습니다.</li>
              <li>다른 유형 이벤트 신청은 건드리지 않습니다.</li>
              <li>삭제 후 신청 인원 수는 0으로 맞춥니다.</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer text-foreground">
              <input type="checkbox" className="mt-1 size-4 rounded" checked={purgeChecked} onChange={(e) => setPurgeChecked(e.target.checked)} />
              <span className="text-sm">위 내용을 이해했고, 북콘서트 신청 DB만 비웁니다.</span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>취소</Button>
            <Button variant="destructive" disabled={!purgeChecked || purgeMutation.isPending} onClick={() => purgeMutation.mutate()}>
              {purgeMutation.isPending ? '삭제 중…' : '신청 데이터 삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
