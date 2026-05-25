import { describe, it, expect } from 'vitest';

describe('generateBadgeSVG', () => {
  it('includes label and value in the SVG output', async () => {
    const { generateBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateBadgeSVG({ label: 'commits', value: '42' });
    expect(svg).toContain('commits');
    expect(svg).toContain('42');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('uses default colors when not provided', async () => {
    const { generateBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateBadgeSVG({ label: 'test', value: 'val' });
    expect(svg).toContain('#6366f1');
    expect(svg).toContain('#333333');
  });

  it('uses custom colors when provided', async () => {
    const { generateBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateBadgeSVG({ label: 'test', value: 'val', color: '#ff0000', labelColor: '#00ff00' });
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#00ff00');
  });

  it('escapes XML special characters in label and value', async () => {
    const { generateBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateBadgeSVG({ label: 'a&b', value: '<c>"d\'e' });
    expect(svg).toContain('a&amp;b');
    expect(svg).toContain('&lt;c&gt;&quot;d&#039;e');
  });

  it('calculates width based on character count', async () => {
    const { generateBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const shortSvg = generateBadgeSVG({ label: 'a', value: 'b' });
    const longSvg = generateBadgeSVG({ label: 'longlabel', value: 'longvalue' });
    const shortWidth = extractWidth(shortSvg);
    const longWidth = extractWidth(longSvg);
    expect(longWidth).toBeGreaterThan(shortWidth);
  });
});

describe('generateSimpleBadgeSVG', () => {
  it('generates a simple SVG with value and default color', async () => {
    const { generateSimpleBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateSimpleBadgeSVG('99+');
    expect(svg).toContain('99+');
    expect(svg).toContain('#6366f1');
    expect(svg).toContain('aria-label="badge"');
  });

  it('uses custom color when provided', async () => {
    const { generateSimpleBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateSimpleBadgeSVG('42', '#00ff00');
    expect(svg).toContain('#00ff00');
  });

  it('escapes XML in simple badge value', async () => {
    const { generateSimpleBadgeSVG } = await import('../src/app/api/badge/badge-utils');
    const svg = generateSimpleBadgeSVG('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});

describe('escapeXml', () => {
  it('escapes ampersand', async () => {
    const mod = await import('../src/app/api/badge/badge-utils');
    const svg = mod.generateBadgeSVG({ label: 'a&b', value: 'c' });
    expect(svg).toContain('a&amp;b');
  });

  it('escapes less-than and greater-than', async () => {
    const mod = await import('../src/app/api/badge/badge-utils');
    const svg = mod.generateBadgeSVG({ label: '<tag>', value: 'x' });
    expect(svg).toContain('&lt;tag&gt;');
  });

  it('escapes double quote', async () => {
    const mod = await import('../src/app/api/badge/badge-utils');
    const svg = mod.generateBadgeSVG({ label: 'say "hi"', value: 'x' });
    expect(svg).toContain('say &quot;hi&quot;');
  });

  it('escapes single quote', async () => {
    const mod = await import('../src/app/api/badge/badge-utils');
    const svg = mod.generateBadgeSVG({ label: "it's", value: 'x' });
    expect(svg).toContain('it&#039;s');
  });

  it('handles string with no special characters', async () => {
    const mod = await import('../src/app/api/badge/badge-utils');
    const svg = mod.generateBadgeSVG({ label: 'plain', value: 'text' });
    expect(svg).toContain('plain');
    expect(svg).toContain('text');
  });
});

function extractWidth(svg: string): number {
  const match = svg.match(/width="(\d+)"/);
  return match ? parseInt(match[1], 10) : 0;
}
