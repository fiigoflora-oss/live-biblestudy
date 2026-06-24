
CREATE TABLE public.discussion_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  reading_day INTEGER,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB,
  summary_status TEXT NOT NULL DEFAULT 'pending',
  ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_sessions TO authenticated;
GRANT ALL ON public.discussion_sessions TO service_role;

ALTER TABLE public.discussion_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group sessions"
  ON public.discussion_sessions FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can create sessions"
  ON public.discussion_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()) AND ended_by = auth.uid());

CREATE POLICY "Members can update sessions"
  ON public.discussion_sessions FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()))
  WITH CHECK (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Creators can delete their sessions"
  ON public.discussion_sessions FOR DELETE
  TO authenticated
  USING (ended_by = auth.uid());

CREATE TRIGGER discussion_sessions_updated_at
  BEFORE UPDATE ON public.discussion_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_discussion_sessions_group ON public.discussion_sessions(group_id, created_at DESC);
