export const FONT_FAMILY_MAP: Record<string, string> = {
  sans: "var(--font-family-base), Inter, system-ui, -apple-system, sans-serif",
  display: "'Google Sans', 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
  serif: "Merriweather, Georgia, Cambria, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
  hand: "'Caveat', 'Kalam', 'Comic Sans MS', cursive"
};

export const FONT_FAMILY_OPTIONS = [
  { value: 'sans', label: 'Inter / Modern Sans', sublabel: 'Clean geometric sans-serif' },
  { value: 'display', label: 'Google Sans / Display', sublabel: 'Modern high-impact heading font' },
  { value: 'serif', label: 'Merriweather / Serif', sublabel: 'Editorial classical serif font' },
  { value: 'mono', label: 'JetBrains Mono / Code', sublabel: 'Code monospace technical font' },
  { value: 'hand', label: 'Caveat / Handwritten', sublabel: 'Casual tactile handwritten font' }
];

export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

export const TEXT_HIGHLIGHT_PALETTE = [
  { name: 'none', color: 'transparent', label: 'None' },
  { name: 'yellow', color: '#FEF08A', label: 'Yellow' },
  { name: 'green', color: '#BBF7D0', label: 'Mint' },
  { name: 'blue', color: '#BAE6FD', label: 'Sky' },
  { name: 'pink', color: '#FBCFE8', label: 'Pink' },
  { name: 'purple', color: '#E9D5FF', label: 'Purple' },
  { name: 'orange', color: '#FED7AA', label: 'Orange' }
];

export const TEXT_COLOR_PALETTE = [
  { name: 'dark', color: '#0F172A', label: 'Dark Charcoal' },
  { name: 'slate', color: '#475569', label: 'Slate Gray' },
  { name: 'blue', color: '#2563EB', label: 'Royal Blue' },
  { name: 'green', color: '#059669', label: 'Emerald' },
  { name: 'amber', color: '#D97706', label: 'Warm Amber' },
  { name: 'red', color: '#DC2626', label: 'Rose Red' },
  { name: 'purple', color: '#7C3AED', label: 'Violet' },
  { name: 'white', color: '#FFFFFF', label: 'Pure White' }
];
