import { describe, it, expect } from 'vitest';
import { getHourInTimeZone } from '../src/lib/coding-activity-insights';

describe('getHourInTimeZone', () => {
  it('returns correct hour for UTC noon (12:00) in UTC timezone', () => {
    const date = new Date('2026-05-25T12:00:00Z');
    expect(getHourInTimeZone(date, 'UTC')).toBe(12);
  });

  it('returns correct hour for UTC noon in Asia/Kolkata (IST, UTC+5:30)', () => {
    const date = new Date('2026-05-25T12:00:00Z');
    // 12:00 UTC + 5:30 = 17:30 -> hour 17
    expect(getHourInTimeZone(date, 'Asia/Kolkata')).toBe(17);
  });

  it('returns correct hour for UTC midnight (00:00) in America/New_York EST (UTC-5)', () => {
    // 2026-12-25T00:00:00Z is standard time (EST = UTC-5)
    const date = new Date('2026-12-25T00:00:00Z');
    // 00:00 UTC - 5:00 = 19:00 (previous day) -> hour 19
    expect(getHourInTimeZone(date, 'America/New_York')).toBe(19);
  });

  it('returns correct hour during DST in America/New_York EDT (UTC-4)', () => {
    // 2026-06-25T00:00:00Z is daylight saving time (EDT = UTC-4)
    const date = new Date('2026-06-25T00:00:00Z');
    // 00:00 UTC - 4:00 = 20:00 (previous day) -> hour 20
    expect(getHourInTimeZone(date, 'America/New_York')).toBe(20);
  });

  it('handles invalid date input by returning 0 without throwing', () => {
    const invalidDate = new Date('invalid-date-string');
    expect(getHourInTimeZone(invalidDate, 'UTC')).toBe(0);
  });
});
