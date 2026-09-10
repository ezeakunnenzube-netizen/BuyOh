import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data } = await supabase.from('profiles').select('*').single();
  console.log('saved_items:', JSON.stringify(data.saved_items).substring(0, 300));
  console.log('notifications:', JSON.stringify(data.notifications).substring(0, 300));
  data.my_listings.forEach((item, i) => {
    console.log(`\n--- Item ${i} ---`);
    console.log('id:', item.id);
    console.log('name:', item.name);
    console.log('category:', item.category);
    console.log('subcategory:', item.subcategory);
    console.log('location:', item.location);
    console.log('country:', item.country);
    console.log('price:', item.price);
    console.log('image type:', typeof item.image, item.image?.substring(0, 30));
    console.log('images:', Array.isArray(item.images), item.images?.length);
  });
}

check().catch(console.error);
