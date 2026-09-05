/**
 * Production-Grade Style Templates & Custom User Theme Persistence
 * Provides unified, harmonious presets for background, accent, border, and typography.
 */

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  bg: string;
  accentColor: string;
  borderColor?: string;
  tint?: 'none' | 'subtle' | 'medium' | 'strong';
  textColor?: string;
  subtextColor?: string;
  isCustom?: boolean;
}

export const DEFAULT_STYLE_TEMPLATES: StyleTemplate[] = [
  // =========================================================================
  // 1. TIMELESS ESSENTIALS (Kept Core Standards)
  // =========================================================================
  {
    id: 'azure-light',
    name: 'Azure Modern',
    description: 'Clean crisp white surface with electric cobalt vector border',
    bg: '#FFFFFF',
    accentColor: '#2563EB',
    borderColor: '#3B82F6',
    tint: 'subtle',
    textColor: '#0F172A',
    subtextColor: '#475569'
  },
  {
    id: 'obsidian-cyber',
    name: 'Deep Obsidian',
    description: 'Deep midnight void with glowing electric cyan accent',
    bg: '#0B0F19',
    accentColor: '#38BDF8',
    borderColor: '#0284C7',
    tint: 'none',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8'
  },
  {
    id: 'glass-wireframe',
    name: 'Glass Blueprint',
    description: 'Transparent interior with crisp cobalt architectural wireframe',
    bg: 'transparent',
    accentColor: '#2563EB',
    borderColor: '#2563EB',
    tint: 'none',
    textColor: '#0F172A',
    subtextColor: '#64748B'
  },

  // =========================================================================
  // 2. ELECTRIC NEON & CYBERPUNK (Vibrant High-Contrast Dark Glows)
  // =========================================================================
  {
    id: 'neon-cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Dark carbon chassis with blistering electric neon yellow stroke',
    bg: '#0F172A',
    accentColor: '#FACC15',
    borderColor: '#EAB308',
    tint: 'none',
    textColor: '#FEF9C3',
    subtextColor: '#FDE047'
  },
  {
    id: 'synthwave-sunset',
    name: 'Synthwave Sunset',
    description: 'Deep purple twilight with neon magenta rose border and glow',
    bg: '#180B2B',
    accentColor: '#F43F5E',
    borderColor: '#E11D48',
    tint: 'none',
    textColor: '#FFE4E6',
    subtextColor: '#FDA4AF'
  },
  {
    id: 'tokyo-cyan',
    name: 'Tokyo Matrix',
    description: 'Abyssal cyber-teal with radiant hyper-cyan vector line',
    bg: '#041B1F',
    accentColor: '#06B6D4',
    borderColor: '#22D3EE',
    tint: 'none',
    textColor: '#ECFEFF',
    subtextColor: '#67E8F9'
  },
  {
    id: 'hyper-lime',
    name: 'Hyper Lime',
    description: 'Deep carbon matrix with radioactive laser-green edge',
    bg: '#0A1A0F',
    accentColor: '#22C55E',
    borderColor: '#4ADE80',
    tint: 'none',
    textColor: '#F0FDF4',
    subtextColor: '#86EFAC'
  },
  {
    id: 'cosmic-violet',
    name: 'Cosmic Violet',
    description: 'Deep celestial violet night with electric amethyst outline',
    bg: '#140A2E',
    accentColor: '#A855F7',
    borderColor: '#C084FC',
    tint: 'none',
    textColor: '#FAF5FF',
    subtextColor: '#E9D5FF'
  },
  {
    id: 'solar-plasma',
    name: 'Solar Flare',
    description: 'Dark obsidian copper with blistering solar tangerine border',
    bg: '#1C0E08',
    accentColor: '#FF6B00',
    borderColor: '#FB923C',
    tint: 'none',
    textColor: '#FFF7ED',
    subtextColor: '#FDBA74'
  },

  // =========================================================================
  // 3. SATURATED JEWEL TONES (Bold, Rich & Colorful Filled Surfaces)
  // =========================================================================
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    description: 'Saturated ultramarine blue surface with bright sky blue trim',
    bg: '#1D4ED8',
    accentColor: '#93C5FD',
    borderColor: '#60A5FA',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#DBEAFE'
  },
  {
    id: 'emerald-jewel',
    name: 'Vivid Emerald',
    description: 'Rich jewel forest green card with crisp mint borders',
    bg: '#047857',
    accentColor: '#6EE7B7',
    borderColor: '#34D399',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#D1FAE5'
  },
  {
    id: 'velvet-amethyst',
    name: 'Velvet Amethyst',
    description: 'Luxurious saturated royal purple with vibrant lilac edge',
    bg: '#6D28D9',
    accentColor: '#DDD6FE',
    borderColor: '#A78BFA',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#EDE9FE'
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Ruby',
    description: 'Bold saturated ruby wine surface with glowing rose trim',
    bg: '#BE123C',
    accentColor: '#FECDD3',
    borderColor: '#FB7185',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#FFE4E6'
  },
  {
    id: 'deep-teal',
    name: 'Tropic Teal',
    description: 'Deep saturated Caribbean teal with radiant seafoam border',
    bg: '#0F766E',
    accentColor: '#99F6E4',
    borderColor: '#2DD4BF',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#CCFBF1'
  },

  // =========================================================================
  // 4. AESTHETIC MODERN PASTELS (Drenched Colorful Light Surfaces)
  // =========================================================================
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Soft pastel lilac surface with bold royal violet typography',
    bg: '#F3E8FF',
    accentColor: '#7C3AED',
    borderColor: '#8B5CF6',
    tint: 'subtle',
    textColor: '#4C1D95',
    subtextColor: '#6D28D9'
  },
  {
    id: 'mint-mojito',
    name: 'Mint Mojito',
    description: 'Invigorating aqua mint surface with deep tropical teal outline',
    bg: '#CCFBF1',
    accentColor: '#0F766E',
    borderColor: '#14B8A6',
    tint: 'subtle',
    textColor: '#134E4A',
    subtextColor: '#115E59'
  },
  {
    id: 'peach-sorbet',
    name: 'Peach Sorbet',
    description: 'Warm luscious coral-pink wash with rich strawberry crimson border',
    bg: '#FFE4E6',
    accentColor: '#E11D48',
    borderColor: '#F43F5E',
    tint: 'subtle',
    textColor: '#881337',
    subtextColor: '#9F1239'
  },
  {
    id: 'lemon-burst',
    name: 'Lemonade Fizz',
    description: 'Sunlit bright golden surface with warm amber frame',
    bg: '#FEF9C3',
    accentColor: '#CA8A04',
    borderColor: '#EAB308',
    tint: 'subtle',
    textColor: '#713F12',
    subtextColor: '#854D0E'
  },
  {
    id: 'sky-glacier',
    name: 'Electric Sky',
    description: 'Radiant glacier sky blue with vivid azure outline',
    bg: '#E0F2FE',
    accentColor: '#0284C7',
    borderColor: '#0EA5E9',
    tint: 'subtle',
    textColor: '#0C4A6E',
    subtextColor: '#0369A1'
  },
  {
    id: 'bubblegum-pop',
    name: 'Bubblegum Pop',
    description: 'Playful vibrant candy pink surface with punchy magenta edge',
    bg: '#FCE7F3',
    accentColor: '#DB2777',
    borderColor: '#EC4899',
    tint: 'subtle',
    textColor: '#831843',
    subtextColor: '#9D174D'
  },
  {
    id: 'matcha-green',
    name: 'Matcha Latte',
    description: 'Smooth organic matcha green wash with bold forest green stroke',
    bg: '#DCFCE7',
    accentColor: '#16A34A',
    borderColor: '#22C55E',
    tint: 'subtle',
    textColor: '#14532D',
    subtextColor: '#166534'
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Horizon',
    description: 'Warm golden apricot wash with radiant sunset orange edge',
    bg: '#FFEDD5',
    accentColor: '#EA580C',
    borderColor: '#F97316',
    tint: 'subtle',
    textColor: '#7C2D12',
    subtextColor: '#9A3412'
  }
];

const STORAGE_KEY = 'drafo_user_style_templates';

export const loadCustomTemplates = (): StyleTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomTemplate = (
  template: Omit<StyleTemplate, 'id' | 'isCustom'>
): StyleTemplate => {
  const customTemplates = loadCustomTemplates();
  const newTemplate: StyleTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isCustom: true
  };
  const updated = [...customTemplates, newTemplate];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return newTemplate;
};

export const deleteCustomTemplate = (id: string): void => {
  const customTemplates = loadCustomTemplates();
  const updated = customTemplates.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};
