'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', fontFamily: 'inherit' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
      <p style={{ color: '#888', textAlign: 'center', maxWidth: 400 }}>
        An unexpected error occurred. You can try refreshing or go back to the home page.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={reset} style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: 'none', background: '#6c47ff', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          Try again
        </button>
        <button onClick={() => router.push('/')} style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: '1px solid #444', background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}>
          Go home
        </button>
      </div>
    </div>
  );
}