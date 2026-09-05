'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '../components/Landing/LandingPage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.startsWith('#room=')) {
        router.replace(`/studio${window.location.hash}`);
      }
    }
  }, [router]);

  return (
    <main>
      <LandingPage />
    </main>
  );
}
