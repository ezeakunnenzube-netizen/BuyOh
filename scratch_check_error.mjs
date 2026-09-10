async function run() {
  const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  
  if (!pageTarget) {
    console.error('No page target found');
    return;
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const currentId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === currentId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: currentId, method, params }));
    });
  };

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type.toUpperCase()}]:`, ...msg.params.args.map(a => a.value || a.description || JSON.stringify(a)));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]:', msg.params.exceptionDetails);
    }
    if (msg.method === 'Log.entryAdded') {
      console.log(`[LOG ${msg.params.entry.level}]:`, msg.params.entry.text);
    }
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  console.log('\n--- Setting up user session in localStorage ---');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 1000));

  const dummySession = {
    user: {
      id: "cd04c532-d615-4a89-83f8-126ec28205dc",
      email: "ezeakunnenzube@gmail.com",
      user_metadata: {
        full_name: "Nzube Ezeakunne",
        name: "Nzube Ezeakunne"
      }
    },
    currentSession: {
      access_token: "dummy",
      user: {
        id: "cd04c532-d615-4a89-83f8-126ec28205dc",
        email: "ezeakunnenzube@gmail.com"
      }
    }
  };

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('sb-rfylhjtgqeupspxgpwyk-auth-token', JSON.stringify(${JSON.stringify(dummySession)}));
      localStorage.setItem('buyoh_user_name_cd04c532-d615-4a89-83f8-126ec28205dc', 'Nzube Ezeakunne');
    `
  });

  const routes = ['/', '/adverts', '/messages', '/notifications', '/product/listing-1788695906181', '/profile', '/saved', '/sell'];
  for (const route of routes) {
    console.log(`\n--- Testing ${route} WITH USER ---`);
    await send('Page.navigate', { url: `http://localhost:3000${route}` });
    await new Promise(r => setTimeout(r, 2500));
    const titleRes = await send('Runtime.evaluate', { expression: 'document.title' });
    const textRes = await send('Runtime.evaluate', { expression: 'document.body.innerText.substring(0, 150)' });
    console.log(`Title: ${titleRes?.result?.value}\nText: ${textRes?.result?.value?.replace(/\n/g, ' ')}`);
  }

  ws.close();
}

run().catch(console.error);
