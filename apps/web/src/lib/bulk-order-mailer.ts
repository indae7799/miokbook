import nodemailer from 'nodemailer';
import { BULK_CONTRACT_SUPPLIER } from '@/lib/bulk-contract';

type QuoteItem = {
  title: string;
  isbn: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type QuotePayload = {
  items: QuoteItem[];
  shippingFee: number;
  totalAmount: number;
  validUntil: string;
  memo: string;
};

function getTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendBulkOrderQuoteEmail(input: {
  to: string;
  orderId: string;
  organization: string;
  contactName: string;
  quote: QuotePayload;
  baseUrl: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[bulk-order-mailer] Gmail credentials not configured');
    return;
  }

  const gmailUser = process.env.GMAIL_USER!;
  const quoteUrl = `${input.baseUrl}/bulk-order/quote/${input.orderId}`;
  const contractUrl = `${input.baseUrl}/bulk-order/contract/${input.orderId}`;
  const itemRows = input.quote.items.map((item) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(item.title)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${item.quantity}권</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${formatCurrency(item.total)}</td>
    </tr>`).join('');

  await transporter.sendMail({
    from: `"미옥서원 대량구매" <${gmailUser}>`,
    to: input.to,
    bcc: BULK_CONTRACT_SUPPLIER.email,
    subject: `[미옥서원] 대량구매 견적서가 도착했습니다 (${input.organization})`,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 32px;">
          <h2 style="margin:0 0 12px; color:#111827;">대량구매 견적서를 보내드립니다.</h2>
          <p style="margin:0 0 20px; color:#4b5563; line-height:1.7;">${escapeHtml(input.contactName)}님, 요청하신 <strong>${escapeHtml(input.organization)}</strong> 견적이 준비되었습니다. 아래 링크에서 견적을 확인한 뒤, 내용에 동의하시면 전자계약까지 진행하실 수 있습니다.</p>
          <div style="background:#f8f6f7; border-radius:12px; padding:16px 18px; margin-bottom:20px;">
            <p style="margin:0 0 8px; color:#6b7280; font-size:13px;">견적 번호</p>
            <p style="margin:0; font-family:monospace; color:#111827;">${input.orderId}</p>
            <p style="margin:12px 0 0; color:#6b7280; font-size:13px;">유효기한</p>
            <p style="margin:0; color:#111827;">${escapeHtml(input.quote.validUntil || '-')}</p>
            <p style="margin:12px 0 0; color:#6b7280; font-size:13px;">총액</p>
            <p style="margin:0; color:#7b2d3e; font-weight:700;">${formatCurrency(input.quote.totalAmount)}</p>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
            <thead>
              <tr>
                <th style="padding:8px 0; border-bottom:2px solid #7b2d3e; text-align:left; color:#6b7280;">도서명</th>
                <th style="padding:8px 0; border-bottom:2px solid #7b2d3e; text-align:right; color:#6b7280;">수량</th>
                <th style="padding:8px 0; border-bottom:2px solid #7b2d3e; text-align:right; color:#6b7280;">금액</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:18px;">
            <a href="${quoteUrl}" style="display:inline-block; background:#7b2d3e; color:white; text-decoration:none; padding:12px 18px; border-radius:999px; font-weight:700;">견적서 확인하기</a>
            <a href="${contractUrl}" style="display:inline-block; background:white; color:#7b2d3e; text-decoration:none; padding:12px 18px; border-radius:999px; border:1px solid #d1d5db; font-weight:700;">전자계약 바로가기</a>
          </div>
          <p style="margin:0; color:#6b7280; font-size:13px; line-height:1.7;">문의: ${BULK_CONTRACT_SUPPLIER.phone} / ${BULK_CONTRACT_SUPPLIER.email}</p>
        </div>
      </div>
    `,
  });
}

export async function sendBulkOrderContractSignedEmail(input: {
  to: string;
  orderId: string;
  organization: string;
  contactName: string;
  signerName: string;
  signedAt: string;
  baseUrl: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[bulk-order-mailer] Gmail credentials not configured');
    return;
  }

  const gmailUser = process.env.GMAIL_USER!;
  const contractUrl = `${input.baseUrl}/bulk-order/contract/${input.orderId}`;
  const signedAtLabel = new Date(input.signedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  await transporter.sendMail({
    from: `"미옥서원 대량구매" <${gmailUser}>`,
    to: input.to,
    bcc: BULK_CONTRACT_SUPPLIER.email,
    subject: `[미옥서원] 전자계약이 체결되었습니다 (${input.organization})`,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 32px;">
          <h2 style="margin:0 0 12px; color:#111827;">전자계약 체결이 완료되었습니다.</h2>
          <p style="margin:0 0 20px; color:#4b5563; line-height:1.7;"><strong>${escapeHtml(input.signerName)}</strong>님 명의로 ${signedAtLabel}에 전자계약이 체결되었습니다.</p>
          <div style="background:#f8f6f7; border-radius:12px; padding:16px 18px; margin-bottom:20px;">
            <p style="margin:0 0 8px; color:#6b7280; font-size:13px;">기관명</p>
            <p style="margin:0; color:#111827;">${escapeHtml(input.organization)}</p>
            <p style="margin:12px 0 0; color:#6b7280; font-size:13px;">견적/계약 번호</p>
            <p style="margin:0; font-family:monospace; color:#111827;">${input.orderId}</p>
          </div>
          <a href="${contractUrl}" style="display:inline-block; background:#7b2d3e; color:white; text-decoration:none; padding:12px 18px; border-radius:999px; font-weight:700;">체결된 계약서 보기</a>
          <p style="margin:20px 0 0; color:#6b7280; font-size:13px; line-height:1.7;">이 메일은 고객과 운영팀에 함께 발송됩니다.</p>
        </div>
      </div>
    `,
  });
}
