-- Force PostgREST schema cache reload
-- Run this script if you see "Could not find the table ... in the schema cache" errors.
NOTIFY pgrst, 'reload schema';
