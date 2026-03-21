import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[supabase/admin] Supabase server credentials are not configured');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseServiceKey || 'missing-service-role-key',
  {
    auth: { persistSession: false },
  },
);
