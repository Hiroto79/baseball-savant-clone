-- Add player_category column to rapsodo_pitching table
ALTER TABLE public.rapsodo_pitching 
ADD COLUMN IF NOT EXISTS player_category text;

-- Add player_category column to rapsodo_batting table
ALTER TABLE public.rapsodo_batting 
ADD COLUMN IF NOT EXISTS player_category text;

-- Comment on columns
COMMENT ON COLUMN public.rapsodo_pitching.player_category IS 'Age category: Middle School, High School, College, Social';
COMMENT ON COLUMN public.rapsodo_batting.player_category IS 'Age category: Middle School, High School, College, Social';
