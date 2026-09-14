const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

async function testInsert() {
  const r1 = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: 'test-conv-1',
      buyer_id: 'user-a',
      seller_id: 'user-b',
      product_id: 'prod-1'
    })
  });
  console.log('Insert conversation status:', r1.status);
  const d1 = await r1.text();
  console.log('Insert conversation result:', d1);

  const r2 = await fetch(`${supabaseUrl}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: 'test-msg-1',
      conversation_id: 'test-conv-1',
      sender_id: 'user-a',
      text: 'Hello test'
    })
  });
  console.log('Insert message status:', r2.status);
  const d2 = await r2.text();
  console.log('Insert message result:', d2);
}

testInsert().catch(console.error);
