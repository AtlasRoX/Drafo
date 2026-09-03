import React from 'react';

interface TelegramDoodleBannerProps {
  projectId: string;
  projectName: string;
}

// Curated focus points from the doodle.png illustration so every card highlights a unique architectural vignette
const DOODLE_FOCUS_REGIONS = [
  'center center', // Central layered flow hub
  '15% 45%',       // Database & cloud section
  '85% 35%',       // Rocket launch & architecture document
  '50% 15%',       // Lightbulb idea & paper plane
  '80% 75%',       // Chat & magnifying glass inspector
  '25% 75%'        // Cloud & decision block
];

export const TelegramDoodleBanner: React.FC<TelegramDoodleBannerProps> = ({
  projectId,
  projectName
}) => {
  const seedString = projectId + projectName;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const position = DOODLE_FOCUS_REGIONS[Math.abs(hash) % DOODLE_FOCUS_REGIONS.length];

  return (
    <div
      className="drafo-telegram-doodle-container"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#F3ECFE',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <img
        src="/doddle.png"
        alt={`${projectName} banner preview`}
        className="drafo-doodle-banner-img"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: position,
          opacity: 0.95,
          display: 'block',
          transform: 'none'
        }}
      />
      {/* Soft vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(243, 236, 254, 0.05) 0%, rgba(243, 236, 254, 0.35) 100%)`,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

