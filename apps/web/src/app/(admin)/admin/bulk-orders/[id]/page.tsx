'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Plus, Trash2, Save } from 'lucide-react';

interface BookItem {
  title: string;
  isbn: string;
  quantity: number;
}

interface QuoteItem {
  title: string;
  isbn: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface BulkOrderDetail {
  id: string;
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryDate: string;
  status: string;
  books: BookItem[];
  notes: string;
  createdAt: string | null;
  quote: {
    items: QuoteItem[];
    shippingFee: number;
    totalAmount: number;
    validUntil: string;
    memo: string;
  } | null;
  contract: {
    signedByEul?: boolean;
    signedAtEul?: string;
    eulName?: string;
    version?: string | null;
    title?: string | null;
    contentHash?: string | null;
    snapshot?: {
      order?: {
        orderId?: string;
        organization?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        deliveryDate?: string;
      };
      quote?: {
        totalAmount?: number;
        validUntil?: string;
      } | null;
    } | null;
    auditTrail?: {
      signedAt?: string;
      signerName?: string;
      signerIp?: string | null;
      signerUserAgent?: string | null;
      agreedToElectronicContract?: boolean;
      agreedToOrderAndPricing?: boolean;
    } | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '접수 대기',
  quoted: '견적 발송',
  contracted: '계약 완료',
  completed: '납품 완료',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-blue-100 text-blue-700',
  contracted: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

type Tab = 'inquiry' | 'quote' | 'contract';

export default function AdminBulkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState<BulkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inquiry');

  // 견적서 폼 상태
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [quoteMemo, setQuoteMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const token = await getAdminToken(user);
        const res = await fetch(`/api/admin/bulk-orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('데이터를 불러올 수 없습니다.');
          return;
        }
        const data: BulkOrderDetail = await res.json();
        setOrder(data);

        // 견적서 폼 초기화
        if (data.quote) {
          setQuoteItems(data.quote.items);
          setShippingFee(data.quote.shippingFee);
          setValidUntil(data.quote.validUntil || '');
          setQuoteMemo(data.quote.memo || '');
        } else if (data.books.length > 0) {
          // 문의 도서 목록에서 견적 항목 초기화
          setQuoteItems(
            data.books.map((b) => ({
              title: b.title,
              isbn: b.isbn,
              quantity: b.quantity,
              unitPrice: 0,
              total: 0,
            }))
          );
        }
      } catch {
        toast.error('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, id]);

  const updateQuoteItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setQuoteItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        // 단가 또는 수량 변경 시 합계 재계산
        if (field === 'unitPrice' || field === 'quantity') {
          updated.total = updated.unitPrice * updated.quantity;
        }
        return updated;
      })
    );
  };

  const addQuoteItem = () => {
    setQuoteItems((prev) => [...prev, { title: '', isbn: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeQuoteItem = (idx: number) => {
    if (quoteItems.length === 1) return;
    setQuoteItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const booksTotal = quoteItems.reduce((s, i) => s + i.total, 0);
  const grandTotal = booksTotal + shippingFee;

  const handleSaveQuote = async () => {
    if (!user || !order) return;
    setSaving(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/bulk-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quote: {
            items: quoteItems,
            shippingFee,
            totalAmount: grandTotal,
            validUntil,
            memo: quoteMemo,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || '저장 실패');
        return;
      }
      toast.success('견적서가 저장되었습니다.');
      // 상태 갱신
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: 'quoted',
              quote: {
                items: quoteItems,
                shippingFee,
                totalAmount: grandTotal,
                validUntil,
                memo: quoteMemo,
              },
            }
          : prev
      );
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!user || !order) return;
    try {
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/bulk-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error('상태 변경 실패');
        return;
      }
      toast.success('상태가 변경되었습니다.');
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      toast.error('네트워크 오류');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 mb-4">대량주문 정보를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push('/admin/bulk-orders')}
          className="text-green-700 font-bold hover:underline text-sm"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <main className="space-y-6 max-w-4xl">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/bulk-orders')}
            className="size-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.organization}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{order.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {([
            { key: 'inquiry', label: '문의 내용' },
            { key: 'quote', label: '견적서 작성' },
            { key: 'contract', label: '계약서' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* 문의 내용 탭 */}
        {activeTab === 'inquiry' && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-bold text-gray-900">문의 상세 정보</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              {[
                { label: '기관명', value: order.organization },
                { label: '담당자', value: order.contactName },
                { label: '연락처', value: order.phone },
                { label: '이메일', value: order.email },
                { label: '납품 희망일', value: order.deliveryDate },
                { label: '접수일', value: order.createdAt?.slice(0, 10) ?? '-' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-gray-900 font-medium">{value || '-'}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">도서 목록</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400">도서명</th>
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 w-36">ISBN</th>
                      <th className="text-right px-4 py-2.5 text-xs font-bold text-gray-400 w-20">수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.books.map((book, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{book.title || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{book.isbn || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{book.quantity}권</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {order.notes && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">기타 요청사항</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                  {order.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 견적서 작성 탭 */}
        {activeTab === 'quote' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">견적서 작성</h2>
              {order.quote && (
                <Link
                  href={`/bulk-order/quote/${id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  고객 견적서 보기
                </Link>
              )}
            </div>

            {/* 도서 목록 단가 입력 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">도서 목록 및 단가</p>
                <button
                  type="button"
                  onClick={addQuoteItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 transition-colors"
                >
                  <Plus className="size-3.5" />
                  도서 추가
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400">도서명</th>
                      <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 w-32">ISBN</th>
                      <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 w-20">수량</th>
                      <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 w-28">단가 (원)</th>
                      <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 w-28">합계 (원)</th>
                      <th className="w-9" />
                    </tr>
                  </thead>
                  <tbody>
                    {quoteItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateQuoteItem(idx, 'title', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.isbn}
                            onChange={(e) => updateQuoteItem(idx, 'isbn', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuoteItem(idx, 'quantity', Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateQuoteItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {item.total.toLocaleString('ko-KR')}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeQuoteItem(idx)}
                            disabled={quoteItems.length === 1}
                            className="size-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 배송비 / 유효기간 / 메모 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">배송비 (원)</label>
                <input
                  type="number"
                  min={0}
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">유효기간</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500">담당자 메모</label>
              <textarea
                value={quoteMemo}
                onChange={(e) => setQuoteMemo(e.target.value)}
                rows={3}
                placeholder="고객에게 전달할 메모 (견적서에 표시됩니다)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 resize-none"
              />
            </div>

            {/* 금액 합계 */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="space-y-2 text-sm max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="text-gray-500">도서 합계</span>
                  <span className="font-medium">{booksTotal.toLocaleString('ko-KR')}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">배송비</span>
                  <span className="font-medium">{shippingFee.toLocaleString('ko-KR')}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-black text-gray-900">총 합계</span>
                  <span className="font-black text-green-700 text-lg">{grandTotal.toLocaleString('ko-KR')}원</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveQuote}
                disabled={saving}
                className="inline-flex items-center gap-2 h-11 px-6 bg-green-700 text-white font-bold text-sm rounded-xl hover:bg-green-800 disabled:opacity-60 transition-all shadow-lg shadow-green-900/10"
              >
                <Save className="size-4" />
                {saving ? '저장 중...' : '견적서 저장'}
              </button>
            </div>

            {order.quote && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs font-bold text-green-700 mb-1">고객 견적서 링크</p>
                <Link
                  href={`/bulk-order/quote/${id}`}
                  target="_blank"
                  className="text-sm text-green-800 font-mono hover:underline break-all"
                >
                  {typeof window !== 'undefined' ? window.location.origin : ''}/bulk-order/quote/{id}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 계약서 탭 */}
        {activeTab === 'contract' && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-bold text-gray-900">계약서</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">고객 서명 상태</p>
                {order.contract?.signedByEul ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-green-700 font-bold text-sm">서명 완료</span>
                    </div>
                    <p className="text-xs text-gray-500">서명자: {order.contract.eulName}</p>
                    <p className="text-xs text-gray-500">
                      서명일: {order.contract.signedAtEul?.slice(0, 10) ?? '-'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full bg-gray-200 flex items-center justify-center">
                      <div className="size-2 rounded-full bg-gray-400" />
                    </div>
                    <span className="text-gray-500 text-sm">미서명</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">계약 상태</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  order.status === 'contracted' || order.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
            </div>

            {(order.contract?.snapshot || order.contract?.auditTrail) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">계약 스냅샷</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p>버전: <span className="font-semibold text-gray-900">{order.contract?.version ?? '-'}</span></p>
                    <p>주문번호: <span className="font-mono text-[11px] text-gray-900">{order.contract?.snapshot?.order?.orderId ?? order.id}</span></p>
                    <p>납품일: <span className="font-semibold text-gray-900">{order.contract?.snapshot?.order?.deliveryDate ?? '-'}</span></p>
                    <p>총액: <span className="font-semibold text-gray-900">{(order.contract?.snapshot?.quote?.totalAmount ?? 0).toLocaleString('ko-KR')}원</span></p>
                    <p>유효기한: <span className="font-semibold text-gray-900">{order.contract?.snapshot?.quote?.validUntil ?? '-'}</span></p>
                    <p className="break-all">해시: <span className="font-mono text-[11px] text-gray-900">{order.contract?.contentHash ?? '-'}</span></p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">감사 로그</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p>서명 시각: <span className="font-semibold text-gray-900">{order.contract?.auditTrail?.signedAt?.replace('T', ' ').slice(0, 19) ?? '-'}</span></p>
                    <p>서명자: <span className="font-semibold text-gray-900">{order.contract?.auditTrail?.signerName ?? '-'}</span></p>
                    <p>IP: <span className="font-mono text-[11px] text-gray-900">{order.contract?.auditTrail?.signerIp ?? '-'}</span></p>
                    <p>전자계약 동의: <span className="font-semibold text-gray-900">{order.contract?.auditTrail?.agreedToElectronicContract ? '예' : '아니오'}</span></p>
                    <p>거래조건 동의: <span className="font-semibold text-gray-900">{order.contract?.auditTrail?.agreedToOrderAndPricing ? '예' : '아니오'}</span></p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">계약서 링크</p>
              <Link
                href={`/bulk-order/contract/${id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm text-green-700 font-mono hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {typeof window !== 'undefined' ? window.location.origin : ''}/bulk-order/contract/{id}
              </Link>
            </div>

            {order.quote && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">견적서 링크</p>
                <Link
                  href={`/bulk-order/quote/${id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm text-green-700 font-mono hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  {typeof window !== 'undefined' ? window.location.origin : ''}/bulk-order/quote/{id}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
