-- Clear all uploaded data (keep table structure)
DELETE FROM public.rapsodo_batting;
DELETE FROM public.rapsodo_pitching;
DELETE FROM public.blast_data;

-- Keep savant_data as is (it's working correctly)
