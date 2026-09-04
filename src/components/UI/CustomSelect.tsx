'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import './CustomSelect.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  indicatorColor?: string;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  searchable = false,
  className = ''
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const toggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
      setSearchQuery('');
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (val: T) => {
      onChange(val);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const filteredOptions = searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div
      ref={containerRef}
      className={`drafo-custom-select-container ${isOpen ? 'is-open' : ''} ${
        disabled ? 'is-disabled' : ''
      } ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className="drafo-custom-select-trigger"
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="drafo-select-trigger-content">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="drafo-select-item-icon">{selectedOption.icon}</span>
              )}
              {selectedOption.indicatorColor && (
                <span
                  className="drafo-select-item-dot"
                  style={{ backgroundColor: selectedOption.indicatorColor }}
                />
              )}
              <span className="drafo-select-item-label">{selectedOption.label}</span>
            </>
          ) : (
            <span className="drafo-select-placeholder">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`drafo-select-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="drafo-custom-select-menu" role="listbox">
          {searchable && options.length > 8 && (
            <div className="drafo-select-search-box">
              <Search size={13} className="drafo-select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="drafo-select-search-input"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="drafo-select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`drafo-custom-select-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="drafo-option-left">
                      {opt.icon && <span className="drafo-select-item-icon">{opt.icon}</span>}
                      {opt.indicatorColor && (
                        <span
                          className="drafo-select-item-dot"
                          style={{ backgroundColor: opt.indicatorColor }}
                        />
                      )}
                      <div className="drafo-option-text-group">
                        <span className="drafo-option-label">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="drafo-option-sublabel">{opt.sublabel}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="drafo-select-check-icon" />}
                  </div>
                );
              })
            ) : (
              <div className="drafo-select-empty-state">No matching options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
