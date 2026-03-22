import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_STORE_SETTINGS,
  sanitizeStoreSettings,
  STORE_SETTINGS_KEY,
  type StoreSettings,
} from '@/lib/store-settings';

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!supabaseAdmin) {
    return DEFAULT_STORE_SETTINGS;
  }

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', STORE_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.error('[store-settings] failed to load settings', error);
    return DEFAULT_STORE_SETTINGS;
  }

  return sanitizeStoreSettings(data?.value);
}
