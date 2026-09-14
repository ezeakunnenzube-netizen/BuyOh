const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

async function testQuery() {
  const r1 = await fetch(`${supabaseUrl}/rest/v1/conversations?select=*&limit=10`, {
    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
  });
  console.log('conversations status:', r1.status);
  const d1 = await r1.json();
  console.log('conversations count:', Array.isArray(d1) ? d1.length : d1);

  const r2 = await fetch(`${supabaseUrl}/rest/v1/messages?select=*&limit=10`, {
    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
  });
  console.log('messages status:', r2.status);
  const d2 = await r2.json();
  console.log('messages count:', Array.isArray(d2) ? d2.length : d2);
  if (Array.isArray(d2)) {
    console.log('recent messages:', d2.slice(0, 3));
  }
}

testQuery().catch(console.error);
