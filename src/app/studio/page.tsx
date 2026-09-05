'use client';

import dynamic from 'next/dynamic';

const DrafoStudio = dynamic(
  () => import('../../App').then((mod) => mod.App),
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
          backgroundColor: '#07080B',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          gap: '16px'
        }}
      >
        <img
          src="/logo.svg"
          alt="Drafo Logo"
          style={{ height: '44px', width: 'auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8', fontSize: '14px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          Initializing PostgreSQL 16 WASM & Canvas Studio...
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

export default function StudioPage() {
  return (
    <main style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <DrafoStudio initialView="editor" />
    </main>
  );
}
