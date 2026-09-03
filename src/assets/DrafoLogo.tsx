'use client';

import React from 'react';
import Image from 'next/image';

interface DrafoLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  onClick?: () => void;
}

export const DrafoLogo: React.FC<DrafoLogoProps> = ({
  size = 32,
  showWordmark = true,
  className = '',
  theme = 'light',
  onClick
}) => {
  // logo.svg has a natural aspect ratio of 1500 / 450 (~3.33)
  const height = size;
  const width = showWordmark ? Math.round(size * 3.33) : size;

  return (
    <div
      className={`drafo-brand-logo ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <div
        style={{
          position: 'relative',
          height: `${height}px`,
          width: showWordmark ? `${width}px` : `${height}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <img
          src="/logo.svg"
          alt="Drafo Logo"
          style={{
            height: `${height}px`,
            width: showWordmark ? 'auto' : 'auto',
            maxHeight: '100%',
            objectFit: showWordmark ? 'contain' : 'cover',
            objectPosition: 'left center',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};
