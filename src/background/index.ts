import { getSettings, saveSettings, getTimerState, saveTimerState } from '../storage';
import { TimerState } from '../types';

const TIMER_ALARM_NAME = 'studytube_timer_tick';

// Setup alarms & badge on startup
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadge();
  checkTimerState();
});

// Alarm listener for timer completion and ticks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TIMER_ALARM_NAME) {
    checkTimerState();
  }
});

// Storage changes listener to update extension badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes['studytube_settings'] || changes['studytube_timer']) {
      updateBadge();
    }
  }
});

async function updateBadge() {
  const settings = await getSettings();
  const timer = await getTimerState();

  if (settings.isFocusModeActive) {
    if (timer.status === 'running') {
      const remainingMinutes = Math.max(1, Math.ceil(timer.remainingSeconds / 60));
      chrome.action.setBadgeText({ text: `${remainingMinutes}m` });
      chrome.action.setBadgeBackgroundColor({ color: '#2F6B4F' }); // Focus green
    } else {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#2F6B4F' });
    }
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

async function checkTimerState() {
  const timer = await getTimerState();
  if (timer.status !== 'running' || !timer.endsAt) {
    chrome.alarms.clear(TIMER_ALARM_NAME);
    return;
  }

  const now = Date.now();
  const remainingMs = timer.endsAt - now;

  if (remainingMs <= 0) {
    // Timer finished
    await saveTimerState({
      status: 'completed',
      remainingSeconds: 0,
      endsAt: null,
    });
    chrome.alarms.clear(TIMER_ALARM_NAME);

    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'StudyTube: Focus Session Finished!',
      message: 'Great job staying focused! Take a well-deserved break.',
      priority: 2,
    });

    updateBadge();
  } else {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    await saveTimerState({ remainingSeconds });
    updateBadge();
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'START_TIMER') {
    handleStartTimer(message.durationMinutes).then(sendResponse);
    return true;
  } else if (message.action === 'PAUSE_TIMER') {
    handlePauseTimer().then(sendResponse);
    return true;
  } else if (message.action === 'RESET_TIMER') {
    handleResetTimer().then(sendResponse);
    return true;
  } else if (message.action === 'TOGGLE_FOCUS') {
    handleToggleFocus().then(sendResponse);
    return true;
  }
});

async function handleStartTimer(durationMinutes?: number): Promise<TimerState> {
  const timer = await getTimerState();
  const duration = (durationMinutes || 25) * 60;
  const remaining = timer.status === 'paused' ? timer.remainingSeconds : duration;
  const endsAt = Date.now() + remaining * 1000;

  const updated: TimerState = {
    status: 'running',
    durationSeconds: duration,
    remainingSeconds: remaining,
    endsAt,
  };

  await saveTimerState(updated);
  chrome.alarms.create(TIMER_ALARM_NAME, { periodInMinutes: 0.2 }); // periodic check
  updateBadge();
  return updated;
}

async function handlePauseTimer(): Promise<TimerState> {
  const timer = await getTimerState();
  if (timer.status === 'running' && timer.endsAt) {
    const remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    const updated: TimerState = {
      status: 'paused',
      durationSeconds: timer.durationSeconds,
      remainingSeconds,
      endsAt: null,
    };
    await saveTimerState(updated);
    chrome.alarms.clear(TIMER_ALARM_NAME);
    updateBadge();
    return updated;
  }
  return timer;
}

async function handleResetTimer(): Promise<TimerState> {
  const settings = await getSettings();
  const duration = (settings.timerDurationMinutes || 25) * 60;
  const updated: TimerState = {
    status: 'idle',
    durationSeconds: duration,
    remainingSeconds: duration,
    endsAt: null,
  };
  await saveTimerState(updated);
  chrome.alarms.clear(TIMER_ALARM_NAME);
  updateBadge();
  return updated;
}

async function handleToggleFocus(): Promise<boolean> {
  const settings = await getSettings();
  const newFocus = !settings.isFocusModeActive;
  await saveSettings({ isFocusModeActive: newFocus });
  updateBadge();
  return newFocus;
}
