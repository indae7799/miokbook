import BulkInquiryModal from './BulkInquiryModal';

export const revalidate = 3600;

export const metadata = {
  title: '대량구매 서비스 | 미옥서원',
  description: '기관·단체 도서 구매를 간편하게. 견적부터 배송까지 한번에.',
};

export default function BulkOrderPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2C0D1A] via-[#4A1728] to-[#6B2435] text-white py-28 px-4">
        <div className="w-full text-center px-4 sm:px-8">
          <p className="text-[#E8A8B8] text-[16px] font-bold uppercase tracking-[0.35em] mb-6">
            기관 · 단체 · 학원 전용
          </p>
          <h1 className="font-myeongjo text-[2rem] sm:text-5xl md:text-[3.75rem] font-bold leading-[1.2] tracking-tight mb-6">
            도서 대량구매,<br />
            미옥서원에 맡기세요
          </h1>
          <p className="text-[#D4909F] text-[17px] leading-loose max-w-lg mx-auto mb-12">
            도서 목록과 수량을 알려주시면<br />맞춤 견적서와 전자 계약서를 제공합니다.
          </p>
          <BulkInquiryModal triggerClassName="inline-flex items-center gap-2.5 bg-white text-[#4A1728] font-bold px-10 py-4 rounded-full text-[15px] tracking-wide shadow-2xl hover:bg-[#FDF2F4] transition-all" />
        </div>
      </section>

      {/* 이용 혜택 */}
      <section className="py-24 bg-white">
        <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-[13px] font-black text-[#7B2D3E] uppercase tracking-[0.25em] mb-3">Why Miok</p>
            <h2 className="font-myeongjo text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              미옥서원을 선택하는 이유
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                svg: (
                  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                ),
                title: '맞춤 견적서',
                desc: '도서 목록·수량·예산 조건에 맞는 견적서를 발행합니다. 도서정가제를 준수한 합리적인 공급가를 제공합니다.',
              },
              {
                svg: (
                  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                ),
                title: '후불·세금계산서',
                desc: '전자세금계산서 발행 및 카드결제를 지원합니다. 납품 기준으로 정산하는 후불 방식도 가능합니다.',
              },
              {
                svg: (
                  <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
                title: '전문 단체 배송',
                desc: '지정일 납품 및 목적지별 묶음 배송이 가능합니다. 학교·학원·기관 전용 배송 프로세스로 안전하게 처리합니다.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border-2 border-gray-300 bg-white p-9 shadow-sm transition-colors group hover:border-[#B87A88] hover:bg-[#FDF2F4] hover:shadow-md"
              >
                <div className="size-13 rounded-xl border-2 border-gray-200 group-hover:border-[#E8C5CC] flex items-center justify-center text-gray-500 group-hover:text-[#7B2D3E] mb-6 transition-all">
                  {item.svg}
                </div>
                <h3 className="font-myeongjo text-xl font-bold text-gray-900 mb-3 tracking-tight group-hover:text-[#6B2435] transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 이용절차 */}
      <section className="py-24 bg-[#F8F6F7]">
        <div className="w-full px-8">
          <div className="mb-14 text-center">
            <p className="text-[13px] font-black text-[#7B2D3E] uppercase tracking-[0.25em] mb-3">Process</p>
            <h2 className="font-myeongjo text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              이용절차 안내
            </h2>
          </div>
          <div className="max-w-xl mx-auto">
            {[
              { step: '01', title: '견적 문의', desc: '도서명·ISBN·수량·납품 희망일을 입력하여 온라인 폼으로 접수합니다.' },
              { step: '02', title: '견적서 발송', desc: '담당자가 확인 후 맞춤 견적서를 이메일로 발송합니다. (1~2 영업일)' },
              {
                step: '03',
                title: '전자 계약 체결',
                // U+2060: '합니다'가 '합니' / '다.' 로 끊기지 않도록
                desc: '온라인 전자 계약서를 확인하고 서명합니\u2060다. 도서정가제를 준수합니다.',
              },
              { step: '04', title: '납품 및 정산', desc: '지정일에 단체 배송 후 납품 완료 시 세금계산서를 발행합니다.' },
            ].map((item, idx, arr) => (
              <div key={item.step}>
                <div className="flex w-full items-center gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#7B2D3E] text-white shadow-md shadow-[#7B2D3E]/20">
                      <span className="text-[9px] font-bold leading-none tracking-widest text-[#E8A8B8]">STEP</span>
                      <span className="mt-0.5 text-2xl font-black leading-tight">{item.step}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1.5 font-myeongjo text-[24px] font-bold tracking-tight text-gray-900">{item.title}</h3>
                    <p className="break-keep text-[15px] leading-relaxed text-gray-500">{item.desc}</p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex w-full gap-6">
                    <div className="flex w-20 shrink-0 justify-center py-2">
                      <div className="h-12 w-px bg-[#E8C5CC]" />
                    </div>
                    <div className="min-w-0 flex-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 문의 CTA */}
      <section className="py-28 bg-gradient-to-br from-[#2C0D1A] via-[#4A1728] to-[#6B2435] text-white">
        <div className="w-full text-center px-8">
          <p className="text-[13px] font-bold text-[#E8A8B8] uppercase tracking-[0.3em] mb-5">Contact</p>
          <h2 className="font-myeongjo text-3xl md:text-4xl font-bold mb-5 tracking-tight">
            지금 바로 문의하세요
          </h2>
          <p className="text-[#C4849A] text-[16px] leading-relaxed mb-12">
            견적 문의부터 납품까지, 전담 담당자가 처음부터 끝까지 안내합니다.
          </p>
          <BulkInquiryModal triggerClassName="inline-flex items-center gap-2.5 bg-white text-[#4A1728] font-bold px-12 py-4 rounded-full text-[15px] tracking-wide shadow-2xl hover:bg-[#FDF2F4] transition-all mb-12" />
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <span className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#E8A8B8] block mb-1">전화</span>
              <span className="text-[16px] text-[#F0D0D8]">02-569-1643</span>
            </span>
            <span className="w-px h-10 bg-[#7B3048] hidden sm:block" />
            <span className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#E8A8B8] block mb-1">이메일</span>
              <span className="text-[16px] text-[#F0D0D8]">miokbooks@naver.com</span>
            </span>
            <span className="w-px h-10 bg-[#7B3048] hidden sm:block" />
            <span className="text-center">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#E8A8B8] block mb-1">운영시간</span>
              <span className="text-[16px] text-[#F0D0D8]">평일 09:00–18:00</span>
            </span>
          </div>
        </div>
      </section>

    </main>
  );
}
