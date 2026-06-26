
-- Restrict discussion_sessions reads to members who joined on/before the session was created
DROP POLICY IF EXISTS "Group members can view sessions" ON public.discussion_sessions;
CREATE POLICY "Members at session time can view sessions"
  ON public.discussion_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = discussion_sessions.group_id
        AND gm.user_id = auth.uid()
        AND gm.joined_at <= discussion_sessions.created_at
    )
  );

-- Remove broad authenticated INSERT policy on study_groups (group creation should not be open to all)
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.study_groups;
