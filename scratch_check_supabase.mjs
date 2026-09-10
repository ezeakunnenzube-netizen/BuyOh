import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Error:', error);
  console.log('Profiles count:', data?.length);
  if (data) {
    for (const p of data) {
      console.log('User id:', p.id, 'email:', p.email);
      console.log('my_listings type:', typeof p.my_listings, Array.isArray(p.my_listings));
      console.log('saved_items type:', typeof p.saved_items, Array.isArray(p.saved_items));
      console.log('notifications type:', typeof p.notifications, Array.isArray(p.notifications));
      if (typeof p.my_listings === 'string') {
        console.log('my_listings is STRING! length:', p.my_listings.length);
      } else if (Array.isArray(p.my_listings)) {
        console.log('my_listings array items:', p.my_listings.length);
        p.my_listings.forEach((item, idx) => {
          console.log(`item ${idx}:`, typeof item, item ? Object.keys(item) : 'NULL');
        });
      }
    }
  }
}

check().catch(console.error);
