import { createClient } from '@supabase/supabase-js';

// Fallback values allow Vite to build the project without erroring even if keys aren't set yet.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key-12345';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
