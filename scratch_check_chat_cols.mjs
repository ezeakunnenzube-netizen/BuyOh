const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';

async function checkProfileJson() {
  const words = ['chats', 'conversations', 'messages', 'chat_data', 'chat_messages', 'inbox', 'mailbox'];
  for (const w of words) {
    const r = await fetch(`${supabaseUrl}/rest/v1/profiles?select=${w}&limit=1`, {
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    });
    if (r.status === 200) {
      console.log('profiles has column:', w);
    }
  }
}

checkProfileJson();
