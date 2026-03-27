import type { BulkContractAuditTrail, BulkContractSnapshot } from '@/lib/bulk-contract';
import { getAdminBucket } from '@/lib/firebase/admin';

type FinalDocumentInput = {
  orderId: string;
  signerName: string;
  signedAt: string;
  contentHash: string;
  snapshot: BulkContractSnapshot;
  auditTrail: BulkContractAuditTrail;
};

export type BulkContractFinalDocument = {
  path: string;
  url: string;
  contentType: 'text/html';
  generatedAt: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function buildItemsHtml(snapshot: BulkContractSnapshot) {
  const items = snapshot.quote?.items ?? [];
  if (items.length === 0) {
    return '<p class="empty">견적 항목 정보가 없습니다.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>도서명</th>
          <th>ISBN</th>
          <th class="right">수량</th>
          <th class="right">단가</th>
          <th class="right">금액</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(item.title)}</td>
            <td>${escapeHtml(item.isbn || '-')}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">${formatNumber(item.unitPrice)}</td>
            <td class="right">${formatNumber(item.total)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function buildClausesHtml(snapshot: BulkContractSnapshot) {
  return snapshot.clauses
    .map(
      (clause) => `
        <section class="clause">
          <h3>${escapeHtml(clause.title)}</h3>
          <p>${escapeHtml(clause.body)}</p>
        </section>
      `,
    )
    .join('');
}

function buildFinalDocumentHtml(input: FinalDocumentInput) {
  const { snapshot, signerName, signedAt, contentHash, auditTrail, orderId } = input;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(snapshot.title)} - ${escapeHtml(orderId)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 40px 24px; background: #f5f1f2; color: #1f2937; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; }
    .page { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #ead8dd; box-shadow: 0 12px 36px rgba(74, 23, 40, 0.08); }
    .hero { padding: 40px; background: linear-gradient(135deg, #3b1220, #6b2435); color: #fff; text-align: center; }
    .hero p { margin: 0 0 10px; font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; color: #d9a3af; }
    .hero h1 { margin: 0; font-size: 30px; }
    .content { padding: 32px 40px 40px; line-height: 1.8; }
    .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { border: 1px solid #ece8ea; background: #faf7f8; border-radius: 16px; padding: 18px 20px; }
    .card h2 { margin: 0 0 12px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.12em; }
    .row { display: flex; justify-content: space-between; gap: 16px; margin: 8px 0; font-size: 14px; }
    .row strong { color: #111827; text-align: right; }
    .clause { margin: 18px 0; }
    .clause h3 { margin: 0 0 8px; font-size: 17px; color: #111827; }
    .clause p { margin: 0; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 10px; border-bottom: 1px solid #ece8ea; text-align: left; vertical-align: top; }
    thead th { font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .right { text-align: right; }
    .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 28px; }
    .seal { border: 1px solid #ead8dd; border-radius: 18px; padding: 22px; text-align: center; min-height: 190px; }
    .seal h4 { margin: 0 0 16px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.12em; }
    .stamp { display: inline-flex; align-items: center; justify-content: center; width: 112px; height: 112px; border-radius: 999px; border: 3px solid #7b2d3e; color: #7b2d3e; font-weight: 800; font-size: 13px; line-height: 1.6; }
    .signed-box { display: inline-block; border: 2px solid #7b2d3e; border-radius: 16px; padding: 14px 18px; color: #7b2d3e; background: #fff8fa; }
    .signed-box strong { display: block; font-size: 18px; margin-bottom: 6px; }
    .meta { margin-top: 10px; font-size: 13px; color: #4b5563; }
    .footer { margin-top: 28px; border-top: 1px solid #ece8ea; padding-top: 18px; font-size: 12px; color: #6b7280; }
    .empty { margin: 0; color: #6b7280; font-size: 14px; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border: none; }
      .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <article class="page">
    <header class="hero">
      <p>${escapeHtml(snapshot.supplier.name)}</p>
      <h1>${escapeHtml(snapshot.title)}</h1>
    </header>
    <div class="content">
      <section class="summary">
        <div class="card">
          <h2>계약 정보</h2>
          <div class="row"><span>계약 버전</span><strong>${escapeHtml(snapshot.version)}</strong></div>
          <div class="row"><span>주문 번호</span><strong>${escapeHtml(snapshot.order.orderId)}</strong></div>
          <div class="row"><span>납품 희망일</span><strong>${escapeHtml(snapshot.order.deliveryDate || '-')}</strong></div>
          <div class="row"><span>문서 해시</span><strong>${escapeHtml(contentHash)}</strong></div>
        </div>
        <div class="card">
          <h2>서명 정보</h2>
          <div class="row"><span>서명자</span><strong>${escapeHtml(signerName)}</strong></div>
          <div class="row"><span>서명 시각</span><strong>${escapeHtml(new Date(signedAt).toLocaleString('ko-KR'))}</strong></div>
          <div class="row"><span>서명 IP</span><strong>${escapeHtml(auditTrail.signerIp || '-')}</strong></div>
          <div class="row"><span>전자계약 동의</span><strong>${auditTrail.agreedToElectronicContract ? '예' : '아니오'}</strong></div>
        </div>
      </section>

      <section class="summary">
        <div class="card">
          <h2>갑 정보</h2>
          <div class="row"><span>상호</span><strong>${escapeHtml(snapshot.supplier.name)}</strong></div>
          <div class="row"><span>대표자</span><strong>${escapeHtml(snapshot.supplier.representative)}</strong></div>
          <div class="row"><span>사업자번호</span><strong>${escapeHtml(snapshot.supplier.businessNumber)}</strong></div>
          <div class="row"><span>주소</span><strong>${escapeHtml(snapshot.supplier.address)}</strong></div>
        </div>
        <div class="card">
          <h2>을 정보</h2>
          <div class="row"><span>기관명</span><strong>${escapeHtml(snapshot.order.organization)}</strong></div>
          <div class="row"><span>담당자</span><strong>${escapeHtml(snapshot.order.contactName)}</strong></div>
          <div class="row"><span>이메일</span><strong>${escapeHtml(snapshot.order.email || '-')}</strong></div>
          <div class="row"><span>연락처</span><strong>${escapeHtml(snapshot.order.phone || '-')}</strong></div>
        </div>
      </section>

      ${buildClausesHtml(snapshot)}

      <section class="clause">
        <h3>계약 대상 견적서</h3>
        ${buildItemsHtml(snapshot)}
        <div class="row"><span>배송비</span><strong>${formatNumber(snapshot.quote?.shippingFee ?? 0)}</strong></div>
        <div class="row"><span>총액</span><strong>${formatNumber(snapshot.quote?.totalAmount ?? 0)}</strong></div>
        <div class="row"><span>유효기한</span><strong>${escapeHtml(snapshot.quote?.validUntil || '-')}</strong></div>
      </section>

      <section class="signatures">
        <div class="seal">
          <h4>갑 미옥서원</h4>
          <div class="stamp">미<br/>옥<br/>서<br/>원</div>
          <p class="meta">${escapeHtml(snapshot.supplier.representative)} / ${escapeHtml(snapshot.supplier.businessNumber)}</p>
        </div>
        <div class="seal">
          <h4>을 기관 담당자</h4>
          <div class="signed-box">
            <strong>${escapeHtml(signerName)}</strong>
            전자서명 완료
          </div>
          <p class="meta">${escapeHtml(new Date(signedAt).toLocaleString('ko-KR'))}</p>
        </div>
      </section>

      <div class="footer">
        본 문서는 미옥서원 대량구매 계약 확정본입니다. 체결 시점 계약 스냅샷과 서명 로그를 기준으로 생성되었습니다.
      </div>
    </div>
  </article>
</body>
</html>`;
}

export async function storeBulkContractFinalDocument(input: FinalDocumentInput): Promise<BulkContractFinalDocument | null> {
  const bucket = await getAdminBucket();
  if (!bucket) return null;

  const safeSignedAt = input.signedAt.replace(/[:.]/g, '-');
  const path = `bulk-order/contracts/${input.orderId}/final-${safeSignedAt}.html`;
  const generatedAt = new Date().toISOString();
  const html = buildFinalDocumentHtml(input);
  const file = bucket.file(path);

  await file.save(Buffer.from(html, 'utf8'), {
    metadata: {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'private, max-age=0, no-cache',
    },
    resumable: false,
  });

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '2035-01-01',
  });

  return {
    path,
    url,
    contentType: 'text/html',
    generatedAt,
  };
}
