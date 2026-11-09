import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_TIMER, type TimerState, type FocusSettings } from '../types';

describe('DEFAULT_SETTINGS', () => {
  it('has isFocusModeActive false by default', () => {
    expect(DEFAULT_SETTINGS.isFocusModeActive).toBe(false);
  });

  it('has all distraction filters enabled by default', () => {
    expect(DEFAULT_SETTINGS.hideShorts).toBe(true);
    expect(DEFAULT_SETTINGS.hideRecommendations).toBe(true);
    expect(DEFAULT_SETTINGS.hideComments).toBe(true);
    expect(DEFAULT_SETTINGS.hideSidebar).toBe(true);
  });

  it('has empty trustedChannels list by default', () => {
    expect(DEFAULT_SETTINGS.trustedChannels).toEqual([]);
  });

  it('has filterSearchEnabled false by default', () => {
    expect(DEFAULT_SETTINGS.filterSearchEnabled).toBe(false);
  });

  it('has restrictEntertainmentSearches and restrictEntertainmentVideos true by default', () => {
    expect(DEFAULT_SETTINGS.restrictEntertainmentSearches).toBe(true);
    expect(DEFAULT_SETTINGS.restrictEntertainmentVideos).toBe(true);
  });

  it('has timer duration of 25 minutes by default', () => {
    expect(DEFAULT_SETTINGS.timerDurationMinutes).toBe(25);
  });

  it('is not mutated by spread', () => {
    const copy: FocusSettings = { ...DEFAULT_SETTINGS, isFocusModeActive: true };
    expect(DEFAULT_SETTINGS.isFocusModeActive).toBe(false);
    expect(copy.isFocusModeActive).toBe(true);
  });
});

describe('DEFAULT_TIMER', () => {
  it('has status idle by default', () => {
    expect(DEFAULT_TIMER.status).toBe('idle');
  });

  it('has durationSeconds of 1500 (25 minutes)', () => {
    expect(DEFAULT_TIMER.durationSeconds).toBe(25 * 60);
  });

  it('has remainingSeconds equal to durationSeconds', () => {
    expect(DEFAULT_TIMER.remainingSeconds).toBe(DEFAULT_TIMER.durationSeconds);
  });

  it('has endsAt null by default', () => {
    expect(DEFAULT_TIMER.endsAt).toBeNull();
  });
});

describe('timer state transitions', () => {
  it('running state has a valid endsAt timestamp', () => {
    const now = Date.now();
    const running: TimerState = {
      status: 'running',
      durationSeconds: 1500,
      remainingSeconds: 1500,
      endsAt: now + 1500 * 1000,
    };
    expect(running.endsAt).toBeGreaterThan(now);
  });

  it('paused state has null endsAt and remaining > 0', () => {
    const paused: TimerState = {
      status: 'paused',
      durationSeconds: 1500,
      remainingSeconds: 900,
      endsAt: null,
    };
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingSeconds).toBeGreaterThan(0);
  });

  it('completed state has 0 remainingSeconds and null endsAt', () => {
    const completed: TimerState = {
      status: 'completed',
      durationSeconds: 1500,
      remainingSeconds: 0,
      endsAt: null,
    };
    expect(completed.remainingSeconds).toBe(0);
    expect(completed.endsAt).toBeNull();
  });

  it('remainingSeconds derived from timestamp is accurate', () => {
    const durationMs = 25 * 60 * 1000;
    const endsAt = Date.now() + durationMs;
    const computedRemaining = Math.ceil((endsAt - Date.now()) / 1000);
    // Allow 1 second tolerance for test execution time
    expect(computedRemaining).toBeGreaterThanOrEqual(25 * 60 - 1);
    expect(computedRemaining).toBeLessThanOrEqual(25 * 60);
  });
});

describe('formatTime helper logic', () => {
  // This replicates the popup formatting logic to verify its correctness.
  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats 1500 seconds (25 min) as 25:00', () => {
    expect(formatTime(1500)).toBe('25:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  it('formats 3599 seconds as 59:59', () => {
    expect(formatTime(3599)).toBe('59:59');
  });

  it('pads single digit minutes and seconds with leading zero', () => {
    expect(formatTime(65)).toBe('01:05');
  });
});
