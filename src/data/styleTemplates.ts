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
  {
    id: 'azure-light',
    name: 'Azure Modern',
    description: 'Clean white surface with cobalt blue accent',
    bg: '#FFFFFF',
    accentColor: '#2563EB',
    borderColor: '#3B82F6',
    tint: 'subtle'
  },
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark',
    description: 'Deep onyx night surface with electric cyan accent',
    bg: '#0F172A',
    accentColor: '#38BDF8',
    borderColor: '#38BDF8',
    tint: 'none',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8'
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    description: 'Slate card with royal indigo accent and dark typography',
    bg: '#1E293B',
    accentColor: '#6366F1',
    borderColor: '#818CF8',
    tint: 'none',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8'
  },
  {
    id: 'emerald-garden',
    name: 'Emerald Garden',
    description: 'Fresh mint surface wash with vivid green accent',
    bg: '#F0FDF4',
    accentColor: '#10B981',
    borderColor: '#10B981',
    tint: 'subtle'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    description: 'Warm gold surface wash with amber accent',
    bg: '#FFFBEB',
    accentColor: '#F59E0B',
    borderColor: '#F59E0B',
    tint: 'subtle'
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    description: 'Luxury purple pastel wash with violet accent',
    bg: '#FAF5FF',
    accentColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    tint: 'subtle'
  },
  {
    id: 'neon-rose',
    name: 'Neon Rose',
    description: 'Vibrant pink wash with crimson rose accent',
    bg: '#FFF1F2',
    accentColor: '#F43F5E',
    borderColor: '#F43F5E',
    tint: 'subtle'
  },
  {
    id: 'frosted-minimal',
    name: 'Frosted Minimal',
    description: 'Neutral slate surface with subtle monochrome border',
    bg: '#F8FAFC',
    accentColor: '#475569',
    borderColor: '#94A3B8',
    tint: 'none'
  },
  {
    id: 'glass-wireframe',
    name: 'Glass Wireframe',
    description: 'Transparent interior with crisp cobalt vector border',
    bg: 'transparent',
    accentColor: '#2563EB',
    borderColor: '#2563EB',
    tint: 'none'
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
