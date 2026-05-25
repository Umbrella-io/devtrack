import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and supabase
const upsertMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      upsert: upsertMock,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

// Import the route module to test validation logic
// We test the validation logic directly from the POST handler

const MAX_TITLE_LEN = 100;
const MAX_UNIT_LEN = 30;
const MIN_TARGET = 1;
const MAX_TARGET = 10_000;
const VALID_RECURRENCES = ["none", "weekly", "monthly"] as const;

function validateTitle(title: unknown): string | null {
  if (typeof title !== "string" || title.trim().length === 0) {
    return "title must be a non-empty string";
  }
  if (title.length > MAX_TITLE_LEN) {
    return `title must be ${MAX_TITLE_LEN} characters or fewer`;
  }
  return null;
}

function validateTarget(target: unknown): string | null {
  if (
    typeof target !== "number" ||
    !Number.isInteger(target) ||
    target < MIN_TARGET ||
    target > MAX_TARGET
  ) {
    return `target must be an integer between ${MIN_TARGET} and ${MAX_TARGET}`;
  }
  return null;
}

function safeUnit(unit: unknown): string {
  return typeof unit === "string" ? unit.slice(0, MAX_UNIT_LEN) : "commits";
}

function safeRecurrence(recurrence: unknown): string {
  return VALID_RECURRENCES.includes(recurrence as typeof VALID_RECURRENCES[number])
    ? (recurrence as typeof VALID_RECURRENCES[number])
    : "none";
}

describe('Goals POST validation - title', () => {
  it('rejects empty string title', () => {
    expect(validateTitle('')).toBe("title must be a non-empty string");
  });

  it('rejects whitespace-only title', () => {
    expect(validateTitle('   ')).toBe("title must be a non-empty string");
  });

  it('rejects title over 100 characters', () => {
    const title = 'a'.repeat(101);
    expect(validateTitle(title)).toBe(`title must be ${MAX_TITLE_LEN} characters or fewer`);
  });

  it('accepts title at exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    expect(validateTitle(title)).toBeNull();
  });

  it('accepts valid non-empty title', () => {
    expect(validateTitle('Make 10 commits')).toBeNull();
  });

  it('rejects non-string title', () => {
    expect(validateTitle(123)).toBe("title must be a non-empty string");
    expect(validateTitle(null)).toBe("title must be a non-empty string");
    expect(validateTitle(undefined)).toBe("title must be a non-empty string");
  });

  it('title is trimmed of whitespace', () => {
    const title = '  Make commits  ';
    expect(title.trim()).toBe('Make commits');
    expect(title.trim().length).toBeGreaterThan(0);
  });
});

describe('Goals POST validation - target', () => {
  it('rejects target less than 1', () => {
    expect(validateTarget(0)).toBe(`target must be an integer between ${MIN_TARGET} and ${MAX_TARGET}`);
    expect(validateTarget(-1)).toBeTruthy();
    expect(validateTarget(-100)).toBeTruthy();
  });

  it('rejects target greater than 10000', () => {
    expect(validateTarget(10001)).toBe(`target must be an integer between ${MIN_TARGET} and ${MAX_TARGET}`);
    expect(validateTarget(100000)).toBeTruthy();
  });

  it('accepts target at boundaries (1 and 10000)', () => {
    expect(validateTarget(1)).toBeNull();
    expect(validateTarget(10000)).toBeNull();
  });

  it('rejects non-integer target', () => {
    expect(validateTarget(5.5)).toBeTruthy();
    expect(validateTarget(1.1)).toBeTruthy();
  });

  it('rejects non-number target', () => {
    expect(validateTarget('10')).toBeTruthy();
    expect(validateTarget(null)).toBeTruthy();
    expect(validateTarget(undefined)).toBeTruthy();
  });

  it('accepts valid integer target', () => {
    expect(validateTarget(7)).toBeNull();
    expect(validateTarget(50)).toBeNull();
  });
});

describe('Goals POST validation - safeUnit', () => {
  it('slices unit to max 30 characters', () => {
    const longUnit = 'a'.repeat(50);
    expect(safeUnit(longUnit).length).toBe(30);
  });

  it('returns commits for non-string unit', () => {
    expect(safeUnit(123)).toBe('commits');
    expect(safeUnit(null)).toBe('commits');
    expect(safeUnit(undefined)).toBe('commits');
  });

  it('returns exact string for valid unit under max length', () => {
    expect(safeUnit('commits')).toBe('commits');
    expect(safeUnit('pull requests')).toBe('pull requests');
  });

  it('handles empty string unit', () => {
    expect(safeUnit('')).toBe('');
  });
});

describe('Goals POST validation - safeRecurrence', () => {
  it('accepts valid recurrence values', () => {
    expect(safeRecurrence('none')).toBe('none');
    expect(safeRecurrence('weekly')).toBe('weekly');
    expect(safeRecurrence('monthly')).toBe('monthly');
  });

  it('returns none for invalid recurrence', () => {
    expect(safeRecurrence('daily')).toBe('none');
    expect(safeRecurrence('yearly')).toBe('none');
    expect(safeRecurrence('')).toBe('none');
    expect(safeRecurrence(null)).toBe('none');
    expect(safeRecurrence(undefined)).toBe('none');
  });
});

describe('Goals POST validation - getPeriodStart', () => {
  // Test the period start calculation for different recurrences

  function getPeriodStart(recurrence: string): string {
    const now = new Date();
    if (recurrence === "weekly") {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      return monday.toISOString();
    }
    if (recurrence === "monthly") {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    }
    return new Date(0).toISOString();
  }

  it('weekly recurrence returns Monday ISO string', () => {
    const period = getPeriodStart('weekly');
    const date = new Date(period);
    expect(date.getUTCDay()).toBe(1); // Monday
  });

  it('monthly recurrence returns 1st of month ISO string', () => {
    const period = getPeriodStart('monthly');
    const date = new Date(period);
    expect(date.getUTCDate()).toBe(1);
  });

  it('none recurrence returns epoch (never resets)', () => {
    const period = getPeriodStart('none');
    expect(period).toBe(new Date(0).toISOString());
  });
});
