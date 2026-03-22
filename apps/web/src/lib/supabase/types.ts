export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/* ─────────────────────────────────────────────────────────────────────────
   Database 타입 — Supabase 테이블 구조 정의
   Firebase Auth UID는 text로 저장 (user_id 컬럼)
   Firebase Storage URL은 text로 저장 (image_url, cover_image 등)
───────────────────────────────────────────────────────────────────────── */

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          isbn: string;
          slug: string;
          title: string;
          author: string;
          publisher: string;
          description: string;
          cover_image: string;
          list_price: number;
          sale_price: number;
          category: string;
          status: 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';
          is_active: boolean;
          publish_date: string | null;
          rating: number;
          rating_total: number;
          review_count: number;
          sales_count: number;
          table_of_contents: string;
          synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['books']['Row']> & {
          isbn: string; slug: string; title: string;
        };
        Update: Partial<Database['public']['Tables']['books']['Row']>;
      };

      orders: {
        Row: {
          order_id: string;
          user_id: string | null;
          guest_phone: string | null;
          status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'cancelled_by_customer' | 'return_requested' | 'return_completed' | 'exchange_requested' | 'exchange_completed';
          shipping_status: 'ready' | 'shipped' | 'delivered';
          items: Json;
          total_price: number;
          shipping_fee: number;
          shipping_address: Json | null;
          tracking_number: string | null;
          carrier: string | null;
          payment_key: string | null;
          return_status: string | null;
          return_reason: string | null;
          created_at: string;
          expires_at: string | null;
          paid_at: string | null;
          cancelled_at: string | null;
          delivered_at: string | null;
          updated_at: string | null;
          return_completed_at: string | null;
          exchange_completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & {
          order_id: string; items: Json; total_price: number; shipping_fee: number;
        };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };

      inventory: {
        Row: { isbn: string; stock: number; reserved: number; updated_at: string };
        Insert: { isbn: string; stock?: number; reserved?: number };
        Update: { stock?: number; reserved?: number; updated_at?: string };
      };

      reviews: {
        Row: {
          review_id: string;
          book_isbn: string;
          user_id: string;
          user_name: string;
          rating: number;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'review_id' | 'created_at'> & { review_id?: string };
        Update: Partial<Database['public']['Tables']['reviews']['Row']>;
      };

      events: {
        Row: {
          event_id: string;
          title: string;
          description: string;
          image_url: string;
          type: 'book_concert' | 'author_talk' | 'book_club';
          date: string | null;
          location: string;
          capacity: number;
          registered_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']> & { title: string; type: string };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };

      event_registrations: {
        Row: {
          registration_id: string;
          event_id: string;
          event_title: string;
          user_id: string;
          user_name: string;
          user_email: string;
          phone: string;
          address: string;
          privacy_accepted: boolean;
          retention_quarter: string;
          status: string;
          cancel_reason: string;
          created_at: string;
          updated_at: string | null;
          cancelled_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['event_registrations']['Row']> & {
          event_id: string; user_id: string;
        };
        Update: Partial<Database['public']['Tables']['event_registrations']['Row']>;
      };

      articles: {
        Row: {
          article_id: string;
          slug: string;
          type: 'author_interview' | 'bookstore_story' | 'publisher_story';
          title: string;
          content: string;
          thumbnail_url: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['articles']['Row']> & { slug: string; title: string; type: string };
        Update: Partial<Database['public']['Tables']['articles']['Row']>;
      };

      // CMS, Settings — key/value 싱글톤
      cms: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key: string; value: Json };
        Update: { value?: Json; updated_at?: string };
      };

      settings: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key: string; value: Json };
        Update: { value?: Json; updated_at?: string };
      };

      concerts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          is_active: boolean;
          image_url: string;
          table_rows: Json;
          book_isbns: string[];
          description: string;
          google_maps_embed_url: string;
          booking_url: string;
          booking_label: string;
          booking_notice_title: string;
          booking_notice_body: string;
          fee_label: string;
          fee_note: string;
          host_note: string;
          status_badge: string;
          ticket_price: number;
          ticket_open: boolean;
          ticket_sold_count: number;
          date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['concerts']['Row']> & { title: string; slug: string };
        Update: Partial<Database['public']['Tables']['concerts']['Row']>;
      };

      youtube_contents: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          youtube_id: string;
          thumbnail_url: string;
          is_published: boolean;
          order: number;
          related_youtube_ids: string[];
          related_isbns: string[];
          published_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['youtube_contents']['Row']> & { slug: string; title: string; youtube_id: string };
        Update: Partial<Database['public']['Tables']['youtube_contents']['Row']>;
      };

      bulk_orders: {
        Row: {
          id: string;
          organization: string;
          contact_name: string;
          phone: string;
          email: string;
          delivery_date: string;
          status: string;
          books: Json;
          notes: string;
          quote: Json | null;
          contract: Json | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['bulk_orders']['Row']>;
        Update: Partial<Database['public']['Tables']['bulk_orders']['Row']>;
      };

      user_profiles: {
        Row: {
          uid: string;
          display_name: string | null;
          email: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { uid: string; display_name?: string; email?: string; phone?: string; role?: string };
        Update: Partial<Database['public']['Tables']['user_profiles']['Row']>;
      };
    };
  };
}
