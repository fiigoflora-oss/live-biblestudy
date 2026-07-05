
-- 1. Private schema for internal helpers not exposed via the Data API
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 2. Recreate is_group_member in private (SECURITY DEFINER so it can bypass RLS on group_memberships)
CREATE OR REPLACE FUNCTION private.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION private.is_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_group_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private.is_group_member(uuid, uuid) TO authenticated;

-- 3. Repoint every policy that referenced public.is_group_member
DROP POLICY IF EXISTS "Plan items visible to group members" ON public.reading_plan_items;
CREATE POLICY "Plan items visible to group members" ON public.reading_plan_items
  FOR SELECT TO authenticated
  USING (private.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members post in their groups" ON public.group_posts;
CREATE POLICY "Members post in their groups" ON public.group_posts
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND private.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Posts visible to group members" ON public.group_posts;
CREATE POLICY "Posts visible to group members" ON public.group_posts
  FOR SELECT TO authenticated
  USING (private.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members visible to fellow group members" ON public.group_memberships;
CREATE POLICY "Members visible to fellow group members" ON public.group_memberships
  FOR SELECT TO authenticated
  USING (private.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Creators can delete their sessions" ON public.discussion_sessions;
CREATE POLICY "Creators can delete their sessions" ON public.discussion_sessions
  FOR DELETE TO authenticated
  USING ((ended_by = auth.uid()) AND private.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create sessions" ON public.discussion_sessions;
CREATE POLICY "Members can create sessions" ON public.discussion_sessions
  FOR INSERT TO authenticated
  WITH CHECK (private.is_group_member(group_id, auth.uid()) AND (ended_by = auth.uid()));

DROP POLICY IF EXISTS "Session owner can update" ON public.discussion_sessions;
CREATE POLICY "Session owner can update" ON public.discussion_sessions
  FOR UPDATE TO authenticated
  USING ((ended_by = auth.uid()) AND private.is_group_member(group_id, auth.uid()))
  WITH CHECK ((ended_by = auth.uid()) AND private.is_group_member(group_id, auth.uid()));

-- 4. Remove the public-schema copy so it is no longer exposed via the Data API
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid);

-- 5. Tighten the discussion_sessions SELECT policy explicitly (was already scoped, keep tight)
DROP POLICY IF EXISTS "Members at session time can view sessions" ON public.discussion_sessions;
CREATE POLICY "Members at session time can view sessions" ON public.discussion_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = discussion_sessions.group_id
        AND gm.user_id = auth.uid()
        AND gm.joined_at <= discussion_sessions.created_at
    )
  );

-- 6. Restrict profiles reads to the owner only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
