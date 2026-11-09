// Global test setup
// Polyfill localStorage for jsdom environment
import { vi } from 'vitest';

// Ensure localStorage is available and clean before each test
beforeEach(() => {
  localStorage.clear();
});

// Stub chrome extension APIs that are not available in jsdom
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    sendMessage: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
  },
};

// Assign to global so modules that check typeof chrome see it
(globalThis as unknown as Record<string, unknown>).chrome = chromeMock;
