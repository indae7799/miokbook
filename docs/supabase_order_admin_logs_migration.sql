CREATE TABLE IF NOT EXISTS public.order_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  actor_uid TEXT,
  actor_email TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_admin_logs_order_id_created_at
  ON public.order_admin_logs(order_id, created_at DESC);
