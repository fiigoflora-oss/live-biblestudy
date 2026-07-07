
CREATE POLICY "Members read group attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'group-attachments'
         AND private.is_group_member((storage.foldername(name))[1]::uuid, auth.uid()));

CREATE POLICY "Members upload to group folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-attachments'
              AND owner = auth.uid()
              AND private.is_group_member((storage.foldername(name))[1]::uuid, auth.uid()));

CREATE POLICY "Uploaders delete their attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'group-attachments' AND owner = auth.uid());
