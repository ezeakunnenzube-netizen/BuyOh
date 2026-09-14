import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // Check RLS or error when querying with select
  const { data: convs, error: cErr } = await supabase.from('conversations').select('*');
  console.log('Conversations select:', { count: convs?.length, error: cErr });

  const { data: msgs, error: mErr } = await supabase.from('messages').select('*');
  console.log('Messages select:', { count: msgs?.length, error: mErr });
}

check().catch(console.error);
