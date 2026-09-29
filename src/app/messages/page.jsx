'use client';

import { Suspense } from 'react';
import Messages from '../../views/Messages';

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Messages />
    </Suspense>
  );
}
