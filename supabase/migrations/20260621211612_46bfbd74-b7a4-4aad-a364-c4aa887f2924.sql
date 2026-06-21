
-- Groups
CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  book text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.study_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public groups visible to all" ON public.study_groups FOR SELECT USING (is_public = true);

-- Memberships
CREATE TABLE public.group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;
GRANT ALL ON public.group_memberships TO service_role;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members visible to authenticated" ON public.group_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join groups themselves" ON public.group_memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave own membership" ON public.group_memberships FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own membership" ON public.group_memberships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: is member?
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = _group_id AND user_id = _user_id)
$$;

-- Reading plan items
CREATE TABLE public.reading_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL,
  book text NOT NULL,
  chapter integer NOT NULL,
  scheduled_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reading_plan_items TO anon, authenticated;
GRANT ALL ON public.reading_plan_items TO service_role;
ALTER TABLE public.reading_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan items visible to all" ON public.reading_plan_items FOR SELECT USING (true);

-- Posts
CREATE TABLE public.group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  reading_day integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_posts TO authenticated;
GRANT ALL ON public.group_posts TO service_role;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts visible to authenticated" ON public.group_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members post in their groups" ON public.group_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "Users delete own posts" ON public.group_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.group_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_group_posts_group_created ON public.group_posts(group_id, created_at DESC);
CREATE INDEX idx_reading_plan_group_day ON public.reading_plan_items(group_id, day_number);

-- Seed groups
WITH g1 AS (
  INSERT INTO public.study_groups (name, description, book) VALUES
  ('Genesis Walkthrough', 'Journey through the book of beginnings together. One chapter a day, with daily reflection.', 'Genesis')
  RETURNING id
), g2 AS (
  INSERT INTO public.study_groups (name, description, book) VALUES
  ('Gospel of John', 'Discover the life of Christ through John''s eyes. Slow, contemplative reading.', 'John')
  RETURNING id
)
INSERT INTO public.reading_plan_items (group_id, day_number, title, book, chapter)
SELECT id, d, 'Day ' || d || ': Genesis ' || d, 'Genesis', d FROM g1, generate_series(1,7) d
UNION ALL
SELECT id, d, 'Day ' || d || ': John ' || d, 'John', d FROM g2, generate_series(1,7) d;
