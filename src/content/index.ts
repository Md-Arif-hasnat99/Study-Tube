import { FocusSettings, DEFAULT_SETTINGS } from '../types';
import { classifier } from '../ml/classifier';

let currentSettings: FocusSettings = { ...DEFAULT_SETTINGS };
let isTemporarilyRevealed = false;

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
    classifyVisibleVideos();
  } else {
    root.removeAttribute('data-studytube-focus');
    root.removeAttribute('data-studytube-hide-recommendations');
    root.removeAttribute('data-studytube-hide-comments');
    root.removeAttribute('data-studytube-hide-sidebar');
    root.removeAttribute('data-studytube-reveal');
    removeHomepageBanner();
    removeSearchFilterBanner();
    resetClassifiedVideos();
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

// Update Search Results status banner
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
  if (banner) {
    banner.remove();
  }
}

// ML classification on visible YouTube video cards (search results & lists)
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

    // If title is not yet available (DOM rendering), skip for next mutation pass
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
      // Non-educational video during Focus Mode: completely hide!
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
    if (currentSettings.hideRecommendations) {
      renderHomepageBanner();
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      classifyVisibleVideos();
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
    if (currentSettings.hideRecommendations) {
      renderHomepageBanner();
    }
    setTimeout(classifyVisibleVideos, 300);
    setTimeout(classifyVisibleVideos, 800); // Second check for async search loads
  }
});
