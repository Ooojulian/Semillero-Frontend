-- Migration: 002_supabase_schema
-- Run this in Supabase SQL Editor

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('superAdmin', 'recruiter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recruiter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  position         TEXT NOT NULL,
  experience_years INT,
  expected_salary  NUMERIC(12,2),
  location         TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','interviewed','hired','rejected')),
  source           TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal','scraping')),
  resume_url       TEXT,
  profile_url      TEXT,
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read candidates"   ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recruiters can insert candidates"          ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Recruiters can update candidates"          ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "SuperAdmin can delete candidates"          ON public.candidates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superAdmin')
);

CREATE INDEX IF NOT EXISTS idx_candidates_status   ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON public.candidates(location);
CREATE INDEX IF NOT EXISTS idx_candidates_search   ON public.candidates USING gin(to_tsvector('spanish', full_name || ' ' || position || ' ' || COALESCE(location,'')));

-- Chat history
CREATE TABLE IF NOT EXISTS public.chat_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  candidates  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own chat history" ON public.chat_history FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Search history
CREATE TABLE IF NOT EXISTS public.search_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query            TEXT NOT NULL,
  candidates_found INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own search history" ON public.search_history FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
