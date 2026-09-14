const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';
import crypto from 'crypto';

async function testWithUUID() {
  const u1 = 'cd04c532-d615-4a89-83f8-126ec28205dc';
  const u2 = '31ca8b93-fe29-440d-a63d-dcd6e6bc03d7';
  const dummyProdUUID = crypto.randomUUID();

  // Try insert conversation with valid UUIDs
  const rConv = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      buyer_id: u1,
      seller_id: u2,
      product_id: dummyProdUUID
    })
  });
  console.log('Conv insert status:', rConv.status);
  const convRes = await rConv.json();
  console.log('Conv insert result:', convRes);

  if (Array.isArray(convRes) && convRes.length > 0) {
    const convId = convRes[0].id;
    const rMsg = await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        conversation_id: convId,
        sender_id: u1,
        text: 'Test message between real accounts'
      })
    });
    console.log('Msg insert status:', rMsg.status);
    const msgRes = await rMsg.json();
    console.log('Msg insert result:', msgRes);
  }
}

testWithUUID().catch(console.error);
