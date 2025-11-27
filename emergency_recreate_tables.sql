-- EMERGENCY RECREATION SCRIPT
-- WARNING: THIS WILL DELETE ALL EXISTING DATA IN THESE TABLES
-- Use this only if you are getting "relation does not exist" errors and need to reset the database.

-- 1. Savant Data
DROP TABLE IF EXISTS public.savant_data CASCADE;
CREATE TABLE public.savant_data (
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
  file_name text,
  upload_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Rapsodo Pitching
DROP TABLE IF EXISTS public.rapsodo_pitching CASCADE;
CREATE TABLE public.rapsodo_pitching (
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
  file_name text,
  upload_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Rapsodo Batting
DROP TABLE IF EXISTS public.rapsodo_batting CASCADE;
CREATE TABLE public.rapsodo_batting (
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
  file_name text,
  upload_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Blast Data
DROP TABLE IF EXISTS public.blast_data CASCADE;
CREATE TABLE public.blast_data (
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
  file_name text,
  upload_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.savant_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapsodo_pitching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapsodo_batting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blast_data ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow public access" ON public.savant_data FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.rapsodo_pitching FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.rapsodo_batting FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.blast_data FOR ALL USING (true);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
