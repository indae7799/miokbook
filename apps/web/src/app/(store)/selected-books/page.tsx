import { getSelectedBooksData } from '@/lib/store/selected-books';
import SelectedBooksClient from './SelectedBooksClient';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 3600;

export const metadata = {
  title: '선정도서 | 씨앤에이논술',
  description: '씨앤에이논술 강사진이 학년별로 선정한 읽기 도서 목록입니다.',
};

export default async function SelectedBooksPage() {
  let data = await getSelectedBooksData().catch(() => ({
    banner: null,
    grades: {},
  }));

  return <SelectedBooksClient banner={data.banner} grades={data.grades} />;
}
