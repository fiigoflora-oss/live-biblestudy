
ALTER TABLE public.study_groups
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.study_groups
  ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE POLICY "Authenticated users can create groups"
  ON public.study_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid() AND is_public = true);
