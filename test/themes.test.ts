import { describe, it, expect } from 'vitest';
import { isThemeId, getThemeDefinition, isDarkTheme, nextThemeId } from '../src/lib/themes';

describe('themes.ts', () => {
    
    describe('isThemeId', () => {
        it('should return true for valid theme IDs', () => {
            expect(isThemeId('classic-dark')).toBe(true);
            expect(isThemeId('modern-light-blue')).toBe(true);
            expect(isThemeId('nordic-frost')).toBe(true);
            expect(isThemeId('cyberpunk-matrix')).toBe(true);
        });

        it('should return false for invalid strings, null, or partial matches', () => {
            expect(isThemeId('dark')).toBe(false); // partial
            expect(isThemeId('typo-theme')).toBe(false);
            expect(isThemeId('')).toBe(false);
            expect(isThemeId(null as any)).toBe(false);
        });
    });

    describe('getThemeDefinition', () => {
        it('should return correct definition for valid IDs', () => {
            const def = getThemeDefinition('classic-dark');
            expect(def).toBeDefined();
            expect(def?.id).toBe('classic-dark');
        });

        it('should fall back to classic-dark for invalid IDs', () => {
            const def = getThemeDefinition('invalid-id' as any);
            expect(def?.id).toBe('classic-dark');
        });
    });

    describe('isDarkTheme', () => {
        it('should return true for dark themes and false for light', () => {
            expect(isDarkTheme('classic-dark')).toBe(true);
            expect(isDarkTheme('modern-light-blue')).toBe(false);
            expect(isDarkTheme('nordic-frost')).toBe(true);
            expect(isDarkTheme('cyberpunk-matrix')).toBe(true);
        });
    });

    describe('nextThemeId', () => {
        it('should cycle through themes correctly', () => {
            expect(nextThemeId('classic-dark')).toBe('modern-light-blue');
            expect(nextThemeId('cyberpunk-matrix')).toBe('classic-dark'); // Wrap around
        });

        it('should fall back to index 1 (modern-light-blue) for invalid input', () => {
            expect(nextThemeId('invalid-id' as any)).toBe('modern-light-blue');
        });
    });
});