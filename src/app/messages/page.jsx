'use client';

import { Suspense } from 'react';
import Messages from '../../views/Messages';

export default function MessagesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading messages...</div>}>
      <Messages />
    </Suspense>
  );
}
