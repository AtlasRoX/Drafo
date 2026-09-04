/**
 * Color utility functions for contrast calculation, darkness detection,
 * and dynamic alpha channel composition.
 */

export const isColorDark = (colorStr?: string): boolean => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'auto' || colorStr === 'default') {
    return false;
  }
  const str = colorStr.trim().toLowerCase();

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
      // Perceived luminance (ITU-R BT.601)
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      return luminance < 135;
    }
  } else if (str.startsWith('rgb')) {
    const match = str.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      return luminance < 135;
    }
  }

  return false;
};

export const getContrastTextColor = (
  bgColor?: string,
  lightText = '#F8FAFC',
  darkText = '#0F172A'
): string => {
  return isColorDark(bgColor) ? lightText : darkText;
};
