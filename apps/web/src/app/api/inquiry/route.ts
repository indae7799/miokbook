import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

interface InquiryBody {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  order: '주문/결제',
  delivery: '배송',
  return: '반품/교환',
  book: '도서 문의',
  event: '이벤트 문의',
  other: '기타',
};

export async function POST(request: Request) {
  try {
    const body: InquiryBody = await request.json();
    const { name, email, category, subject, message } = body;

    if (!name?.trim()) return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 });
    if (!message?.trim()) return NextResponse.json({ error: '문의 내용을 입력해 주세요.' }, { status: 400 });

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.error('[inquiry] Gmail credentials not configured');
      return NextResponse.json({ error: '이메일 서비스가 설정되지 않았습니다.' }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const categoryLabel = CATEGORY_LABEL[category] ?? category ?? '일반';
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    await transporter.sendMail({
      from: `"미옥서원 고객문의" <${gmailUser}>`,
      to: 'support.miokbook@gmail.com',
      replyTo: email,
      subject: `[1:1 문의] [${categoryLabel}] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
            <h2 style="color: #166534; margin: 0 0 24px; font-size: 20px;">미옥서원 1:1 고객문의</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 100px;">접수 일시</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${now}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">이름</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">이메일</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;"><a href="mailto:${email}" style="color: #166534;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">문의 유형</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">제목</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;">${subject}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">문의 내용</p>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; color: #111827; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          </div>
          <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #9ca3af;">이 메일은 미옥서원 웹사이트의 1:1 고객문의 시스템에서 자동 발송되었습니다.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[inquiry POST]', e);
    return NextResponse.json({ error: '문의 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
