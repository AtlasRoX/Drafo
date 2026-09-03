import React from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';
import './Modals.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Canvas & Navigation',
      items: [
        { keys: ['V'], desc: 'Select Tool (Marquee Drag)' },
        { keys: ['H'], desc: 'Hand Tool (Canvas Pan)' },
        { keys: ['M'], desc: 'Toggle Radar Mini-Map' },
        { keys: ['Space', 'Drag'], desc: 'Pan canvas freely' },
        { keys: ['Ctrl', 'Scroll'], desc: '120FPS Zoom on Cursor' },
        { keys: ['Ctrl', '+ / -'], desc: 'Zoom in / out centered' },
        { keys: ['Ctrl', '0'], desc: 'Reset zoom to 100%' },
        { keys: ['Shift', '1'], desc: 'Fit diagram to view' }
      ]
    },
    {
      title: 'Nodes & Selection',
      items: [
        { keys: ['Ctrl', 'A'], desc: 'Select all nodes on canvas' },
        { keys: ['Ctrl / Shift', 'Click'], desc: 'Multi-select / toggle nodes' },
        { keys: ['Ctrl', 'G'], desc: 'Group selected into Container' },
        { keys: ['Ctrl+Shift', 'G'], desc: 'Ungroup Container' },
        { keys: ['↑', '↓', '←', '→'], desc: 'Nudge node(s) by 1px' },
        { keys: ['Shift', 'Arrows'], desc: 'Nudge node(s) by 10px' },
        { keys: ['Ctrl', 'C'], desc: 'Copy selected node' },
        { keys: ['Ctrl', 'V'], desc: 'Paste copied node' },
        { keys: ['Ctrl', 'D'], desc: 'Duplicate selected node(s)' },
        { keys: ['Del / Backspace'], desc: 'Delete selected element(s)' }
      ]
    },
    {
      title: 'Quick Spawning',
      items: [
        { keys: ['Alt', 'N'], desc: 'Add Sticky Note at center' },
        { keys: ['Alt', 'S'], desc: 'Add Service Node' },
        { keys: ['Alt', 'D'], desc: 'Add 3D Database' },
        { keys: ['Alt', 'T'], desc: 'Add Terminal CLI' }
      ]
    },
    {
      title: 'Export & Workspace',
      items: [
        { keys: ['Ctrl', 'F'], desc: 'Quick Jump-to-Component Search' },
        { keys: ['Ctrl', 'E'], desc: 'Visual Export & Snippet Studio' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo change' },
        { keys: ['Ctrl', 'Y'], desc: 'Redo change' },
        { keys: ['Ctrl', '['], desc: 'Toggle Sidebar' },
        { keys: ['Ctrl', ']'], desc: 'Toggle Properties Inspector' },
        { keys: ['?'], desc: 'Open Keyboard Shortcuts' }
      ]
    }
  ];

  return (
    <div className="drafo-modal-overlay" onClick={onClose}>
      <div
        className="drafo-modal-container"
        style={{ maxWidth: 660 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drafo-modal-header">
          <div className="drafo-modal-title">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Keyboard size={18} />
            </div>
            <span>Keyboard Shortcuts</span>
          </div>
          <button className="drafo-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            maxHeight: 440,
            overflowY: 'auto',
            paddingRight: 4
          }}
        >
          {shortcutGroups.map((group) => (
            <div
              key={group.title}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                      {item.desc}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            color: '#1E293B',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: 4,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid #E2E8F0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
            <Sparkles size={14} color="#2563EB" />
            <span>Tip: Drag near any node to magnetically snap alignment guides!</span>
          </div>
          <button className="drafo-modal-btn primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
