
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT true;
