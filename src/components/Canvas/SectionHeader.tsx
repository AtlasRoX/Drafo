'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FlowSection } from '../../types/flow';
import { GripVertical } from 'lucide-react';

interface SectionHeaderProps {
  section: FlowSection;
  isSelected: boolean;
  onSelect: (sectionId: string, e: React.MouseEvent) => void;
  onUpdate: (updatedSection: FlowSection) => void;
  onDragStart?: (sectionId: string, e: React.MouseEvent) => void;
  onDelete?: (sectionId: string) => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  section,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(section.title);
  }, [section.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    setIsEditing(false);
    onUpdate({ ...section, title: tempTitle });
  };

  return (
    <div
      id={`section-${section.id}`}
      className={`drafo-section-header ${isSelected ? 'selected' : ''}`}
      style={{ transform: `translate(${section.x ?? 80}px, ${section.y}px)` }}
      onClick={(e) => onSelect(section.id, e)}
      onMouseDown={(e) => {
        if (!isEditing) {
          onDragStart?.(section.id, e);
        }
      }}
    >
      {/* Soft Pastel Pill Badge */}
      <div
        className="drafo-section-pill"
        style={{
          backgroundColor: section.pillBg || '#DCF0DC',
          borderColor: section.pillBorderColor || '#81C784',
          color: section.pillTextColor || '#1F5E21'
        }}
      >
        <GripVertical size={13} className="drafo-section-drag-handle" opacity={0.6} />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="drafo-section-input"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Double click to edit section title"
          >
            {section.title}
          </span>
        )}
      </div>

      {/* Horizontal Divider Line if enabled */}
      {section.hasDivider && <div className="drafo-section-divider" />}
    </div>
  );
};
