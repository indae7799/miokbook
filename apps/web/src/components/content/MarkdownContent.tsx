import ReactMarkdown from 'react-markdown';
import { Download } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function getFileExt(text: string): string {
  const match = text.match(/\.([a-zA-Z0-9]+)(?:\s*$|\s)/);
  return match ? match[1].toUpperCase() : 'FILE';
}

function AttachmentCard({ href, children }: { href?: string; children?: React.ReactNode }) {
  const label = typeof children === 'string' ? children.replace(/^📎\s*/, '') : String(children ?? '');
  const ext = getFileExt(label);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="my-2 flex w-full items-center gap-3 rounded-xl border border-[#e8e0d6] bg-[#fdf9f4] px-4 py-3 text-sm text-[#4a3728] no-underline transition-colors hover:border-[#c4a882] hover:bg-[#f5ede0]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#722f37]/10 text-[10px] font-bold text-[#722f37]">
        {ext}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <Download className="size-4 shrink-0 text-[#9c7c65]" />
    </a>
  );
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 text-foreground">{children}</p>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-2 mt-6 text-2xl font-bold">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-2 mt-4 text-xl font-semibold">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-2 mt-3 text-lg font-semibold">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-3 list-decimal pl-6">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="mb-1">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const text = typeof children === 'string' ? children : '';
    if (text.startsWith('📎')) {
      return <AttachmentCard href={href}>{children}</AttachmentCard>;
    }
    return (
      <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- markdown body image
    <img
      src={src}
      alt={alt ?? ''}
      className="mb-4 mt-4 w-full rounded-xl border border-border object-cover shadow-sm"
      loading="lazy"
    />
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-muted-foreground/50 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
};

/** 관리자에서 입력한 마크다운 본문을 공개 페이지에서 동일하게 렌더링 */
export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`text-foreground ${className ?? ''}`}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
