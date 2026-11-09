import React, { useEffect, useState } from 'react';
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Tv2,
  MessageSquare,
  Compass,
  Clock
} from 'lucide-react';
import { FocusSettings, TimerState, DEFAULT_SETTINGS, DEFAULT_TIMER } from '../types';
import { getSettings, saveSettings, getTimerState, saveTimerState } from '../storage';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [timer, setTimer] = useState<TimerState>(DEFAULT_TIMER);
  const [showSettings, setShowSettings] = useState(false);

  // Load initial settings and timer
  useEffect(() => {
    getSettings().then(setSettings);
    getTimerState().then(setTimer);

    // Sync state changes from background or other contexts
    const interval = setInterval(async () => {
      const currentTimer = await getTimerState();
      setTimer(currentTimer);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleFocus = async () => {
    const updated = await saveSettings({ isFocusModeActive: !settings.isFocusModeActive });
    setSettings(updated);

    // If starting focus mode and timer is idle, start timer automatically
    if (updated.isFocusModeActive && timer.status === 'idle') {
      handleStartTimer();
    }
  };

  const handleToggleOption = async (key: keyof FocusSettings) => {
    const updated = await saveSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  const handleStartTimer = async () => {
    const duration = (settings.timerDurationMinutes || 25) * 60;
    const remaining = timer.status === 'paused' ? timer.remainingSeconds : duration;
    const endsAt = Date.now() + remaining * 1000;

    const newTimerState: TimerState = {
      status: 'running',
      durationSeconds: duration,
      remainingSeconds: remaining,
      endsAt,
    };
    await saveTimerState(newTimerState);
    setTimer(newTimerState);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'START_TIMER', durationMinutes: settings.timerDurationMinutes });
    }
  };

  const handlePauseTimer = async () => {
    if (timer.status === 'running' && timer.endsAt) {
      const remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
      const newTimerState: TimerState = {
        status: 'paused',
        durationSeconds: timer.durationSeconds,
        remainingSeconds,
        endsAt: null,
      };
      await saveTimerState(newTimerState);
      setTimer(newTimerState);

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'PAUSE_TIMER' });
      }
    }
  };

  const handleResetTimer = async () => {
    const duration = (settings.timerDurationMinutes || 25) * 60;
    const newTimerState: TimerState = {
      status: 'idle',
      durationSeconds: duration,
      remainingSeconds: duration,
      endsAt: null,
    };
    await saveTimerState(newTimerState);
    setTimer(newTimerState);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'RESET_TIMER' });
    }
  };

  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-[360px] bg-brand-bg text-brand-text min-h-[480px] flex flex-col p-4 select-none">
      {/* 1. Header */}
      <header className="flex items-center justify-between pb-3 border-b border-brand-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-focus-green shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight leading-none text-brand-text">
              StudyTube
            </h1>
            <p className="text-[11px] text-brand-muted mt-0.5">Focus Mode for YouTube</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-md border transition-colors ${
            showSettings
              ? 'bg-brand-surface border-brand-border text-brand-text shadow-xs'
              : 'border-transparent text-brand-muted hover:text-brand-text hover:bg-brand-surface'
          }`}
          title="Filter Settings"
          aria-label="Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </header>

      {/* 2. Main Focus Mode Toggle (Hero Glassmorphism Surface) */}
      <section className="mt-4">
        <div
          onClick={handleToggleFocus}
          className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
            settings.isFocusModeActive
              ? 'bg-focus-light/80 border-focus-green/30 backdrop-blur-md shadow-sm'
              : 'bg-brand-surface border-brand-border hover:border-brand-muted/40 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  settings.isFocusModeActive
                    ? 'bg-focus-green text-white shadow-xs'
                    : 'bg-brand-bg text-brand-muted border border-brand-border'
                }`}
              >
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium">
                  {settings.isFocusModeActive ? 'Focus Mode Active' : 'Focus Mode Paused'}
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  {settings.isFocusModeActive
                    ? 'Distractions blocked on YouTube'
                    : 'Click to eliminate distractions'}
                </p>
              </div>
            </div>

            {/* Tactile Switch */}
            <div
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.isFocusModeActive ? 'bg-focus-green' : 'bg-brand-border'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  settings.isFocusModeActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Focus Timer Interface */}
      <section className="mt-4 bg-brand-surface border border-brand-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-medium text-brand-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>Study Timer</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              timer.status === 'running'
                ? 'bg-focus-light text-focus-green'
                : timer.status === 'paused'
                ? 'bg-amber-100 text-amber-800'
                : timer.status === 'completed'
                ? 'bg-focus-light text-focus-green'
                : 'bg-brand-bg text-brand-muted border border-brand-border'
            }`}
          >
            {timer.status.toUpperCase()}
          </span>
        </div>

        <div className="text-center py-2">
          <div className="text-3xl font-mono font-semibold tracking-tight text-brand-text">
            {formatTime(timer.remainingSeconds)}
          </div>
          <p className="text-xs text-brand-muted mt-1">
            {timer.status === 'completed'
              ? 'Session completed! Take a break.'
              : `${settings.timerDurationMinutes || 25}-minute focus block`}
          </p>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center space-x-2 mt-3 pt-3 border-t border-brand-border/60">
          {timer.status === 'running' ? (
            <button
              onClick={handlePauseTimer}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-bg border border-brand-border text-brand-text hover:bg-brand-border/40 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handleStartTimer}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-focus-green text-white hover:bg-focus-green/90 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{timer.status === 'paused' ? 'Resume' : 'Start'}</span>
            </button>
          )}

          <button
            onClick={handleResetTimer}
            className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
            title="Reset Timer"
            aria-label="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 4. Active Filtering Toggles / Settings */}
      {showSettings ? (
        <section className="mt-4 bg-brand-surface border border-brand-border rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="text-xs font-medium text-brand-muted pb-1 border-b border-brand-border">
            Distraction Controls
          </div>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div className="flex items-center space-x-2 text-xs">
              <Tv2 className="w-3.5 h-3.5 text-brand-muted" />
              <span>Hide YouTube Shorts</span>
            </div>
            <input
              type="checkbox"
              checked={settings.hideShorts}
              onChange={() => handleToggleOption('hideShorts')}
              className="rounded border-brand-border text-focus-green focus:ring-focus-green accent-[#2F6B4F]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div className="flex items-center space-x-2 text-xs">
              <Compass className="w-3.5 h-3.5 text-brand-muted" />
              <span>Hide Homepage Feed</span>
            </div>
            <input
              type="checkbox"
              checked={settings.hideRecommendations}
              onChange={() => handleToggleOption('hideRecommendations')}
              className="rounded border-brand-border text-focus-green focus:ring-focus-green accent-[#2F6B4F]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <div className="flex items-center space-x-2 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-brand-muted" />
              <span>Hide Video Comments</span>
            </div>
            <input
              type="checkbox"
              checked={settings.hideComments}
              onChange={() => handleToggleOption('hideComments')}
              className="rounded border-brand-border text-focus-green focus:ring-focus-green accent-[#2F6B4F]"
            />
          </label>
        </section>
      ) : (
        <section className="mt-4 bg-brand-surface/60 border border-brand-border rounded-xl p-3 space-y-1.5">
          <div className="text-[11px] font-medium text-brand-muted flex items-center justify-between">
            <span>Active Protections</span>
            <span className="text-[10px] text-focus-green font-semibold">Ready</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="flex items-center space-x-1 text-[11px] text-brand-muted">
              <CheckCircle2 className="w-3 h-3 text-focus-green shrink-0" />
              <span className="truncate">Shorts</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-brand-muted">
              <CheckCircle2 className="w-3 h-3 text-focus-green shrink-0" />
              <span className="truncate">Feed</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-brand-muted">
              <CheckCircle2 className="w-3 h-3 text-focus-green shrink-0" />
              <span className="truncate">Comments</span>
            </div>
          </div>
        </section>
      )}

      {/* 5. Minimal Footer */}
      <footer className="mt-auto pt-4 flex items-center justify-between text-[11px] text-brand-muted">
        <span>v1.0 • Privacy-first</span>
        <span>Local Processing</span>
      </footer>
    </div>
  );
};
