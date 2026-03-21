'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import BookCard, { type BookCardBook } from './BookCard';

export interface BookCarouselProps {
  books: BookCardBook[];
  title?: string;
  /** 랜딩(교보 스타일)에서는 false */
  showCart?: boolean;
}

export default function BookCarousel({ books, title, showCart = true }: BookCarouselProps) {
  if (books.length === 0) return null;

  return (
    <section className="w-full">
      {title && <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>}
      <Swiper
        spaceBetween={21}
        slidesPerView={2}
        breakpoints={{
          640: { slidesPerView: 3 },
          768: { slidesPerView: 4 },
          1024: { slidesPerView: 5 },
          1200: { slidesPerView: 6 },
        }}
        className="!overflow-visible"
      >
        {books.map((book) => (
          <SwiperSlide key={book.isbn} className="!h-auto !w-[188px]">
            <BookCard book={book} compact showCart={showCart} smallerCover80 />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
