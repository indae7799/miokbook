'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface BulkOrder {
  id: string;
  organization: string;
  contactName: string;
  deliveryDate: string;
  books: Array<{ title: string; isbn: string; quantity: number }>;
  quote: {
    items: Array<{ title: string; isbn: string; quantity: number; unitPrice: number; total: number }>;
    shippingFee: number;
    totalAmount: number;
    validUntil: string;
  } | null;
  contract: {
    signedByEul?: boolean;
    signedAtEul?: string;
    eulName?: string;
  } | null;
  status: string;
}

export default function BulkContractPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<BulkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eulSigned, setEulSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [contracted, setContracted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/bulk-order/order/${id}`);
        if (!res.ok) {
          setError('계약서 정보를 불러올 수 없습니다.');
          return;
        }
        const data = await res.json();
        setOrder(data);
        setEulSigned(data.contract?.signedByEul ?? false);
        setContracted(data.status === 'contracted');
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleEulSign = async () => {
    if (!order) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/bulk-order/contract/${id}/sign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: order.contactName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || '서명 처리 중 오류가 발생했습니다.');
        return;
      }
      setEulSigned(true);
      setContracted(true);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F8F6F7]">
        <div className="size-9 border-[3px] border-[#E8C5CC] border-t-[#7B2D3E] rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-[#F8F6F7]">
        <div className="text-center">
          <p className="text-gray-500 mb-4 text-sm">{error || '계약서를 찾을 수 없습니다.'}</p>
          <Link href="/bulk-order" className="text-[#7B2D3E] font-bold hover:underline text-sm">
            대량구매 서비스로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[#F8F6F7] py-14 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 네비 */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/bulk-order/quote/${id}`}
            className="text-xs text-gray-400 hover:text-[#7B2D3E] transition-colors font-medium tracking-wide"
          >
            ← 견적서 보기
          </Link>
          <span className="text-[11px] text-gray-400 font-mono">NO. {id.slice(0, 10).toUpperCase()}</span>
        </div>

        {/* 계약 완료 배너 */}
        {contracted && (
          <div className="mb-8 bg-[#7B2D3E]/8 border border-[#E8C5CC] rounded-2xl p-6 text-center">
            <div className="size-11 rounded-full bg-[#7B2D3E]/10 flex items-center justify-center mx-auto mb-3">
              <svg className="size-5 text-[#7B2D3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-myeongjo text-lg font-bold text-[#4A1728] mb-1 tracking-tight">계약이 체결되었습니다</h2>
            <p className="text-[#7B2D3E] text-sm">담당자가 납품 일정을 안내해 드립니다.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 계약서 헤더 */}
          <div className="bg-gradient-to-br from-[#3B1220] to-[#6B2435] text-white px-10 py-12 text-center">
            <p className="text-[#D4909F] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">미옥서원</p>
            <h1 className="font-myeongjo text-3xl font-bold tracking-[0.1em]">도서 납품 및 판매 대행 계약서</h1>
            <div className="w-12 h-px bg-[#9B3D52] mx-auto mt-5" />
          </div>

          {/* 계약서 본문 */}
          <div className="px-10 py-10 space-y-8 text-[0.875rem] text-gray-700 leading-[1.9]">
            {/* 당사자 */}
            <div className="bg-[#F8F6F7] rounded-xl p-6 border border-gray-100">
              <div className="grid grid-cols-[6rem_1fr] gap-y-2.5 text-sm">
                <span className="font-bold text-gray-400 uppercase text-[11px] tracking-wider self-center">발행처 (갑)</span>
                <span className="font-semibold text-gray-900">미옥서원</span>
                <span className="font-bold text-gray-400 uppercase text-[11px] tracking-wider self-center">수령처 (을)</span>
                <span className="font-semibold text-gray-900">{order.organization}</span>
              </div>
            </div>

            {/* 조항 */}
            <div className="space-y-7">
              {[
                {
                  title: '제1조 (목적)',
                  body: '본 계약은 \'갑\'이 운영하는 서점에서 \'을\'이 운영하는 교육 시설에 필요한 도서를 공급하고, \'을\'은 이에 따른 홍보 및 판매 대행 서비스를 제공함에 있어 필요한 사항을 규정함을 목적으로 한다.',
                },
                {
                  title: '제2조 (도서의 공급 및 판매가)',
                  body: '\'갑\'은 \'을\'에게 도서를 공급함에 있어 출판문화산업 진흥법(도서정가제)을 준수한다. 도서의 판매가는 정가 대비 10% 이내의 할인율(90% 공급가)을 적용하며, 이는 법정 허용 범위 내의 정당한 거래로 간주한다. 배송비 및 기타 부대비용은 상호 협의 하에 결정한다.',
                },
                {
                  title: '제3조 (판매 대행 및 홍보 서비스의 제공)',
                  body: '\'을\'은 \'갑\'을 대신하여 학생 및 학부모에게 해당 도서를 홍보하고, 구매 수량 취합 및 대금 수납 대행 서비스를 제공한다. \'을\'은 도서의 원활한 배부와 보관을 위한 장소를 제공하며, 관련 민원 응대를 지원한다.',
                },
                {
                  title: '제4조 (판매 대행 수수료)',
                  body: '\'갑\'은 \'을\'이 제공하는 제3조의 서비스에 대한 대가로 도서 실판매액(할인가 기준)의 11%(부가세 포함)를 \'판매 대행 수수료\'로 지급한다. (예: 9,000원에 판매 시, 수수료 1,000원 지급) 수수료율은 상호 합의 하에 조정할 수 있으며, 별도의 서면 합의가 없는 한 본 계약의 요율을 유지한다.',
                },
                {
                  title: '제5조 (정산 및 계산서 발행)',
                  body: '\'갑\'은 공급한 도서 전체 금액에 대하여 면세 계산서를 발행한다. \'을\'은 수령한 수수료에 대하여 과세 세금계산서를 \'갑\'에게 발행한다. 정산은 매월 말일 또는 납품 완료 시점을 기준으로 하며, \'갑\'은 \'을\'의 세금계산서 수령 후 7일 이내에 수수료를 지급한다.',
                },
                {
                  title: '제6조 (계약의 효력)',
                  body: '본 계약은 양 당사자가 온라인 서명 시스템을 통해 날인한 날로부터 효력이 발생하며, 해당 도서의 납품 및 정산이 완료될 때까지 유효하다.',
                },
              ].map((clause) => (
                <div key={clause.title}>
                  <h3 className="font-myeongjo font-bold text-gray-900 mb-2 tracking-tight">{clause.title}</h3>
                  <p className="text-gray-500 leading-[1.9] pl-1">{clause.body}</p>
                </div>
              ))}
            </div>

            {/* 날짜 */}
            <div className="text-center py-2 text-gray-500 font-medium text-sm tracking-wide">
              {today}
            </div>

            {/* 서명 영역 */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              {/* 갑 */}
              <div className="text-center space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">(갑) 서점 대표</p>
                <div className="flex justify-center">
                  <div className="size-24 rounded-full border-2 border-[#7B2D3E] flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="text-[#7B2D3E] font-bold text-[11px] leading-[1.6] tracking-wider">
                        <div>미</div><div>옥</div><div>서</div><div>원</div>
                      </div>
                    </div>
                    <div className="absolute inset-1.5 rounded-full border border-[#7B2D3E]/20" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">미옥서원 (인)</p>
              </div>

              {/* 을 */}
              <div className="text-center space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">(을) 기관 대표</p>
                <div className="flex justify-center">
                  {eulSigned ? (
                    <div className="size-24 rounded-full border-2 border-[#7B2D3E] flex items-center justify-center relative">
                      <div className="text-[#7B2D3E] font-bold text-[11px] leading-[1.6] tracking-wider text-center break-all max-w-[56px]">
                        {order.contactName.split('').map((ch, i) => (
                          <div key={i}>{ch}</div>
                        ))}
                      </div>
                      <div className="absolute inset-1.5 rounded-full border border-[#7B2D3E]/20" />
                    </div>
                  ) : (
                    <button
                      onClick={handleEulSign}
                      disabled={signing}
                      className="size-24 rounded-full border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 text-[11px] font-medium hover:border-[#7B2D3E] hover:text-[#7B2D3E] hover:bg-[#FDF2F4] transition-all disabled:opacity-40 gap-1"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {signing ? '처리 중' : '클릭하여\n서명'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">{order.contactName} (인)</p>
              </div>
            </div>

            {!eulSigned && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-600 text-center">
                계약 내용을 확인하신 후 을(기관) 도장 영역을 클릭하여 전자 서명해 주세요.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/bulk-order"
            className="text-xs text-gray-400 hover:text-[#7B2D3E] transition-colors font-medium tracking-wide"
          >
            대량구매 서비스 홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
