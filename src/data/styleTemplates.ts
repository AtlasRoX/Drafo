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
  // --- Modern Dark & High-Contrast Pro Themes ---
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark',
    description: 'Deep onyx surface with electric cyan accent',
    bg: '#0F172A',
    accentColor: '#38BDF8',
    borderColor: '#38BDF8',
    tint: 'none',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8'
  },
  {
    id: 'linear-charcoal',
    name: 'Linear Charcoal',
    description: 'Matte slate dark with crisp zinc metallic border',
    bg: '#18181B',
    accentColor: '#A1A1AA',
    borderColor: '#3F3F46',
    tint: 'none',
    textColor: '#FAFAFA',
    subtextColor: '#A1A1AA'
  },
  {
    id: 'vercel-monochrome',
    name: 'Vercel Pitch Black',
    description: 'Pure stark black with pure white vector stroke',
    bg: '#000000',
    accentColor: '#FFFFFF',
    borderColor: '#27272A',
    tint: 'none',
    textColor: '#FFFFFF',
    subtextColor: '#A1A1AA'
  },
  {
    id: 'supabase-emerald',
    name: 'Supabase Emerald',
    description: 'Deep forest black with cyber emerald neon glow',
    bg: '#131915',
    accentColor: '#3ECF8E',
    borderColor: '#246547',
    tint: 'none',
    textColor: '#ECFDF5',
    subtextColor: '#6EE7B7'
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    description: 'Twilight purple-slate with royal indigo border',
    bg: '#1E1B4B',
    accentColor: '#818CF8',
    borderColor: '#6366F1',
    tint: 'none',
    textColor: '#EEF2FF',
    subtextColor: '#A5B4FC'
  },
  {
    id: 'cyberpunk-amber',
    name: 'Cyber Amber',
    description: 'Dark tungsten surface with bright neon amber accent',
    bg: '#1C1917',
    accentColor: '#F59E0B',
    borderColor: '#D97706',
    tint: 'none',
    textColor: '#FEF3C7',
    subtextColor: '#FBBF24'
  },
  {
    id: 'oceanic-teal',
    name: 'Deep Oceanic',
    description: 'Abyssal deep teal card with glowing cyan accent',
    bg: '#082F49',
    accentColor: '#06B6D4',
    borderColor: '#0891B2',
    tint: 'none',
    textColor: '#ECFEFF',
    subtextColor: '#67E8F9'
  },
  {
    id: 'crimson-protocol',
    name: 'Crimson Protocol',
    description: 'Dark wine-black surface with vibrant ruby red stroke',
    bg: '#1F1315',
    accentColor: '#F43F5E',
    borderColor: '#E11D48',
    tint: 'none',
    textColor: '#FFF1F2',
    subtextColor: '#FDA4AF'
  },
  {
    id: 'royal-amethyst',
    name: 'Royal Amethyst',
    description: 'Deep violet night card with bright orchid purple',
    bg: '#1E1035',
    accentColor: '#C084FC',
    borderColor: '#9333EA',
    tint: 'none',
    textColor: '#FAF5FF',
    subtextColor: '#D8B4FE'
  },
  {
    id: 'titanium-gray',
    name: 'Titanium Slate',
    description: 'Industrial slate card with muted steel border',
    bg: '#1E293B',
    accentColor: '#94A3B8',
    borderColor: '#475569',
    tint: 'none',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8'
  },

  // --- Clean Light & Enterprise Themes ---
  {
    id: 'azure-light',
    name: 'Azure Modern',
    description: 'Clean white surface with cobalt blue accent',
    bg: '#FFFFFF',
    accentColor: '#2563EB',
    borderColor: '#3B82F6',
    tint: 'subtle',
    textColor: '#0F172A',
    subtextColor: '#475569'
  },
  {
    id: 'emerald-garden',
    name: 'Emerald Garden',
    description: 'Fresh mint surface wash with vivid green accent',
    bg: '#F0FDF4',
    accentColor: '#10B981',
    borderColor: '#059669',
    tint: 'subtle',
    textColor: '#064E3B',
    subtextColor: '#047857'
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Cool glacial blue wash with sky blue border',
    bg: '#F0F9FF',
    accentColor: '#0284C7',
    borderColor: '#38BDF8',
    tint: 'subtle',
    textColor: '#0C4A6E',
    subtextColor: '#0369A1'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    description: 'Warm gold surface wash with amber accent',
    bg: '#FFFBEB',
    accentColor: '#D97706',
    borderColor: '#F59E0B',
    tint: 'subtle',
    textColor: '#78350F',
    subtextColor: '#B45309'
  },
  {
    id: 'solar-orange',
    name: 'Solar Orange',
    description: 'Warm sunrise card with tangerine orange stroke',
    bg: '#FFF7ED',
    accentColor: '#EA580C',
    borderColor: '#F97316',
    tint: 'subtle',
    textColor: '#7C2D12',
    subtextColor: '#C2410C'
  },
  {
    id: 'ruby-minimal',
    name: 'Ruby Rose',
    description: 'Soft pastel red wash with crimson rose accent',
    bg: '#FFF1F2',
    accentColor: '#E11D48',
    borderColor: '#FB7185',
    tint: 'subtle',
    textColor: '#881337',
    subtextColor: '#BE123C'
  },
  {
    id: 'frosted-minimal',
    name: 'Frosted Slate',
    description: 'Neutral off-white slate with monochrome border',
    bg: '#F8FAFC',
    accentColor: '#475569',
    borderColor: '#CBD5E1',
    tint: 'none',
    textColor: '#0F172A',
    subtextColor: '#64748B'
  },
  {
    id: 'glass-wireframe',
    name: 'Glass Wireframe',
    description: 'Transparent interior with crisp cobalt vector border',
    bg: 'transparent',
    accentColor: '#2563EB',
    borderColor: '#2563EB',
    tint: 'none',
    textColor: '#0F172A',
    subtextColor: '#64748B'
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
