export interface FocusSettings {
  isFocusModeActive: boolean;
  hideShorts: boolean;
  hideRecommendations: boolean;
  hideComments: boolean;
  hideSidebar: boolean;
  trustedChannels: string[];
  filterSearchEnabled: boolean;
  timerDurationMinutes: number;
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null; // epoch timestamp ms
}

export interface VideoMetadata {
  id: string;
  title: string;
  channelName: string;
  description?: string;
}

export interface ClassificationResult {
  isEducational: boolean;
  score: number;
  reasons: string[];
}

export const DEFAULT_SETTINGS: FocusSettings = {
  isFocusModeActive: false,
  hideShorts: true,
  hideRecommendations: true,
  hideComments: true,
  hideSidebar: true,
  trustedChannels: [],
  filterSearchEnabled: false,
  timerDurationMinutes: 25,
};

export const DEFAULT_TIMER: TimerState = {
  status: 'idle',
  durationSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  endsAt: null,
};

