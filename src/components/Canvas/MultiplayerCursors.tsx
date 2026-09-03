'use client';

import React from 'react';
import { PeerPresence } from '../../crdt/yjsProvider';
import './MultiplayerCursors.css';

interface MultiplayerCursorsProps {
  peers: PeerPresence[];
  zoom: number;
  pan: { x: number; y: number };
}

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({
  peers,
  zoom,
  pan
}) => {
  return (
    <div className="drafo-multiplayer-cursors-layer">
      {peers.map((peer) => {
        if (!peer.cursor) return null;

        // Convert canvas coordinates to screen viewport coordinates
        const screenX = peer.cursor.x * zoom + pan.x;
        const screenY = peer.cursor.y * zoom + pan.y;

        return (
          <div
            key={peer.clientId}
            className="drafo-peer-cursor-container"
            style={{
              transform: `translate3d(${Math.round(screenX)}px, ${Math.round(screenY)}px, 0)`
            }}
          >
            {/* Cursor SVG Arrow */}
            <svg
              className="drafo-peer-cursor-arrow"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={peer.color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </svg>

            {/* Peer Username Badge with Live Indicator */}
            <div
              className="drafo-peer-name-badge"
              style={{
                backgroundColor: peer.color
              }}
            >
              <span className="drafo-peer-cursor-pulse-dot" />
              <span className="drafo-peer-name-text">{peer.name}</span>
              {peer.selectedId && (
                <span className="drafo-peer-selection-pill">
                  Active
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
