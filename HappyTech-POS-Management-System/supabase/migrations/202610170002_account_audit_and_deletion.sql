-- Apply AFTER 202610170001_admin_management.sql. Safe to rerun.
-- Audit snapshots preserve the person and role even if the linked auth user is hard-deleted.
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS actor_name text;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS target_name text;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS target_role text;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS reason text;

UPDATE public.system_logs l
SET actor_name = COALESCE(l.actor_name, p.name), actor_role = COALESCE(l.actor_role, p.role)
FROM public.profiles p
WHERE l.actor_id = p.id AND (l.actor_name IS NULL OR l.actor_role IS NULL);
UPDATE public.system_logs l
SET target_name = COALESCE(l.target_name, p.name), target_role = COALESCE(l.target_role, p.role)
FROM public.profiles p
WHERE l.target_id = p.id AND (l.target_name IS NULL OR l.target_role IS NULL);

CREATE INDEX IF NOT EXISTS system_logs_created_at_desc_idx ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_actor_id_idx ON public.system_logs(actor_id);
CREATE INDEX IF NOT EXISTS system_logs_actor_role_idx ON public.system_logs(actor_role);
CREATE INDEX IF NOT EXISTS system_logs_target_role_idx ON public.system_logs(target_role);

-- Never grant direct client read/write access to account audit records.
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_logs FROM anon, authenticated;

-- NOTE: Hard-deleted users must not have sales/inventory records FK-dependent on auth.users
-- when the transaction backend is introduced. For production, prefer archiving instead.
