-- Force schema cache refresh by renaming the table
-- This forces PostgREST to notice the change without deleting data.

ALTER TABLE public.savant_data RENAME TO savant_data_temp;
ALTER TABLE public.savant_data_temp RENAME TO savant_data;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
