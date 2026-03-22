import { cn } from '@/lib/utils';

interface PaymentBenefitPlaceholderProps {
  compact?: boolean;
  title?: string;
  /** 부모 flex 열에서 남는 높이 채울 때: h-full min-h-0 flex flex-col 등 */
  className?: string;
}

export default function PaymentBenefitPlaceholder({
  compact = false,
  title = '결제 혜택 안내',
  className,
}: PaymentBenefitPlaceholderProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col rounded-2xl border border-[#722f37]/12 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe6_100%)] shadow-[0_18px_40px_-34px_rgba(114,47,55,0.26)]',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e6f61]">
            Payment Benefit
          </p>
          <h3 className={cn('mt-1 font-semibold text-[#241916]', compact ? 'text-[15px]' : 'text-[17px]')}>
            {title}
          </h3>
        </div>
        <span className="rounded-full border border-[#722f37]/12 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#722f37]">
          준비중
        </span>
      </div>

      <div
        className={cn(
          'mt-4 grid min-h-0 flex-1 gap-2.5 auto-rows-fr',
          compact ? 'grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        <div className="flex min-h-0 flex-col rounded-xl bg-white/78 px-3.5 py-3">
          <p className="text-xs font-medium text-[#2e211d]">카드 즉시할인</p>
          <p className="mt-1 flex-1 text-xs leading-5 text-[#6d5a52]">
            토스 프로모션 연동 시 카드사별 할인 혜택을 이 영역에 노출할 예정입니다.
          </p>
        </div>
        <div className="flex min-h-0 flex-col rounded-xl bg-white/78 px-3.5 py-3">
          <p className="text-xs font-medium text-[#2e211d]">무이자 할부</p>
          <p className="mt-1 flex-1 text-xs leading-5 text-[#6d5a52]">
            적용 가능한 무이자 할부 개월 수와 조건을 결제 전에 확인할 수 있게 연결할 예정입니다.
          </p>
        </div>
      </div>

      <p className="mt-3 shrink-0 text-[11px] leading-5 text-[#8e6f61]">
        현재는 임시 영역이며, 실제 혜택 데이터는 토스페이먼츠 연동 후 자동 치환됩니다.
      </p>
    </section>
  );
}
