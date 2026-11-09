# StudyTube
## Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Planning  
**Project Type:** Open-Source Browser Extension

---

## 1. Product Overview

StudyTube is a privacy-first browser extension designed to transform
YouTube into a distraction-free learning environment.

The extension uses a locally executed machine learning model to
identify educational video content and filter distracting content
during study sessions.

StudyTube combines automatic content classification, configurable
focus sessions, and distraction filtering into a lightweight
browser extension.

---

## 2. Problem Statement

YouTube provides extensive educational content but also exposes users
to entertainment recommendations, Shorts, unrelated videos, and
other distractions.

Existing YouTube controls do not provide sufficiently granular
educational-content filtering.

Users often lose focus when unrelated recommendations appear
during educational sessions.

StudyTube addresses this problem by automatically filtering
non-study content while preserving access to educational videos.

---

## 3. Product Goals

- Create a distraction-free YouTube learning environment.
- Automatically classify educational and distracting videos.
- Provide configurable study sessions and timers.
- Run machine learning inference locally.
- Eliminate mandatory AI API costs.
- Preserve user privacy.
- Provide a free and open-source solution.
- Support Chrome, Brave, and Firefox.

---

## 4. Target Users

### Primary Users
- University students.
- School students.
- Programming learners.
- Competitive examination candidates.
- Self-directed learners.

### Secondary Users
- Professionals learning technical skills.
- Online course participants.
- Researchers using educational videos.

---

## 5. Core Features

### FR-01: Focus Mode

Users can activate or deactivate Focus Mode through the extension popup.

When activated:
- YouTube distraction filtering becomes active.
- Educational content remains accessible.
- Non-study content is filtered.
- The focus timer can be started.

### FR-02: Educational Content Classification

The extension uses a locally executed ML classifier.

Inputs:
- Video title.
- Video description.
- Channel information when available.

Outputs:
- Educational probability.
- Classification result.
- Filtering decision.

The initial classifier uses TF-IDF and Logistic Regression.

### FR-03: YouTube Content Filtering

During Focus Mode:
- Hide YouTube Shorts.
- Hide distracting homepage recommendations.
- Filter non-educational video cards.
- Filter distracting search results.
- Filter related video recommendations.
- Preserve access to educational videos.

### FR-04: Focus Timer

Users can:
- Start a focus session.
- Select a study duration.
- Pause a session.
- Resume a session.
- End a session.
- Receive a completion notification.

Timer state must survive popup closure and browser suspension.

### FR-05: Trusted Content

Users can:
- Allow specific videos.
- Allow trusted channels.
- Override incorrect classifications.

### FR-06: Strict Focus Mode

Users can enable a stricter session configuration.

Strict Mode may:
- Disable ordinary Focus Mode controls during a session.
- Require confirmation before ending a session.
- Restrict configuration changes while active.

Strict Mode cannot guarantee protection against browser-level extension removal or disabling.

### FR-07: User Feedback

Users can report:
- Incorrectly allowed content.
- Incorrectly blocked content.

Feedback may be stored locally and optionally exported for dataset improvement.

### FR-08: Local Privacy

- ML inference happens locally.
- No video metadata is sent to a StudyTube server.
- No external AI API is required.
- Settings remain stored locally.
- No account is required.

---

## 6. Non-Functional Requirements

### Performance
- Lightweight popup.
- Responsive UI.
- Efficient content filtering.
- Fast local classification.

### Privacy
- Local inference.
- Minimal browser permissions.
- No unnecessary telemetry.

### Reliability
- Timer persistence.
- Robust handling of dynamically loaded YouTube content.
- Graceful handling of classification errors.

### Maintainability
- TypeScript.
- Modular architecture.
- Automated tests.
- Documented ML pipeline.

### Compatibility
- Chrome.
- Brave.
- Firefox.

---

## 7. MVP Scope

The initial release includes:

1. Browser extension popup.
2. Focus Mode toggle.
3. Basic YouTube distraction filtering.
4. Shorts blocking.
5. Local educational-content classification.
6. Focus timer.
7. Trusted channel and video allowlist.
8. Local settings persistence.

---

## 8. Out of Scope

The initial release will not include:

- Cloud-based AI inference.
- Paid AI APIs.
- User accounts.
- Social features.
- Cloud synchronization.
- Full YouTube replacement.
- Guaranteed prevention of extension removal.
- Deep learning model deployment.

---

## 9. Success Criteria

StudyTube MVP is successful when:

- Focus Mode activates correctly.
- Educational videos remain accessible.
- Distracting content is filtered.
- Classification operates without an external server.
- Timer survives popup closure.
- Users can override incorrect predictions.
- Extension works on supported browsers.
- Repository contains reproducible ML training instructions.

---

## 10. Future Enhancements

- Personalized classification.
- Additional study categories.
- Focus statistics.
- Session history.
- Improved classification models.
- User-configurable classification thresholds.
- Model improvement through feedback.
- Import/export settings.