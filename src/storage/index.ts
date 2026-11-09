import { FocusSettings, TimerState, DEFAULT_SETTINGS, DEFAULT_TIMER } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'studytube_settings',
  TIMER: 'studytube_timer',
};

// Check if chrome.storage is available (browser extension runtime)
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

export async function getSettings(): Promise<FocusSettings> {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  } else {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export async function saveSettings(settings: Partial<FocusSettings>): Promise<FocusSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  } else {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }
  return updated;
}

export async function getTimerState(): Promise<TimerState> {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TIMER);
    return { ...DEFAULT_TIMER, ...(result[STORAGE_KEYS.TIMER] || {}) };
  } else {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIMER);
      return data ? { ...DEFAULT_TIMER, ...JSON.parse(data) } : DEFAULT_TIMER;
    } catch {
      return DEFAULT_TIMER;
    }
  }
}

export async function saveTimerState(timer: Partial<TimerState>): Promise<TimerState> {
  const current = await getTimerState();
  const updated = { ...current, ...timer };
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER]: updated });
  } else {
    localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(updated));
  }
  return updated;
}

export function subscribeToSettings(callback: (settings: FocusSettings) => void): () => void {
  if (hasChromeStorage) {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEYS.SETTINGS].newValue });
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  } else {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        callback({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
