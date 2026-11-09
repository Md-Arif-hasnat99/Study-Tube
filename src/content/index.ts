import { FocusSettings, DEFAULT_SETTINGS } from '../types';
import { classifier, isDistractingQuery } from '../ml/classifier';

let currentSettings: FocusSettings = { ...DEFAULT_SETTINGS };
let isTemporarilyRevealed = false;
const overriddenSearches = new Set<string>();
const overriddenVideos = new Set<string>();

// Apply settings to document element dataset to toggle CSS rules instantaneously
function applySettingsToDOM(settings: FocusSettings) {
  const root = document.documentElement;

  if (settings.isFocusModeActive) {
    root.setAttribute('data-studytube-focus', 'true');
    root.setAttribute('data-studytube-hide-recommendations', settings.hideRecommendations ? 'true' : 'false');
    root.setAttribute('data-studytube-hide-comments', settings.hideComments ? 'true' : 'false');
    root.setAttribute('data-studytube-hide-sidebar', settings.hideSidebar ? 'true' : 'false');
    if (isTemporarilyRevealed) {
      root.setAttribute('data-studytube-reveal', 'true');
    } else {
      root.removeAttribute('data-studytube-reveal');
    }
    renderHomepageBanner();
    handlePageContext();
  } else {
    root.removeAttribute('data-studytube-focus');
    root.removeAttribute('data-studytube-hide-recommendations');
    root.removeAttribute('data-studytube-hide-comments');
    root.removeAttribute('data-studytube-hide-sidebar');
    root.removeAttribute('data-studytube-reveal');
    root.removeAttribute('data-studytube-search-restricted');
    removeHomepageBanner();
    removeSearchFilterBanner();
    removeSearchRestrictedGate();
    removePlayerGuardOverlay();
    resetClassifiedVideos();
  }
}

// Router dispatcher based on current YouTube page
function handlePageContext() {
  if (!currentSettings.isFocusModeActive) return;

  const path = window.location.pathname;

  if (path === '/' || path === '') {
    renderHomepageBanner();
    removeSearchRestrictedGate();
    removePlayerGuardOverlay();
  } else if (path.startsWith('/results')) {
    removeHomepageBanner();
    removePlayerGuardOverlay();
    const isRestricted = checkSearchQueryRestriction();
    if (!isRestricted) {
      classifyVisibleVideos();
    }
  } else if (path === '/watch') {
    removeHomepageBanner();
    removeSearchRestrictedGate();
    checkWatchPageRestriction();
    classifyVisibleVideos();
  } else {
    removeSearchRestrictedGate();
    removePlayerGuardOverlay();
  }
}

// 1. Homepage Focus Container
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
  if (banner) banner.remove();
}

// 2. Search Query Restriction (Focus Gate)
function checkSearchQueryRestriction(): boolean {
  if (!currentSettings.isFocusModeActive || !currentSettings.restrictEntertainmentSearches) {
    removeSearchRestrictedGate();
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const query = (urlParams.get('search_query') || '').trim();
  if (!query) return false;

  // If user previously completed the reflection pause for this query, allow it
  if (overriddenSearches.has(query.toLowerCase())) {
    removeSearchRestrictedGate();
    return false;
  }

  const check = isDistractingQuery(query);
  if (check.isDistracting) {
    renderSearchRestrictedGate(query, check.reason || 'Entertainment Query');
    return true;
  } else {
    removeSearchRestrictedGate();
    return false;
  }
}

function renderSearchRestrictedGate(query: string, reason: string) {
  document.documentElement.setAttribute('data-studytube-search-restricted', 'true');

  const existing = document.getElementById('studytube-restricted-gate');
  if (existing) return;

  const targetContainer = document.querySelector('ytd-search #contents, #primary #contents, ytd-section-list-renderer');
  if (!targetContainer) return;

  const gate = document.createElement('div');
  gate.id = 'studytube-restricted-gate';
  gate.className = 'studytube-restricted-gate';
  gate.innerHTML = `
    <div class="studytube-gate-icon-wrapper">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <div class="studytube-gate-badge">Search Restricted • Focus Mode</div>
    <div class="studytube-gate-title">Entertainment Content Blocked</div>
    <div class="studytube-gate-message">
      The search query <span class="studytube-gate-query-highlight">"${escapeHtml(query)}"</span> was restricted because it is categorized under <strong>${escapeHtml(reason)}</strong>. Focus Mode protects your study sessions from distraction loops.
    </div>
    <div class="studytube-gate-actions">
      <button id="studytube-gate-home" class="studytube-btn-primary">
        Back to Learning Space
      </button>
      <button id="studytube-gate-suggest" class="studytube-btn-secondary">
        Search Study Materials Instead
      </button>
      <button id="studytube-gate-override" class="studytube-btn-secondary">
        Allow with 10s Reflection
      </button>
    </div>
  `;

  targetContainer.prepend(gate);

  // Button actions
  gate.querySelector('#studytube-gate-home')?.addEventListener('click', () => {
    window.location.href = 'https://www.youtube.com/';
  });

  gate.querySelector('#studytube-gate-suggest')?.addEventListener('click', () => {
    const searchInput = document.querySelector<HTMLInputElement>('input#search, input[name="search_query"]');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
  });

  const overrideBtn = gate.querySelector<HTMLButtonElement>('#studytube-gate-override');
  if (overrideBtn) {
    let countdown = 10;
    let timerId: ReturnType<typeof setInterval> | null = null;

    overrideBtn.addEventListener('click', () => {
      if (timerId) return;

      overrideBtn.disabled = true;
      overrideBtn.textContent = `Reflecting... (${countdown}s)`;

      timerId = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          overrideBtn.textContent = `Reflecting... (${countdown}s)`;
        } else {
          if (timerId) clearInterval(timerId);
          overriddenSearches.add(query.toLowerCase());
          removeSearchRestrictedGate();
          classifyVisibleVideos();
        }
      }, 1000);
    });
  }
}

function removeSearchRestrictedGate() {
  document.documentElement.removeAttribute('data-studytube-search-restricted');
  const gate = document.getElementById('studytube-restricted-gate');
  if (gate) gate.remove();
}

// 3. Watch Page Protection (Video Player Guard)
function checkWatchPageRestriction() {
  if (!currentSettings.isFocusModeActive || !currentSettings.restrictEntertainmentVideos) {
    removePlayerGuardOverlay();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v') || '';
  if (!videoId || overriddenVideos.has(videoId)) {
    removePlayerGuardOverlay();
    return;
  }

  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string');
  const title = (titleEl?.textContent?.trim() || document.title).replace('- YouTube', '').trim();
  if (!title) return;

  const channelEl = document.querySelector('#channel-name, .ytd-channel-name');
  const channelName = channelEl?.textContent?.trim() || '';
  const hasMusicBadge = !!document.querySelector('yt-icon[badge-style="BADGE_STYLE_TYPE_VERIFIED_ARTIST"], ytd-badge-supported-renderer [aria-label*="Artist"]');

  let isRestricted = false;
  let reason = 'Entertainment / Non-study content';

  if (hasMusicBadge || /\b(vevo|music|topic)\b/i.test(channelName)) {
    isRestricted = true;
    reason = 'Music Video or Artist Channel';
  } else {
    const queryCheck = isDistractingQuery(title);
    if (queryCheck.isDistracting) {
      isRestricted = true;
      reason = queryCheck.reason || reason;
    } else {
      const pred = classifier.predict(`${title} ${channelName}`);
      if (!pred.isEducational && pred.probability < 0.35) {
        isRestricted = true;
        reason = 'Classified as non-educational video';
      }
    }
  }

  if (isRestricted) {
    // Pause video
    const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (video && !video.paused) {
      video.pause();
    }
    renderPlayerGuardOverlay(title, reason, videoId);
  } else {
    removePlayerGuardOverlay();
  }
}

function renderPlayerGuardOverlay(title: string, reason: string, videoId: string) {
  const playerContainer = document.querySelector('#movie_player, .html5-video-player');
  if (!playerContainer || document.getElementById('studytube-player-guard')) return;

  const overlay = document.createElement('div');
  overlay.id = 'studytube-player-guard';
  overlay.className = 'studytube-player-guard-overlay';
  overlay.innerHTML = `
    <div class="studytube-player-guard-badge">Focus Mode • Study Guard</div>
    <div class="studytube-player-guard-title">Non-Study Video Blocked</div>
    <div class="studytube-player-guard-desc">
      <strong>"${escapeHtml(title)}"</strong> is detected as <strong>${escapeHtml(reason)}</strong>. Stay on track with your study session.
    </div>
    <div class="studytube-gate-actions">
      <button id="studytube-player-home" class="studytube-btn-primary">
        Back to Learning Space
      </button>
      <button id="studytube-player-override" class="studytube-btn-secondary">
        Allow with 10s Reflection
      </button>
    </div>
  `;

  playerContainer.appendChild(overlay);

  overlay.querySelector('#studytube-player-home')?.addEventListener('click', () => {
    window.location.href = 'https://www.youtube.com/';
  });

  const overrideBtn = overlay.querySelector<HTMLButtonElement>('#studytube-player-override');
  if (overrideBtn) {
    let countdown = 10;
    let timerId: ReturnType<typeof setInterval> | null = null;

    overrideBtn.addEventListener('click', () => {
      if (timerId) return;

      overrideBtn.disabled = true;
      overrideBtn.textContent = `Reflecting... (${countdown}s)`;

      timerId = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          overrideBtn.textContent = `Reflecting... (${countdown}s)`;
        } else {
          if (timerId) clearInterval(timerId);
          overriddenVideos.add(videoId);
          removePlayerGuardOverlay();
          const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
          if (video) video.play();
        }
      }, 1000);
    });
  }
}

function removePlayerGuardOverlay() {
  const overlay = document.getElementById('studytube-player-guard');
  if (overlay) overlay.remove();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 4. Update Search Results Status Banner
function updateSearchFilterBanner(hiddenCount: number, educationalCount: number) {
  const isSearchPage = window.location.pathname.startsWith('/results');
  if (!isSearchPage || !currentSettings.isFocusModeActive) {
    removeSearchFilterBanner();
    return;
  }

  const targetContainer = document.querySelector('ytd-search #contents, #primary #contents, ytd-section-list-renderer #contents');
  if (!targetContainer) return;

  let banner = document.getElementById('studytube-search-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'studytube-search-banner';
    banner.className = 'studytube-search-filter-banner';
    targetContainer.prepend(banner);
  }

  const isRevealed = document.documentElement.getAttribute('data-studytube-reveal') === 'true';

  banner.innerHTML = `
    <div class="studytube-filter-info">
      <div>
        <div class="studytube-filter-text">
          StudyTube Focus Filter Active • ${hiddenCount} non-study ${hiddenCount === 1 ? 'item' : 'items'} hidden
        </div>
        <div class="studytube-filter-sub">
          ${educationalCount > 0 
            ? `Showing ${educationalCount} verified study ${educationalCount === 1 ? 'result' : 'results'}`
            : 'No educational content found for this search. Try searching for tutorials, lectures, or academic topics.'}
        </div>
      </div>
    </div>
    ${hiddenCount > 0 ? `
      <button id="studytube-toggle-peek" class="studytube-peek-btn">
        ${isRevealed ? 'Hide Distractions' : 'Temporarily Peek'}
      </button>
    ` : ''}
  `;

  const toggleBtn = banner.querySelector('#studytube-toggle-peek');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isTemporarilyRevealed = !isTemporarilyRevealed;
      applySettingsToDOM(currentSettings);
    });
  }
}

function removeSearchFilterBanner() {
  const banner = document.getElementById('studytube-search-banner');
  if (banner) banner.remove();
}

// 5. ML classification on visible YouTube video cards
function classifyVisibleVideos() {
  if (!currentSettings.isFocusModeActive) return;

  const selector = [
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-rich-item-renderer',
    'ytd-movie-renderer',
    'ytd-radio-renderer',
    'ytd-playlist-renderer'
  ].join(', ');

  const videoCards = document.querySelectorAll<HTMLElement>(selector);

  let hiddenCount = 0;
  let educationalCount = 0;

  videoCards.forEach((card) => {
    const tagName = card.tagName.toLowerCase();

    // Directly hide movies and radio mixes
    if (tagName === 'ytd-movie-renderer' || tagName === 'ytd-radio-renderer') {
      card.setAttribute('data-studytube-filtered', 'hidden');
      hiddenCount++;
      return;
    }

    const titleEl = card.querySelector<HTMLElement>(
      '#video-title, #video-title-link, .ytd-video-renderer #video-title, h3 a'
    );
    const title = titleEl?.textContent?.trim() || '';

    // If title is not yet available, skip for next mutation pass
    if (!title) return;

    card.dataset.studytubeProcessed = 'true';

    // Channel name & badge checking
    const channelEl = card.querySelector<HTMLElement>('#channel-name, .ytd-channel-name');
    const channelName = channelEl?.textContent?.trim() || '';
    const hasMusicBadge = !!card.querySelector('yt-icon[badge-style="BADGE_STYLE_TYPE_VERIFIED_ARTIST"], ytd-badge-supported-renderer [aria-label*="Artist"]');

    // Snippet description
    const descEl = card.querySelector<HTMLElement>('#description-text, .metadata-snippet-container');
    const description = descEl?.textContent?.trim() || '';

    let isEducational = false;

    if (hasMusicBadge || /\b(vevo|music|topic)\b/i.test(channelName)) {
      isEducational = false;
    } else {
      const result = classifier.predict(`${title} ${channelName}`, description);
      isEducational = result.isEducational;
    }

    if (isEducational) {
      card.setAttribute('data-studytube-filtered', 'educational');
      educationalCount++;

      if (!card.querySelector('.studytube-edu-tag')) {
        const tag = document.createElement('div');
        tag.className = 'studytube-edu-tag';
        tag.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Study Content
        `;
        const metadataAnchor = card.querySelector('#metadata-line, #channel-info');
        if (metadataAnchor && metadataAnchor.parentNode) {
          metadataAnchor.parentNode.insertBefore(tag, metadataAnchor.nextSibling);
        }
      }
    } else {
      card.setAttribute('data-studytube-filtered', 'hidden');
      hiddenCount++;
    }
  });

  if (window.location.pathname.startsWith('/results')) {
    updateSearchFilterBanner(hiddenCount, educationalCount);
  }
}

function resetClassifiedVideos() {
  const cards = document.querySelectorAll<HTMLElement>('[data-studytube-processed], [data-studytube-filtered]');
  cards.forEach((card) => {
    delete card.dataset.studytubeProcessed;
    card.removeAttribute('data-studytube-filtered');
    const tag = card.querySelector('.studytube-edu-tag');
    if (tag) tag.remove();
  });
}

// Initialize Model and Storage
async function init() {
  await classifier.loadModel();

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
  } else {
    applySettingsToDOM(currentSettings);
  }
}

init();

// DOM observation for dynamic content with debouncing
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const observer = new MutationObserver(() => {
  if (currentSettings.isFocusModeActive) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      handlePageContext();
    }, 150);
  }
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
}

window.addEventListener('yt-navigate-finish', () => {
  isTemporarilyRevealed = false;
  if (currentSettings.isFocusModeActive) {
    handlePageContext();
    setTimeout(handlePageContext, 300);
    setTimeout(handlePageContext, 800);
  }
});
