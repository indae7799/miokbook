import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
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
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
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
    <blockquote className="border-l-4 border-muted-foreground/50 pl-4 italic text-muted-foreground">{children}</blockquote>
  ),
};

/** 관리자에서 입력한 마크다운 본문을 공개 페이지에서 동일하게 렌더링 (거짓완료 방지) */
export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`text-foreground ${className ?? ''}`}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
