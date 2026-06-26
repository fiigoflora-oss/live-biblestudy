-- Remove overly broad SELECT policy; rely on time-scoped policy
DROP POLICY IF EXISTS "Members can view group sessions" ON public.discussion_sessions;

-- Tighten DELETE to require current membership
DROP POLICY IF EXISTS "Creators can delete their sessions" ON public.discussion_sessions;
CREATE POLICY "Creators can delete their sessions"
ON public.discussion_sessions
FOR DELETE
USING (
  ended_by = auth.uid()
  AND public.is_group_member(group_id, auth.uid())
);