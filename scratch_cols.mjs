const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

async function checkCols() {
  const r = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&limit=1`, {
    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
  });
  const data = await r.json();
  console.log('Columns in profiles:', Object.keys(data[0] || {}));
}

checkCols();
