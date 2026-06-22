
-- 1. Restrict reading_plan_items SELECT to group members
DROP POLICY IF EXISTS "Plan items visible to all" ON public.reading_plan_items;
REVOKE SELECT ON public.reading_plan_items FROM anon;
CREATE POLICY "Plan items visible to group members"
  ON public.reading_plan_items
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

-- 2. Restrict group_memberships SELECT to fellow group members
DROP POLICY IF EXISTS "Members visible to authenticated" ON public.group_memberships;
CREATE POLICY "Members visible to fellow group members"
  ON public.group_memberships
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

-- 3. Restrict group_posts SELECT to group members
DROP POLICY IF EXISTS "Posts visible to authenticated" ON public.group_posts;
CREATE POLICY "Posts visible to group members"
  ON public.group_posts
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

-- 4. Server-side enforcement of author_name / display_name (prevent spoofing)
CREATE OR REPLACE FUNCTION public.set_author_name_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  NEW.author_name := COALESCE(split_part(v_email, '@', 1), 'Member');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_display_name_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  NEW.display_name := COALESCE(split_part(v_email, '@', 1), 'Member');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_author_name ON public.group_posts;
CREATE TRIGGER enforce_author_name
  BEFORE INSERT OR UPDATE OF author_name ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name_from_auth();

DROP TRIGGER IF EXISTS enforce_display_name ON public.group_memberships;
CREATE TRIGGER enforce_display_name
  BEFORE INSERT OR UPDATE OF display_name ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_display_name_from_auth();
