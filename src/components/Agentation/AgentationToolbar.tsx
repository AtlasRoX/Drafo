'use client';

import React, { useEffect, useState } from 'react';
import { Agentation } from 'agentation';

export const AgentationToolbar: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Agentation
      endpoint="http://localhost:4747"
      copyToClipboard={true}
    />
  );
};
