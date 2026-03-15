import Link from 'next/link';
import Image from 'next/image';

export interface MonthlyPickProps {
  isbn: string;
  slug: string;
  title: string;
  coverImage: string;
  description?: string;
}

export default function MonthlyPick({ slug, title, coverImage, description }: MonthlyPickProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">이달의 책</h2>
      <Link
        href={`/books/${slug}`}
        className="flex flex-col sm:flex-row gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent min-h-[48px]"
      >
        <div className="relative aspect-[2/3] w-full sm:w-40 shrink-0 rounded overflow-hidden bg-muted">
          <Image src={coverImage} alt={title} fill sizes="(max-width: 640px) 100vw, 160px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{description}</p>}
        </div>
      </Link>
    </section>
  );
}
