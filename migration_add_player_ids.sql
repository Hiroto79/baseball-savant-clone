-- Add pitcher and batter columns to savant_data
ALTER TABLE public.savant_data 
ADD COLUMN IF NOT EXISTS pitcher int,
ADD COLUMN IF NOT EXISTS batter int;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
