'use client';

import React, { useEffect, useState } from 'react';
import { FlowEdge, FlowNode } from '../../types/flow';
import { Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './FlowPlayer.css';

interface FlowPlayerProps {
  edges: FlowEdge[];
  nodes: FlowNode[];
  activeStep: number | null;
  onStepChange: (step: number | null) => void;
  onClose: () => void;
}

export const FlowPlayer: React.FC<FlowPlayerProps> = ({
  edges,
  nodes,
  activeStep,
  onStepChange,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(true);

  // Sort edges by stepNumber if available, keeping original edge index mapping
  const sortedIndices = React.useMemo(() => {
    if (edges.length === 0) return [];
    return edges
      .map((edge, idx) => ({ edge, idx }))
      .sort((a, b) => {
        const numA = a.edge.stepNumber ? parseFloat(String(a.edge.stepNumber)) : NaN;
        const numB = b.edge.stepNumber ? parseFloat(String(b.edge.stepNumber)) : NaN;
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.idx - b.idx;
      })
      .map((item) => item.idx);
  }, [edges]);

  const currentOriginalIndex =
    activeStep !== null ? activeStep : sortedIndices[0] ?? 0;
  const currentSortedPos = Math.max(0, sortedIndices.indexOf(currentOriginalIndex));
  const currentEdge = edges[currentOriginalIndex];

  const sourceNode = currentEdge ? nodes.find((n) => n.id === currentEdge.fromNodeId) : null;
  const targetNode = currentEdge ? nodes.find((n) => n.id === currentEdge.toNodeId) : null;

  // Auto-advance loop when playing
  useEffect(() => {
    if (!isPlaying || sortedIndices.length === 0) return;

    const timer = setInterval(() => {
      const nextPos = (currentSortedPos + 1) % sortedIndices.length;
      onStepChange(sortedIndices[nextPos]);
    }, 2200);

    return () => clearInterval(timer);
  }, [isPlaying, currentSortedPos, sortedIndices, onStepChange]);

  const handleNext = () => {
    if (sortedIndices.length === 0) return;
    const nextPos = (currentSortedPos + 1) % sortedIndices.length;
    onStepChange(sortedIndices[nextPos]);
  };

  const handlePrev = () => {
    if (sortedIndices.length === 0) return;
    const prevPos = (currentSortedPos - 1 + sortedIndices.length) % sortedIndices.length;
    onStepChange(sortedIndices[prevPos]);
  };

  return (
    <div className="drafo-flow-player-bar">
      <div className="drafo-player-info">
        <span className="drafo-player-step-badge">
          Step {currentSortedPos + 1} / {edges.length}
        </span>
        <div className="drafo-player-text">
          <span className="drafo-player-label">
            {currentEdge?.label || 'Flow Transition'}
          </span>
          {sourceNode && targetNode && (
            <span className="drafo-player-nodes">
              {sourceNode.title} ➔ {targetNode.title}
            </span>
          )}
        </div>
      </div>

      <div className="drafo-player-controls">
        <button className="drafo-player-btn" onClick={handlePrev} title="Previous Step">
          <ChevronLeft size={16} />
        </button>

        <button
          className="drafo-player-btn play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause auto-play' : 'Play auto-advance'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button className="drafo-player-btn" onClick={handleNext} title="Next Step">
          <ChevronRight size={16} />
        </button>

        <button className="drafo-player-btn close-btn" onClick={onClose} title="Exit Simulation">
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
