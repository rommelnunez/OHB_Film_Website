import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for browser (limited permissions)
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClient;

// Admin client for server-side operations (full permissions)
export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as unknown as SupabaseClient;

// Types
export interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  campaign_type: 'simple' | 'engagement';
  starts_at: string;
  ends_at: string;
  timezone: string;
  prize_description: string;
  winner_count: number;
  eligible_cities: string[] | null;
  min_age: number;
  google_sheet_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  campaign_id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  zip: string | null;
  age_confirmed: boolean;
  total_entries: number;
  synced_to_sheet_at: string | null;
  created_at: string;
}
