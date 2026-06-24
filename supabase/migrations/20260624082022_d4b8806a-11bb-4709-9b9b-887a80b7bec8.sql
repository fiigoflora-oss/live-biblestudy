
-- 1) Tighten discussion_sessions UPDATE to session owner only
DROP POLICY IF EXISTS "Group members can update sessions" ON public.discussion_sessions;
DROP POLICY IF EXISTS "Members update sessions" ON public.discussion_sessions;
DROP POLICY IF EXISTS "Update sessions in own groups" ON public.discussion_sessions;
DROP POLICY IF EXISTS "Members can update sessions" ON public.discussion_sessions;

CREATE POLICY "Session owner can update"
ON public.discussion_sessions
FOR UPDATE
TO authenticated
USING (ended_by = auth.uid() AND is_group_member(group_id, auth.uid()))
WITH CHECK (ended_by = auth.uid() AND is_group_member(group_id, auth.uid()));

-- 2) Allow public read access to reading_plan_items
GRANT SELECT ON public.reading_plan_items TO anon;

CREATE POLICY "Reading plan items publicly readable"
ON public.reading_plan_items
FOR SELECT
TO anon, authenticated
USING (true);
