/**
 * Utility functions for generating SVG badges
 * Follows shields.io-style design patterns
 */

export interface BadgeConfig {
  label: string;
  value: string;
  color?: string;
  labelColor?: string;
}

/**
 * Generate a shields.io-style SVG badge
 */
export function generateBadgeSVG({
  label,
  value,
  color = "#6366f1", // DevTrack accent color (indigo)
  labelColor = "#111827",
}: BadgeConfig): string {
  const escapedLabel = escapeXml(label);
  const escapedValue = escapeXml(value);
  // SVG dimensions
  const labelPadding = 12;
  const valuePadding = 14;
  const approxCharWidth = 7;
  const labelWidth = Math.max(50, label.length * approxCharWidth + labelPadding);
  const valueWidth = Math.max(60, value.length * approxCharWidth + valuePadding);
  const totalWidth = labelWidth + valueWidth;
  const height = 24;

  const rx = 6; // corner radius

  // SVG content
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${escapedLabel}: ${escapedValue}">
  <title>${escapedLabel}: ${escapedValue}</title>

  <defs>
    <linearGradient id="g" x2="0" y2="100%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.06"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity="0.12"/>
    </filter>

    <linearGradient id="s" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb"/>
      <stop offset="1" stop-color="#999"/>
    </linearGradient>
  </defs>

  <g filter="url(#shadow)">
<rect width="${labelWidth}" height="${height}" rx="${rx}" fill="${labelColor}" />
<rect x="${labelWidth}" width="${valueWidth}" height="${height}" rx="${rx}" fill="${color}" />
<rect width="${totalWidth}" height="${height}" rx="${rx}" fill="url(#g)" opacity="0.1" />
  </g>

  <g fill="#fff" text-anchor="middle" font-family="Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif" text-rendering="geometricPrecision" font-size="12" font-weight="600">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#000" fill-opacity="0.18">${escapedLabel}</text>
    <text x="${labelWidth / 2}" y="14" fill="#fff">${escapedLabel}</text>

    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#000" fill-opacity="0.18">${escapedValue}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff">${escapedValue}</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate a simple stat SVG with just number
 */
export function generateSimpleBadgeSVG(
  value: string,
  color: string = "#6366f1"
): string {
  const valueWidth = (value.length + 1) * 8 + 20;
  const height = 20;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${valueWidth}" height="${height}" role="img" aria-label="badge">
  <rect width="${valueWidth}" height="${height}" rx="3" fill="${color}"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${valueWidth / 2}" y="14" fill="#fff">${escapeXml(value)}</text>
  </g>
</svg>`;
}
