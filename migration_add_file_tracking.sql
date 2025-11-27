-- Migration to add file tracking columns

-- 1. Savant Data
ALTER TABLE public.savant_data ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.savant_data ADD COLUMN IF NOT EXISTS upload_id text;

-- 2. Rapsodo Pitching
ALTER TABLE public.rapsodo_pitching ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.rapsodo_pitching ADD COLUMN IF NOT EXISTS upload_id text;

-- 3. Rapsodo Batting
ALTER TABLE public.rapsodo_batting ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.rapsodo_batting ADD COLUMN IF NOT EXISTS upload_id text;

-- 4. Blast Data
ALTER TABLE public.blast_data ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.blast_data ADD COLUMN IF NOT EXISTS upload_id text;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
