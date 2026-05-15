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
  labelColor = "#333333",
}: BadgeConfig): string {
  // SVG dimensions
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 8 + 10;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  // SVG content
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb"/>
    <stop offset="1" stop-color="#999"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${labelColor}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)" opacity="0.1"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity="0.3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14" fill="#fff">${escapeXml(label)}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity="0.3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff">${escapeXml(value)}</text>
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
