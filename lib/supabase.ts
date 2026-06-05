// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for frontend (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnon);

// Admin client for API routes (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
