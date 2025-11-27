-- Force schema cache refresh for ALL tables
-- This forces PostgREST to notice the change without deleting data.

-- 1. Savant Data
ALTER TABLE public.savant_data RENAME TO savant_data_temp;
ALTER TABLE public.savant_data_temp RENAME TO savant_data;

-- 2. Rapsodo Pitching
ALTER TABLE public.rapsodo_pitching RENAME TO rapsodo_pitching_temp;
ALTER TABLE public.rapsodo_pitching_temp RENAME TO rapsodo_pitching;

-- 3. Rapsodo Batting
ALTER TABLE public.rapsodo_batting RENAME TO rapsodo_batting_temp;
ALTER TABLE public.rapsodo_batting_temp RENAME TO rapsodo_batting;

-- 4. Blast Data
ALTER TABLE public.blast_data RENAME TO blast_data_temp;
ALTER TABLE public.blast_data_temp RENAME TO blast_data;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
