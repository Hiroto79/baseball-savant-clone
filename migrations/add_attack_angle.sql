-- Run this in your Supabase SQL Editor to update the table structure

ALTER TABLE public.savant_data 
ADD COLUMN IF NOT EXISTS vaa float,
ADD COLUMN IF NOT EXISTS haa float,
ADD COLUMN IF NOT EXISTS attack_angle float,
ADD COLUMN IF NOT EXISTS attack_direction float,
ADD COLUMN IF NOT EXISTS estimated_woba_using_speedangle float;
