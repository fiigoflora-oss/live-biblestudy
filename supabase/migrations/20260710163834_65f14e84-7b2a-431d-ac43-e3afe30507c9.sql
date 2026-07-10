
-- 1. Tighten group_memberships INSERT policy: self-joins must be member/pending
DROP POLICY IF EXISTS "Users join groups themselves" ON public.group_memberships;
CREATE POLICY "Users join groups themselves"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'member'::group_role
    AND status = 'pending'
  );

-- Also ensure users can't escalate their own role/status via UPDATE
DROP POLICY IF EXISTS "Users update own membership" ON public.group_memberships;
CREATE POLICY "Users update own membership"
  ON public.group_memberships FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'member'::group_role
  );

-- 2. Auto-assign group creator as admin via SECURITY DEFINER trigger
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.created_by;
  INSERT INTO public.group_memberships (group_id, user_id, display_name, role, status)
  VALUES (
    NEW.id,
    NEW.created_by,
    COALESCE(split_part(v_email, '@', 1), 'Admin'),
    'admin'::group_role,
    'approved'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_group_creator_as_admin ON public.study_groups;
CREATE TRIGGER add_group_creator_as_admin
  AFTER INSERT ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.add_group_creator_as_admin();

-- 3. Enforce author_name on prayer_requests via existing SECURITY DEFINER function
DROP TRIGGER IF EXISTS enforce_prayer_author_name ON public.prayer_requests;
CREATE TRIGGER enforce_prayer_author_name
  BEFORE INSERT OR UPDATE OF author_name ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name_from_auth();
