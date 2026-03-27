'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BULK_CONTRACT_CLAUSES,
  BULK_CONTRACT_SUPPLIER,
  BULK_CONTRACT_TITLE,
  type BulkContractAuditTrail,
  type BulkContractClause,
  type BulkContractSnapshot,
} from '@/lib/bulk-contract';

interface QuoteItem {
  title: string;
  isbn: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteSnapshot {
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
  deliveryDate: string;
  books: Array<{ title: string; isbn: string; quantity: number }>;
  quote: QuoteSnapshot | null;
  contract: {
    signedByEul?: boolean;
    signedAtEul?: string;
    eulName?: string;
    signMethod?: string | null;
    ucansignRequestId?: string | null;
    ucansignDocumentId?: string | null;
    ucansignParticipantId?: string | null;
    version?: string | null;
    title?: string | null;
    contentHash?: string | null;
    finalDocument?: {
      path?: string;
      url?: string;
      contentType?: string;
      generatedAt?: string;
    } | null;
    snapshot?: BulkContractSnapshot | null;
    auditTrail?: BulkContractAuditTrail | null;
  } | null;
  status: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string | null;
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function BulkContractPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<BulkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [agreeElectronic, setAgreeElectronic] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [ucansignEmbedUrl, setUcanSignEmbedUrl] = useState<string | null>(null);
  const [loadingUcanSignEmbed, setLoadingUcanSignEmbed] = useState(false);

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
        setTypedName(data.contract?.eulName ?? data.contactName ?? '');
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadEmbedUrl() {
      if (!order?.contract?.ucansignDocumentId || order.contract?.signedByEul) return;
      if (order.contract?.signMethod !== 'embedding') return;

      setLoadingUcanSignEmbed(true);
      try {
        const res = await fetch(`/api/bulk-order/contract/${id}/ucansign-embed`);
        if (!res.ok) return;
        const data = (await res.json()) as { url?: string };
        setUcanSignEmbedUrl(data.url ?? null);
      } catch {
        setUcanSignEmbedUrl(null);
      } finally {
        setLoadingUcanSignEmbed(false);
      }
    }

    loadEmbedUrl();
  }, [id, order?.contract?.signedByEul, order?.contract?.signMethod, order?.contract?.ucansignDocumentId]);

  const handleSign = async () => {
    if (!order) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/bulk-order/contract/${id}/sign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typedName.trim(),
          agreedToElectronicContract: agreeElectronic,
          agreedToOrderAndPricing: agreeTerms,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || '서명 처리 중 오류가 발생했습니다.');
        return;
      }

      const refreshed = await fetch(`/api/bulk-order/order/${id}`).then((r) => r.json());
      setOrder(refreshed);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F6F7]">
        <div className="size-10 animate-spin rounded-full border-4 border-[#E8C5CC] border-t-[#7B2D3E]" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F6F7] px-4">
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-500">{error || '계약서를 찾을 수 없습니다.'}</p>
          <Link href="/bulk-order" className="text-sm font-bold text-[#7B2D3E] hover:underline">
            대량구매 서비스로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const snapshot = order.contract?.snapshot ?? null;
  const supplier = snapshot?.supplier ?? BULK_CONTRACT_SUPPLIER;
  const clauses: BulkContractClause[] = snapshot?.clauses?.length ? snapshot.clauses : BULK_CONTRACT_CLAUSES;
  const quote = snapshot?.quote ?? order.quote;
  const snapshotOrder = snapshot?.order;
  const auditTrail = order.contract?.auditTrail ?? null;
  const contractTitle = snapshot?.title || order.contract?.title || BULK_CONTRACT_TITLE;
  const signed = Boolean(order.contract?.signedByEul);
  const canSign = !!typedName.trim() && agreeElectronic && agreeTerms && !signing && !signed;
  const signedName = order.contract?.eulName || typedName || order.contactName;
  const signedAtLabel = auditTrail?.signedAt ? new Date(auditTrail.signedAt).toLocaleString('ko-KR') : null;
  const finalDocumentUrl = order.contract?.finalDocument?.url ?? null;
  const hasUcanSignRequest = Boolean(order.contract?.ucansignDocumentId);
  const showLegacyInternalSigning = !signed && !hasUcanSignRequest;

  return (
    <main className="min-h-screen bg-[#F8F6F7] px-4 py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/bulk-order/quote/${id}`}
            className="text-xs font-medium tracking-wide text-gray-400 transition-colors hover:text-[#7B2D3E]"
          >
            견적서 보기
          </Link>
          <span className="font-mono text-[11px] text-gray-400">NO. {order.id.slice(0, 10).toUpperCase()}</span>
        </div>

        {signed ? (
          <div className="mb-8 rounded-2xl border border-[#E8C5CC] bg-white p-5 text-center shadow-sm">
            <div className="mx-auto inline-flex rounded-full bg-[#7B2D3E] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
              전자서명 완료
            </div>
            <p className="mt-3 text-sm font-semibold text-[#4A1728]">{signedName}</p>
            <p className="mt-1 text-xs text-gray-500">서명 시각 {signedAtLabel ?? '-'}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {finalDocumentUrl ? (
                <a
                  href={finalDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[#7B2D3E]/15 bg-[#FDF2F4] px-4 py-2 text-xs font-semibold text-[#7B2D3E] transition hover:bg-white"
                >
                  확정본 보기
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center rounded-full bg-[#7B2D3E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5f2130]"
              >
                현재 화면 PDF 저장
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#3B1220] to-[#6B2435] px-10 py-12 text-center text-white">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#D4909F]">{supplier.name}</p>
            <h1 className="font-myeongjo text-3xl font-bold tracking-[0.08em]">{contractTitle}</h1>
            <div className="mx-auto mt-5 h-px w-12 bg-[#9B3D52]" />
          </div>

          <div className="space-y-8 px-10 py-10 text-[0.875rem] leading-[1.9] text-gray-700">
            <div className="rounded-xl border border-gray-100 bg-[#F8F6F7] p-6">
              <div className="grid gap-y-2.5 text-sm md:grid-cols-[7rem_1fr]">
                <span className="font-bold uppercase tracking-wider text-gray-400">갑</span>
                <span className="font-semibold text-gray-900">{supplier.name}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">대표자</span>
                <span className="font-semibold text-gray-900">{supplier.representative}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">사업자번호</span>
                <span className="font-semibold text-gray-900">{supplier.businessNumber}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">주소</span>
                <span className="font-semibold text-gray-900">{supplier.address}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">운영 주소</span>
                <span className="font-semibold text-gray-900">{supplier.storeAddress}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">연락처</span>
                <span className="font-semibold text-gray-900">{supplier.phone} / {supplier.email}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">운영시간</span>
                <span className="font-semibold text-gray-900">{supplier.hours}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">을</span>
                <span className="font-semibold text-gray-900">{order.organization}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">담당자</span>
                <span className="font-semibold text-gray-900">{snapshotOrder?.contactName || order.contactName}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">이메일</span>
                <span className="font-semibold text-gray-900">{snapshotOrder?.email || order.email || '-'}</span>
                <span className="font-bold uppercase tracking-wider text-gray-400">전화번호</span>
                <span className="font-semibold text-gray-900">{snapshotOrder?.phone || order.phone || '-'}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-[#F8F6F7] p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">계약 스냅샷</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">계약 버전</dt>
                    <dd className="font-semibold text-gray-900">{order.contract?.version ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">주문 번호</dt>
                    <dd className="font-mono text-xs text-gray-900">{snapshotOrder?.orderId || order.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">희망 납품일</dt>
                    <dd className="font-semibold text-gray-900">{snapshotOrder?.deliveryDate || order.deliveryDate || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">문서 해시</dt>
                    <dd className="break-all text-right font-mono text-[11px] text-gray-900">{order.contract?.contentHash ?? '-'}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-gray-100 bg-[#F8F6F7] p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">거래 요약</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">항목 수</dt>
                    <dd className="font-semibold text-gray-900">{quote?.items?.length ?? 0}건</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">도서 합계</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatCurrency(quote?.items?.reduce((sum, item) => sum + item.total, 0) ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">배송비</dt>
                    <dd className="font-semibold text-gray-900">{formatCurrency(quote?.shippingFee ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">총액</dt>
                    <dd className="font-semibold text-[#7B2D3E]">{formatCurrency(quote?.totalAmount ?? 0)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-7">
              {clauses.map((clause) => (
                <div key={clause.title}>
                  <h3 className="mb-2 font-myeongjo font-bold tracking-tight text-gray-900">{clause.title}</h3>
                  <p className="pl-1 leading-[1.9] text-gray-500">{clause.body}</p>
                </div>
              ))}
            </div>

            {quote?.items?.length ? (
              <div className="rounded-xl border border-gray-100 bg-[#F8F6F7] p-5">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">계약 대상 견적서</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                        <th className="py-2 pr-3">도서명</th>
                        <th className="py-2 pr-3">ISBN</th>
                        <th className="py-2 pr-3 text-right">수량</th>
                        <th className="py-2 pr-3 text-right">단가</th>
                        <th className="py-2 text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item, index) => (
                        <tr key={`${item.isbn}-${index}`} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-3 pr-3 text-gray-900">{item.title}</td>
                          <td className="py-3 pr-3 font-mono text-xs text-gray-500">{item.isbn || '-'}</td>
                          <td className="py-3 pr-3 text-right text-gray-700">{item.quantity}권</td>
                          <td className="py-3 pr-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {quote.memo ? (
                  <div className="mt-4 rounded-lg bg-white p-4 text-sm text-gray-600">
                    <p className="mb-1 font-medium text-gray-900">비고</p>
                    <p>{quote.memo}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-8 border-t border-gray-100 pt-6 md:grid-cols-2">
              <div className="space-y-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">(갑) 미옥서원</p>
                <div className="flex justify-center">
                  <div className="relative flex size-24 items-center justify-center rounded-full border-2 border-[#7B2D3E]">
                    <div className="text-center text-[11px] font-bold leading-[1.6] tracking-wider text-[#7B2D3E]">
                      <div>미</div>
                      <div>옥</div>
                      <div>서</div>
                      <div>원</div>
                    </div>
                    <div className="absolute inset-1.5 rounded-full border border-[#7B2D3E]/20" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">(을) 기관 담당자</p>
                <div className="flex justify-center">
                  {signed ? (
                    <div className="relative flex size-24 items-center justify-center rounded-full border-2 border-[#7B2D3E]">
                      <div className="max-w-[56px] break-all text-center text-[11px] font-bold leading-[1.6] tracking-wider text-[#7B2D3E]">
                        {signedName.split('').map((ch, i) => (
                          <div key={i}>{ch}</div>
                        ))}
                      </div>
                      <div className="absolute inset-1.5 rounded-full border border-[#7B2D3E]/20" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSign}
                      disabled={!canSign}
                      className="flex size-24 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-gray-200 text-[11px] font-medium text-gray-300 transition-all hover:border-[#7B2D3E] hover:bg-[#FDF2F4] hover:text-[#7B2D3E] disabled:opacity-40"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {signing ? '처리 중' : '전자서명'}
                    </button>
                  )}
                </div>
                {signed ? (
                  <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-[#7B2D3E] bg-[#FDF2F4] px-4 py-4 text-[#7B2D3E] shadow-sm">
                    <div className="inline-flex rounded-full bg-[#7B2D3E] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                      전자서명 완료
                    </div>
                    <p className="mt-3 text-lg font-bold tracking-[0.12em]">{signedName}</p>
                    <p className="mt-1 text-[11px] text-[#7B2D3E]/80">{signedAtLabel ?? '서명 시각 확인 중'}</p>
                  </div>
                ) : null}
                <p className="text-[11px] text-gray-400">{order.contactName}</p>
              </div>
            </div>

            {!signed ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">전자서명 안내</p>
                <p className="mt-2 leading-7">
                  {hasUcanSignRequest
                    ? '유캔싸인 전자서명 요청이 생성되었습니다. 아래 임베딩 영역에서 서명을 진행하거나, 카카오 알림을 통해 서명을 완료해 주세요.'
                    : '아직 유캔싸인 전자서명 요청이 생성되지 않았습니다. 어드민이 서명 요청을 만들기 전까지는 내부 서명 방식으로만 진행할 수 있습니다.'}
                </p>
              </div>
            ) : null}

            {!signed && order.contract?.signMethod === 'embedding' ? (
              <div className="space-y-4 rounded-xl border border-[#E8C5CC] bg-[#FDF7F8] p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B2D3E]">유캔싸인 임베딩 서명</p>
                  <p className="mt-2 text-sm leading-7 text-gray-600">
                    계약서 서명은 아래 유캔싸인 화면에서 진행됩니다. 서명을 마치면 다시 이 페이지로 돌아옵니다.
                  </p>
                </div>
                {loadingUcanSignEmbed ? (
                  <div className="flex h-[520px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <div className="size-8 animate-spin rounded-full border-4 border-[#E8C5CC] border-t-[#7B2D3E]" />
                  </div>
                ) : ucansignEmbedUrl ? (
                  <iframe
                    title="유캔싸인 전자서명"
                    src={ucansignEmbedUrl}
                    className="h-[720px] w-full rounded-xl border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                    유캔싸인 서명 화면을 불러오지 못했습니다. 잠시 후 새로고침하거나 관리자에게 다시 서명 요청을 생성해 달라고 요청해 주세요.
                  </div>
                )}
              </div>
            ) : null}

            {!signed && order.contract?.signMethod === 'kakao' ? (
              <div className="space-y-3 rounded-xl border border-[#fae58d] bg-[#fffbe6] p-5 text-sm text-[#614700]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ad6800]">카카오 서명 대기</p>
                <p>카카오 알림톡으로 전송된 유캔싸인 링크에서 전자서명을 진행해 주세요.</p>
              </div>
            ) : null}

            {showLegacyInternalSigning ? (
              <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                <p className="text-center font-medium">계약 체결 전 아래 내용을 모두 확인해 주세요.</p>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={agreeElectronic} onChange={(e) => setAgreeElectronic(e.target.checked)} className="mt-1" />
                  <span>본인은 전자문서 형태의 계약 체결에 동의하며, 전자 서명이 서면 서명과 동일한 효력을 가짐을 확인합니다.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
                  <span>계약 대상 견적서, 수량, 공급가, 배송비, 총액, 납품일 등 거래 조건을 확인하고 그 내용에 동의합니다.</span>
                </label>
                <div className="space-y-2">
                  <label htmlFor="signer-name" className="block text-xs font-bold uppercase tracking-wide text-amber-700">
                    서명자 이름 확인
                  </label>
                  <input
                    id="signer-name"
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={order.contactName}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#7B2D3E]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!canSign}
                  className="flex w-full items-center justify-center rounded-xl bg-[#7B2D3E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5f2130] disabled:cursor-not-allowed disabled:bg-[#7B2D3E]/40"
                >
                  {signing ? '전자서명 처리 중...' : '동의 후 전자서명 완료하기'}
                </button>
              </div>
            ) : null}

            {auditTrail ? (
              <div className="rounded-xl border border-gray-100 bg-[#F8F6F7] p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">감사 로그</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">서명 시각</dt>
                    <dd className="font-semibold text-gray-900">{new Date(auditTrail.signedAt).toLocaleString('ko-KR')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">서명자</dt>
                    <dd className="font-semibold text-gray-900">{auditTrail.signerName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">IP</dt>
                    <dd className="font-mono text-xs text-gray-900">{auditTrail.signerIp || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-400">브라우저</dt>
                    <dd className="line-clamp-2 max-w-[60%] text-right text-xs text-gray-900">{auditTrail.signerUserAgent || '-'}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2 text-xs font-medium tracking-wide text-gray-600 transition-colors hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
          >
            인쇄 / PDF 저장
          </button>
          <Link href="/bulk-order" className="text-xs font-medium tracking-wide text-gray-400 transition-colors hover:text-[#7B2D3E]">
            대량구매 서비스로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
