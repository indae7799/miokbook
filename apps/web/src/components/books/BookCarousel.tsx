'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import BookCard, { type BookCardBook } from './BookCard';

export interface BookCarouselProps {
  books: BookCardBook[];
  title?: string;
}

export default function BookCarousel({ books, title }: BookCarouselProps) {
  if (books.length === 0) return null;

  return (
    <section className="w-full">
      {title && <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>}
      <Swiper
        spaceBetween={16}
        slidesPerView={2}
        breakpoints={{
          640: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
        className="!overflow-visible"
      >
        {books.map((book) => (
          <SwiperSlide key={book.isbn} className="!h-auto">
            <BookCard book={book} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
