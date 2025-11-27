-- Consolidated Schema Fix Script
-- This script ensures all tables exist and have the required columns.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Savant Data
CREATE TABLE IF NOT EXISTS public.savant_data (
  id uuid default uuid_generate_v4() primary key,
  game_date date,
  pitcher_name text,
  batter_name text,
  pitch_name text,
  release_speed float,
  release_spin_rate int,
  launch_speed float,
  launch_angle float,
  hit_distance_sc int,
  events text,
  description text,
  zone int,
  stand text,
  p_throws text,
  home_team text,
  away_team text,
  type text,
  hit_location int,
  bb_type text,
  balls int,
  strikes int,
  game_year int,
  pfx_x float,
  pfx_z float,
  plate_x float,
  plate_z float,
  on_3b int,
  on_2b int,
  on_1b int,
  outs_when_up int,
  inning int,
  inning_topbot text,
  hc_x float,
  hc_y float,
  vx0 float,
  vy0 float,
  vz0 float,
  ax float,
  ay float,
  az float,
  sz_top float,
  sz_bot float,
  effective_speed float,
  release_extension float,
  game_pk int,
  spin_axis int,
  delta_home_win_exp float,
  delta_run_exp float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add file tracking columns if they don't exist
ALTER TABLE public.savant_data ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.savant_data ADD COLUMN IF NOT EXISTS upload_id text;


-- 2. Rapsodo Pitching
CREATE TABLE IF NOT EXISTS public.rapsodo_pitching (
  id uuid default uuid_generate_v4() primary key,
  date date,
  player_name text,
  pitch_type text,
  velocity float,
  total_spin int,
  spin_efficiency float,
  horizontal_break float,
  vertical_break float,
  release_side float,
  release_height float,
  release_angle float,
  strike_zone_side float,
  strike_zone_height float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.rapsodo_pitching ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.rapsodo_pitching ADD COLUMN IF NOT EXISTS upload_id text;


-- 3. Rapsodo Batting
CREATE TABLE IF NOT EXISTS public.rapsodo_batting (
  id uuid default uuid_generate_v4() primary key,
  date date,
  player_name text,
  exit_velocity float,
  launch_angle float,
  direction float,
  spin_rate int,
  distance float,
  hang_time float,
  strike_zone_side float,
  strike_zone_height float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.rapsodo_batting ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.rapsodo_batting ADD COLUMN IF NOT EXISTS upload_id text;


-- 4. Blast Data
CREATE TABLE IF NOT EXISTS public.blast_data (
  id uuid default uuid_generate_v4() primary key,
  date date,
  player_name text,
  bat_speed float,
  attack_angle float,
  vertical_bat_angle float,
  power float,
  time_to_contact float,
  peak_hand_speed float,
  on_plane_efficiency float,
  rotation_score int,
  on_plane_score int,
  connection_score int,
  rotation_acceleration float,
  connection_at_impact float,
  connection_at_address float,
  bat_angle float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.blast_data ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.blast_data ADD COLUMN IF NOT EXISTS upload_id text;


-- Enable Row Level Security (RLS) if not already enabled
-- (These commands are idempotent-ish, but ALTER TABLE ENABLE RLS is safe to run multiple times? No, usually safe)
ALTER TABLE public.savant_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapsodo_pitching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapsodo_batting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blast_data ENABLE ROW LEVEL SECURITY;

-- Re-create policies (Drop first to avoid errors if they exist)
DROP POLICY IF EXISTS "Allow public access" ON public.savant_data;
CREATE POLICY "Allow public access" ON public.savant_data FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON public.rapsodo_pitching;
CREATE POLICY "Allow public access" ON public.rapsodo_pitching FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON public.rapsodo_batting;
CREATE POLICY "Allow public access" ON public.rapsodo_batting FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access" ON public.blast_data;
CREATE POLICY "Allow public access" ON public.blast_data FOR ALL USING (true);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
