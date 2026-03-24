import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EventType } from '@/lib/eventLabels';
export type { EventType } from '@/lib/eventLabels';
export { getEventTypeLabel } from '@/lib/eventLabels';

export interface EventListItem {
  eventId: string;
  title: string;
  type: string;
  description?: string;
  imageUrl: string;
  date: string;
  location?: string;
  capacity: number;
  registeredCount: number;
}

export async function getEventsList(typeFilter: EventType): Promise<EventListItem[]> {
  if (isUiDesignMode()) return [];
  if (!supabaseAdmin) return [];
  return getOrSet('events', `list:${typeFilter || 'all'}`, TTL.EVENTS, async () => {
    try {
      let query = supabaseAdmin
        .from('events')
        .select('event_id, title, type, description, image_url, date, location, capacity, registered_count')
        .eq('is_active', true)
        .order('date', { ascending: false });

      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((row) => ({
        eventId: row.event_id,
        title: row.title ?? '',
        type: row.type ?? '',
        description: row.description ?? undefined,
        imageUrl: row.image_url ?? '',
        date: row.date ?? '',
        location: row.location ?? undefined,
        capacity: Number(row.capacity ?? 0),
        registeredCount: Number(row.registered_count ?? 0),
      }));
    } catch {
      return [];
    }
  });
}

export async function getEventById(eventId: string): Promise<EventListItem | null> {
  if (isUiDesignMode()) return null;
  if (!supabaseAdmin) return null;
  return getOrSet('event', `detail:${eventId}`, TTL.EVENT, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('event_id, title, type, description, image_url, date, location, capacity, registered_count')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        eventId: data.event_id,
        title: data.title ?? '',
        type: data.type ?? '',
        description: data.description ?? undefined,
        imageUrl: data.image_url ?? '',
        date: data.date ?? '',
        location: data.location ?? undefined,
        capacity: Number(data.capacity ?? 0),
        registeredCount: Number(data.registered_count ?? 0),
      };
    } catch {
      return null;
    }
  });
}
