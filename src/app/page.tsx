'use client';

import dynamic from 'next/dynamic';

const DrafoStudio = dynamic(
  () => import('../App').then((mod) => mod.App),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAFC',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          gap: '16px'
        }}
      >
        <img
          src="/logo.svg"
          alt="Drafo Logo"
          style={{ height: '48px', width: 'auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #E2E8F0',
              borderTopColor: '#2563EB',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          Loading Drafo Canvas Studio...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DrafoStudio />
    </main>
  );
}
