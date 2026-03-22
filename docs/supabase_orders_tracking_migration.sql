-- Orders tracking columns for manual shipment operations
-- Apply in Supabase Dashboard > SQL Editor

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
