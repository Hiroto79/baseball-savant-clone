import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://uzbggxstgmerexnugbxj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6YmdneHN0Z21lcmV4bnVnYnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDE3MzIsImV4cCI6MjA3OTcxNzczMn0.8LdP0AfWsBUpEAc0CaaujLqbqqESgkAKDalXW7CcfPo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
