import { FocusSettings, DEFAULT_SETTINGS } from '../types';

let currentSettings: FocusSettings = { ...DEFAULT_SETTINGS };

// Apply settings to document element dataset to toggle CSS rules instantaneously
function applySettingsToDOM(settings: FocusSettings) {
  const root = document.documentElement;

  if (settings.isFocusModeActive) {
    root.setAttribute('data-studytube-focus', 'true');
    root.setAttribute('data-studytube-hide-recommendations', settings.hideRecommendations ? 'true' : 'false');
    root.setAttribute('data-studytube-hide-comments', settings.hideComments ? 'true' : 'false');
    root.setAttribute('data-studytube-hide-sidebar', settings.hideSidebar ? 'true' : 'false');
    renderHomepageBanner();
  } else {
    root.removeAttribute('data-studytube-focus');
    root.removeAttribute('data-studytube-hide-recommendations');
    root.removeAttribute('data-studytube-hide-comments');
    root.removeAttribute('data-studytube-hide-sidebar');
    removeHomepageBanner();
  }
}

// Render clean StudyTube banner on homepage if feed is hidden
function renderHomepageBanner() {
  const isHomepage = window.location.pathname === '/' || window.location.pathname === '';
  if (!isHomepage || !currentSettings.isFocusModeActive || !currentSettings.hideRecommendations) {
    removeHomepageBanner();
    return;
  }

  const existingBanner = document.getElementById('studytube-home-banner');
  if (existingBanner) return;

  const primaryContent = document.querySelector('ytd-browse[page-subtype="home"]');
  if (!primaryContent) return;

  const banner = document.createElement('div');
  banner.id = 'studytube-home-banner';
  banner.className = 'studytube-focus-banner';
  banner.innerHTML = `
    <div class="studytube-focus-badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Focus Mode Active
    </div>
    <div class="studytube-focus-title">StudyTube Learning Space</div>
    <div class="studytube-focus-desc">
      Recommendations and algorithmic distractions are hidden. Use the search bar above to look up specific lectures, tutorials, or study materials.
    </div>
  `;

  primaryContent.prepend(banner);
}

function removeHomepageBanner() {
  const banner = document.getElementById('studytube-home-banner');
  if (banner) {
    banner.remove();
  }
}

// Initial storage fetch
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get('studytube_settings', (res) => {
    if (res['studytube_settings']) {
      currentSettings = { ...DEFAULT_SETTINGS, ...res['studytube_settings'] };
    }
    applySettingsToDOM(currentSettings);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['studytube_settings']) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes['studytube_settings'].newValue };
      applySettingsToDOM(currentSettings);
    }
  });
}

// DOM observation for dynamic single-page-app navigation on YouTube
const observer = new MutationObserver(() => {
  if (currentSettings.isFocusModeActive && currentSettings.hideRecommendations) {
    renderHomepageBanner();
  }
});

// Start observing when document is ready
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
}

// Listen for YouTube URL navigation events (yt-navigate-finish)
window.addEventListener('yt-navigate-finish', () => {
  if (currentSettings.isFocusModeActive && currentSettings.hideRecommendations) {
    renderHomepageBanner();
  }
});
