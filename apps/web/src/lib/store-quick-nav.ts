import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  FileText,
  GraduationCap,
  Mic2,
  Package,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const STORE_QUICK_NAV_ITEMS: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/concerts', label: '북콘서트', icon: Mic2 },
  { href: '/selected-books', label: '추천도서', icon: GraduationCap },
  { href: '/bestsellers', label: '베스트셀러', icon: TrendingUp },
  { href: '/new-books', label: '신간도서', icon: Sparkles },
  { href: '/bulk-order', label: '대량구매', icon: Package },
  { href: '/content', label: '동영상', icon: FileText },
  { href: '/events', label: '이벤트', icon: Calendar },
];

export const STORE_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/miokbookgarden_official/',
  naverBlog: 'https://blog.naver.com/miokbookgarden',
  youtube: 'https://www.youtube.com/@cnanonsul/featured',
} as const;
