
CREATE TYPE public.group_role AS ENUM ('admin','plan_maker','member');

ALTER TABLE public.group_memberships
  ADD COLUMN role public.group_role NOT NULL DEFAULT 'member',
  ADD COLUMN status text NOT NULL DEFAULT 'approved';

UPDATE public.group_memberships gm
SET role = 'admin'
FROM public.study_groups g
WHERE g.id = gm.group_id AND g.created_by = gm.user_id;

CREATE OR REPLACE FUNCTION private.has_group_role(_group_id uuid, _user_id uuid, _roles public.group_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id AND group_id = _group_id AND status = 'approved'
      AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id AND group_id = _group_id AND status = 'approved'
  );
$$;

CREATE POLICY "Admins see all memberships in their groups"
  ON public.group_memberships FOR SELECT TO authenticated
  USING (private.has_group_role(group_id, auth.uid(), ARRAY['admin']::public.group_role[]));

CREATE POLICY "Admins update memberships in their groups"
  ON public.group_memberships FOR UPDATE TO authenticated
  USING (private.has_group_role(group_id, auth.uid(), ARRAY['admin']::public.group_role[]))
  WITH CHECK (private.has_group_role(group_id, auth.uid(), ARRAY['admin']::public.group_role[]));

CREATE POLICY "Admins remove memberships in their groups"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (private.has_group_role(group_id, auth.uid(), ARRAY['admin']::public.group_role[]));

CREATE POLICY "Managers insert plan items"
  ON public.reading_plan_items FOR INSERT TO authenticated
  WITH CHECK (private.has_group_role(group_id, auth.uid(), ARRAY['admin','plan_maker']::public.group_role[]));

CREATE POLICY "Managers update plan items"
  ON public.reading_plan_items FOR UPDATE TO authenticated
  USING (private.has_group_role(group_id, auth.uid(), ARRAY['admin','plan_maker']::public.group_role[]))
  WITH CHECK (private.has_group_role(group_id, auth.uid(), ARRAY['admin','plan_maker']::public.group_role[]));

CREATE POLICY "Managers delete plan items"
  ON public.reading_plan_items FOR DELETE TO authenticated
  USING (private.has_group_role(group_id, auth.uid(), ARRAY['admin','plan_maker']::public.group_role[]));

ALTER TABLE public.group_posts ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view prayers" ON public.prayer_requests FOR SELECT TO authenticated
  USING (private.is_group_member(group_id, auth.uid()));
CREATE POLICY "Members create prayers" ON public.prayer_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND private.is_group_member(group_id, auth.uid()));
CREATE POLICY "Owners update own prayers" ON public.prayer_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins delete prayers" ON public.prayer_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.has_group_role(group_id, auth.uid(), ARRAY['admin']::public.group_role[]));
CREATE TRIGGER touch_prayer_requests BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.prayer_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prayer_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.prayer_supports TO authenticated;
GRANT ALL ON public.prayer_supports TO service_role;
ALTER TABLE public.prayer_supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view supports" ON public.prayer_supports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prayer_requests pr WHERE pr.id = prayer_id AND private.is_group_member(pr.group_id, auth.uid())));
CREATE POLICY "Members add own support" ON public.prayer_supports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.prayer_requests pr WHERE pr.id = prayer_id AND private.is_group_member(pr.group_id, auth.uid())));
CREATE POLICY "Owners remove own support" ON public.prayer_supports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
