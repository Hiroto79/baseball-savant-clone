-- Recreate blast_data table if it doesn't exist
create table if not exists public.blast_data (
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

-- Ensure file tracking columns exist for blast_data
ALTER TABLE public.blast_data 
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS upload_id text;

-- Enable RLS
alter table public.blast_data enable row level security;

-- Create Policy (drop first to avoid error if exists)
drop policy if exists "Allow public access" on public.blast_data;
create policy "Allow public access" on public.blast_data for all using (true);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
