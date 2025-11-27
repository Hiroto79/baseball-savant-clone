-- Force schema cache refresh for blast_data table only
ALTER TABLE public.blast_data RENAME TO blast_data_temp;
ALTER TABLE public.blast_data_temp RENAME TO blast_data;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
