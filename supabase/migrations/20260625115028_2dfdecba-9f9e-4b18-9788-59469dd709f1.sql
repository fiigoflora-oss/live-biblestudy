-- Allow authenticated users to create public study groups
CREATE POLICY "Authenticated users can create groups"
  ON public.study_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (is_public = true);

-- Make groups visible to authenticated users too (existing policy is TO public but only is_public=true; keep). Ensure SELECT for authenticated as well via existing policy applies to public role, fine.

GRANT INSERT ON public.study_groups TO authenticated;