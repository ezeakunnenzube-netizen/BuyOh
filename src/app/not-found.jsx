'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'inherit'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1d4ed8' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Page Not Found</h2>
      <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/" 
        style={{
          backgroundColor: '#1d4ed8',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '0.95rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
