CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = _group_id AND user_id = _user_id)
$function$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;

-- Allow a user to always see their OWN membership rows, so the client can
-- detect "already joined" without depending on the recursive helper.
DROP POLICY IF EXISTS "Users see own memberships" ON public.group_memberships;
CREATE POLICY "Users see own memberships"
ON public.group_memberships
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);