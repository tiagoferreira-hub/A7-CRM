-- Backfill profiles.company_id from user_roles when missing (admins/sellers)
UPDATE public.profiles p
SET company_id = ur.company_id, updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = p.user_id
  AND p.company_id IS NULL
  AND ur.company_id IS NOT NULL
  AND ur.role IN ('admin','seller','client');

-- Keep them in sync going forward: when a user_role with company_id is inserted/updated, mirror to profile
CREATE OR REPLACE FUNCTION public.sync_profile_company_from_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND NEW.role IN ('admin','seller','client') THEN
    UPDATE public.profiles
    SET company_id = NEW.company_id, updated_at = now()
    WHERE user_id = NEW.user_id AND (company_id IS DISTINCT FROM NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_company_from_role ON public.user_roles;
CREATE TRIGGER trg_sync_profile_company_from_role
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_company_from_role();