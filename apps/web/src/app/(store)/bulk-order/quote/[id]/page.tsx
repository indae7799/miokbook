import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 0;

interface QuoteItem {
  title: string;
  isbn: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quote {
  items: QuoteItem[];
  shippingFee: number;
  totalAmount: number;
  validUntil: string;
  memo: string;
  issuedAt?: string;
}

interface BulkOrder {
  id: string;
  organization: string;
  contactName: string;
  createdAt: string | null;
  quote: Quote | null;
  contract: {
    signedByEul?: boolean;
    signedAtEul?: string;
    eulName?: string;
  } | null;
  status: string;
}

async function getBulkOrder(id: string): Promise<BulkOrder | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, created_at, quote, contract, status')
      .eq('id', id)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      organization: data.organization ?? '',
      contactName: data.contact_name ?? '',
      createdAt: data.created_at ?? null,
      quote: (data.quote as Quote | null) ?? null,
      contract: (data.contract as BulkOrder['contract']) ?? null,
      status: data.status ?? 'pending',
    };
  } catch {
    return null;
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default async function BulkOrderQuotePage({ params }: { params: { id: string } }) {
  const order = await getBulkOrder(params.id);

  if (!order) {
    notFound();
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[#F8F6F7] py-14 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/bulk-order"
            className="text-xs text-gray-400 hover:text-[#7B2D3E] transition-colors flex items-center gap-1.5 font-medium tracking-wide"
          >
            단체구매 서비스
          </Link>
          <span className="text-[11px] text-gray-400 font-mono">NO. {order.id.slice(0, 10).toUpperCase()}</span>
        </div>

        {!order.quote ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="size-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <svg className="size-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-myeongjo text-xl font-bold text-gray-900 mb-2 tracking-tight">견적 준비 중</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              담당자가 확인 후 영업일 1~2일 내에 연락드립니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-[#3B1220] to-[#6B2435] text-white px-10 py-12 text-center">
              <p className="text-[#D4909F] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">미옥서원</p>
              <h1 className="font-myeongjo text-4xl font-bold tracking-[0.15em] mb-4">견적서</h1>
              <div className="w-12 h-px bg-[#9B3D52] mx-auto" />
            </div>

            <div className="px-10 py-6 bg-[#F8F6F7] border-b border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">견적번호</p>
                  <p className="font-mono text-xs text-gray-600 break-all">{order.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">발행일</p>
                  <p className="font-semibold text-gray-900 text-sm">{today}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">유효기간</p>
                  <p className="font-semibold text-gray-900 text-sm">{order.quote.validUntil || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">상태</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#7B2D3E]/10 text-[#7B2D3E]">
                    견적발송
                  </span>
                </div>
              </div>
            </div>

            <div className="px-10 py-7 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">수신처</p>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">기관명</p>
                  <p className="font-bold text-gray-900 text-xl font-myeongjo">{order.organization}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">담당자</p>
                  <p className="font-semibold text-gray-900">{order.contactName}</p>
                </div>
              </div>
            </div>

            <div className="px-10 py-7 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-5">도서 목록</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#6B2435]">
                      <th className="text-left py-2.5 pr-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-8">No.</th>
                      <th className="text-left py-2.5 pr-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">도서명</th>
                      <th className="text-left py-2.5 pr-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32">ISBN</th>
                      <th className="text-right py-2.5 pr-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">수량</th>
                      <th className="text-right py-2.5 pr-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">단가</th>
                      <th className="text-right py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.quote.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-[#FDF2F4] transition-colors">
                        <td className="py-3.5 pr-3 text-gray-300 text-xs">{idx + 1}</td>
                        <td className="py-3.5 pr-3 font-medium text-gray-900">{item.title}</td>
                        <td className="py-3.5 pr-3 font-mono text-xs text-gray-400">{item.isbn || '-'}</td>
                        <td className="py-3.5 pr-3 text-right text-gray-600">{item.quantity}권</td>
                        <td className="py-3.5 pr-3 text-right text-gray-600">{formatPrice(item.unitPrice)}</td>
                        <td className="py-3.5 text-right font-bold text-gray-900">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-10 py-7 border-b border-gray-100">
              <div className="max-w-xs ml-auto space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>도서 합계</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(order.quote.items.reduce((sum, item) => sum + item.total, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>배송비</span>
                  <span className="font-medium text-gray-900">{formatPrice(order.quote.shippingFee)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <span className="font-black text-gray-900 font-myeongjo text-base">총 합계</span>
                  <span className="font-black text-[#7B2D3E] text-xl">{formatPrice(order.quote.totalAmount)}</span>
                </div>
              </div>
            </div>

            {order.quote.memo && (
              <div className="px-10 py-7 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">담당자 메모</p>
                <p className="text-sm text-gray-700 bg-[#F8F6F7] rounded-xl p-5 leading-relaxed">
                  {order.quote.memo}
                </p>
              </div>
            )}

            <div className="px-10 py-7 bg-[#F8F6F7] border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">발행처</p>
                  <p className="font-bold text-gray-900 font-myeongjo">미옥서원</p>
                  <p className="text-sm text-gray-500 mt-0.5">miokbooks@naver.com</p>
                  <p className="text-sm text-gray-500">02-569-1643</p>
                </div>
                <div className="size-16 rounded-full border-2 border-[#7B2D3E] flex items-center justify-center text-[#7B2D3E] text-xs font-bold text-center leading-tight">
                  미옥서원
                  <br />
                  (인)
                </div>
              </div>
            </div>

            <div className="px-10 py-10 text-center">
              <p className="text-gray-400 text-sm mb-5">견적 내용에 동의하시면 전자 계약서를 작성해 주세요.</p>
              <Link
                href={`/bulk-order/contract/${order.id}`}
                className="inline-flex items-center gap-2.5 bg-[#7B2D3E] text-white font-bold px-10 py-4 rounded-full text-sm shadow-lg shadow-[#7B2D3E]/20 hover:bg-[#6B2435] transition-all tracking-wide"
              >
                전자 계약서 작성하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
