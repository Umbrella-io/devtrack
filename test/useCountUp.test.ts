import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define globally mocked React hooks and tracking variables
const mockSetCount = vi.fn();
let mockEffectCallback: any = null;

vi.mock('react', () => {
  return {
    useState: vi.fn().mockImplementation((initial) => [initial, mockSetCount]),
    useRef: vi.fn().mockImplementation((initial) => ({ current: initial })),
    useEffect: vi.fn().mockImplementation((cb) => {
      mockEffectCallback = cb;
    }),
  };
});

// Setup mock window and animation frame globals
let mockAnimateCallback: any = null;
let mockCancelId: any = null;

global.window = {
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
} as any;

global.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  mockAnimateCallback = cb;
  return 999;
});

global.cancelAnimationFrame = vi.fn().mockImplementation((id) => {
  mockCancelId = id;
});

// Import the actual hook from source!
import { useCountUp } from '../src/hooks/useCountUp';

describe('useCountUp hook behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffectCallback = null;
    mockAnimateCallback = null;
    mockCancelId = null;
  });

  it('returns initial count of 0', () => {
    const count = useCountUp(100);
    expect(count).toBe(0);
  });

  it('immediately sets count to target if prefers-reduced-motion is enabled', () => {
    // Mock reduced motion
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
    
    useCountUp(100);
    expect(mockEffectCallback).toBeDefined();
    
    mockEffectCallback();
    expect(mockSetCount).toHaveBeenCalledWith(100);
    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('immediately sets count to 0 for target of 0 or negative', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
    
    useCountUp(0);
    mockEffectCallback();
    expect(mockSetCount).toHaveBeenCalledWith(0);
    
    vi.clearAllMocks();
    useCountUp(-5);
    mockEffectCallback();
    expect(mockSetCount).toHaveBeenCalledWith(0);
  });

  it('animates count smoothly using easeOutQuint and correct duration', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
    
    // Target 100, adaptive duration should be 800ms
    useCountUp(100);
    mockEffectCallback();
    
    expect(global.requestAnimationFrame).toHaveBeenCalled();
    expect(mockAnimateCallback).toBeDefined();
    
    // First animation frame (elapsed 0ms)
    mockAnimateCallback(1000);
    expect(mockSetCount).toHaveBeenCalledWith(0);
    
    // Second animation frame (elapsed 400ms - 50% progress)
    // easeOutQuint = 1 - (1 - 0.5)^5 = 1 - 0.03125 = 0.96875
    // expectedCount = Math.round(0.96875 * 100) = 97
    mockAnimateCallback(1400);
    expect(mockSetCount).toHaveBeenCalledWith(97);
    
    // Final animation frame (elapsed 800ms - 100% progress)
    mockAnimateCallback(1800);
    expect(mockSetCount).toHaveBeenCalledWith(100);
  });

  it('uses explicitly supplied custom duration if provided', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
    
    // Target 100, custom duration 2000ms
    useCountUp(100, 2000);
    mockEffectCallback();
    
    // First animation frame (elapsed 0ms)
    mockAnimateCallback(1000);
    
    // Second animation frame at 1000ms (50% progress for a 2000ms duration)
    // easeOutQuint = 1 - (1 - 0.5)^5 = 0.96875
    // expectedCount = 97
    mockAnimateCallback(2000);
    expect(mockSetCount).toHaveBeenCalledWith(97);
  });

  it('cancels animation frame on unmount', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
    
    useCountUp(100);
    const cleanup = mockEffectCallback();
    
    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(999);
  });
});
