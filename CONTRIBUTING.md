# Contributing to StudyTube

Thank you for your interest in contributing to StudyTube. This document provides complete guidelines for setting up the development environment, understanding the codebase, following contribution standards, and submitting changes.

StudyTube is an open-source project licensed under the Apache License 2.0. All contributions are subject to that license.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [What You Can Contribute](#what-you-can-contribute)
3. [Development Environment Setup](#development-environment-setup)
4. [Project Structure](#project-structure)
5. [Branch and Commit Conventions](#branch-and-commit-conventions)
6. [Code Standards](#code-standards)
7. [Extension Development Guidelines](#extension-development-guidelines)
8. [ML Pipeline Contributions](#ml-pipeline-contributions)
9. [Pull Request Process](#pull-request-process)
10. [Reporting Issues](#reporting-issues)
11. [Licensing of Contributions](#licensing-of-contributions)

---

## Code of Conduct

All contributors are expected to maintain a respectful and constructive environment. The project does not tolerate harassment, discriminatory language, or personal attacks of any kind in any project space, including issues, pull requests, discussions, and commit messages.

Violations may result in permanent exclusion from the project.

---

## What You Can Contribute

The following contributions are welcome:

**Bug fixes:** Corrections to incorrect behavior in the extension, ML pipeline, or build system.

**YouTube filtering improvements:** Updated DOM selectors to account for YouTube interface changes. YouTube redesigns its frontend frequently; keeping selectors current is an ongoing maintenance need.

**ML classifier improvements:** Improvements to the preprocessing pipeline, model hyperparameters, evaluation methodology, or export format.

**Dataset contributions:** If you have access to additional labeled YouTube video metadata under a permissive license, open an issue to discuss how it can be incorporated.

**UI improvements:** Visual refinements consistent with the design system defined in `docs/DESIGN.md`. New UI components must follow the existing design constraints.

**Browser compatibility:** Improvements or fixes targeting Brave, Microsoft Edge, or Firefox.

**Tests:** Unit tests for the ML inference engine, timer logic, storage abstraction, or content filtering functions.

**Documentation:** Corrections, clarifications, or additions to any documentation file.

**Performance improvements:** Reductions in bundle size, classification latency, or DOM observation overhead.

The following contributions are out of scope and will not be accepted:

- Cloud-based inference or any feature that sends user data to an external server.
- External AI API integration.
- User account systems.
- Features that require YouTube credentials or private API access.
- Paid or freemium functionality.
- Changes that violate the design principles in `docs/DESIGN.md`.

---

## Development Environment Setup

**Prerequisites:**

- Node.js 18 or later
- npm 9 or later
- Python 3.9 or later (for ML pipeline work only)
- Git
- Google Chrome, Brave, or any Chromium-based browser

**Step 1: Fork the repository**

Create a personal fork of the repository on GitHub before making any changes.

**Step 2: Clone your fork**

```bash
git clone https://github.com/YOUR_USERNAME/Study-Tube.git
cd Study-Tube
```

**Step 3: Add the upstream remote**

```bash
git remote add upstream https://github.com/Md-Arif-hasnat99/Study-Tube.git
```

**Step 4: Install Node.js dependencies**

```bash
npm install
```

**Step 5: Build the extension**

```bash
npm run build
```

The built extension will be output to the `dist/` directory.

**Step 6: Load the extension into Chrome for development**

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked and select the `dist/` directory.
4. After making code changes, run `npm run build` again and click the refresh icon on the extension card.

**Step 7 (ML only): Install Python dependencies**

```bash
pip install scikit-learn pandas numpy
```

---

## Project Structure

```
StudyTube/
├── docs/                      Project documentation
├── ml/
│   ├── dataset/
│   │   ├── raw/               Raw data files (not committed)
│   │   ├── processed/         Cleaned splits after preprocessing (not committed)
│   │   └── preprocess.py      Data cleaning and train/val/test splitting
│   ├── models/
│   │   └── model_weights.json Full model export (vocabulary, IDF, weights, metrics)
│   └── training/
│       └── train.py           Training, evaluation, and export script
├── public/
│   ├── manifest.json          Chrome Manifest V3 configuration
│   ├── content.css            CSS rules for YouTube DOM filtering
│   ├── model.json             Model weights bundled for browser use
│   └── icon*.png              Extension icons
├── scripts/
│   └── generate-icons.mjs     Programmatic PNG icon generation
├── src/
│   ├── background/
│   │   └── index.ts           Background service worker: timer, alarms, badge, notifications
│   ├── content/
│   │   ├── index.ts           YouTube content script: DOM filtering and ML classification
│   │   └── styles.css         Source stylesheet (compiled to public/content.css)
│   ├── ml/
│   │   └── classifier.ts      TypeScript ML inference engine (TF-IDF + Logistic Regression)
│   ├── popup/
│   │   ├── App.tsx            Main popup React component
│   │   ├── index.css          Popup stylesheet
│   │   └── main.tsx           React entry point
│   ├── storage/
│   │   └── index.ts           Chrome storage read/write abstraction
│   └── types/
│       └── index.ts           Shared TypeScript types and default values
├── vite.config.ts             Main Vite config (popup + background service worker)
└── vite.content.config.ts     Vite config for IIFE content script build
```

**Build architecture:**

The project uses two Vite build passes. The first pass builds the popup and background service worker using the standard ES module format. The second pass builds the content script as an IIFE (immediately invoked function expression) because Chrome content scripts cannot use top-level `import` statements.

---

## Branch and Commit Conventions

**Branch naming:**

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/short-description` | `feat/trusted-channels` |
| Bug fix | `fix/short-description` | `fix/timer-pause-state` |
| ML change | `ml/short-description` | `ml/retrain-dataset-v2` |
| Documentation | `docs/short-description` | `docs/update-architecture` |
| Refactor | `refactor/short-description` | `refactor/storage-module` |

Always branch from the latest `main`:

```bash
git fetch upstream
git checkout -b feat/your-feature upstream/main
```

**Commit message format:**

Use conventional commit format:

```
type(scope): short imperative description

Optional body paragraph explaining why the change was made,
not what was changed (the diff already shows what).

Optional footer: Closes #123
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ml`

Allowed scopes: `popup`, `content`, `background`, `storage`, `ml`, `build`, `docs`

Examples:

```
feat(content): add trusted channel allowlist to bypass ML filter
fix(background): correct remaining time calculation after service worker restart
ml(training): add bigram features and retrain with updated dataset
docs(readme): add Firefox installation instructions
```

Commit messages must:
- Use the imperative present tense ("add", not "added" or "adds")
- Not exceed 72 characters in the subject line
- Not end the subject line with a period

---

## Code Standards

**TypeScript:**

- All source files must be written in TypeScript with strict mode enabled.
- Avoid use of `any`. Use explicit types or generics.
- Unused variables and parameters are treated as compilation errors.
- Interfaces are preferred over type aliases for object shapes.

**React:**

- Components must be functional components using hooks.
- Side effects must use `useEffect` with correct dependency arrays.
- No class components.

**Styling:**

- All styling uses Tailwind CSS utility classes.
- Do not introduce custom CSS inside `src/popup/` components. Use Tailwind classes or extend `tailwind.config.js` for new design tokens.
- Custom CSS is acceptable only in `public/content.css` and `src/content/styles.css` for YouTube DOM targeting.
- The color palette and design constraints in `docs/DESIGN.md` must be followed exactly. Do not introduce new primary colors, gradients, or decorative elements.

**General:**

- Functions must be single-purpose.
- Avoid deeply nested control flow. Extract helper functions.
- Prefer `const` over `let`. Never use `var`.
- Async operations must handle errors with `try/catch` or `.catch()`.

**Running the TypeScript compiler:**

```bash
npx tsc --noEmit
```

This must pass with zero errors before submitting a pull request.

---

## Extension Development Guidelines

**Manifest V3 constraints:**

- The background context is a service worker. It may be suspended by the browser at any time. Do not store state in service worker memory across operations. Use `chrome.storage.local` for all persistent state.
- Do not use `chrome.extension.getBackgroundPage()` or any Manifest V2 API.
- Content Security Policy restrictions apply. Do not use `eval` or construct scripts from strings.

**Content script:**

- The content script runs on all `youtube.com` pages. It must be lightweight and avoid blocking the main thread.
- The MutationObserver callback runs frequently. Expensive operations inside it must be debounced.
- DOM queries must use stable, semantic selectors where available. Prefer `data-*` attributes and ARIA roles over positional selectors. Document any fragile selectors with a comment.
- When YouTube's DOM changes break a selector, open an issue or submit a pull request with the corrected selector and an explanation of the change.

**Storage:**

- All persistent state goes through `src/storage/index.ts`. Do not read from or write to `chrome.storage` directly in component or content script code.
- Storage keys are defined in `src/storage/index.ts`. Do not define new keys elsewhere.

**Timer:**

- The focus timer uses `chrome.alarms` for persistence across service worker suspension. Do not use `setInterval` or `setTimeout` for the timer in the background script.
- Timer state is stored as an end timestamp (`endsAt`) rather than a countdown, so it remains accurate if the service worker is suspended.

**Permissions:**

- Do not add new permissions to `manifest.json` without opening a discussion first. Additional permissions increase the browser's permission warning surface and may concern users.

---

## ML Pipeline Contributions

**Dataset requirements:**

- Any dataset used for training must have a license that permits use in an open-source project. Document the license in a comment in `preprocess.py`.
- Raw dataset files are not committed to the repository. Add appropriate patterns to `.gitignore`.
- Processed splits (train/val/test CSV files) are also not committed.

**Preprocessing:**

- Preprocessing must be deterministic and reproducible. The same input must always produce the same output.
- Use a fixed `random_state` for all train/test splits.
- Document any filtering decisions that remove rows from the dataset.

**Model changes:**

- Any change to the model architecture, hyperparameters, or preprocessing pipeline must be accompanied by a full evaluation report in the pull request description. Report accuracy, precision, recall, F1-score, and ROC-AUC on the held-out test set.
- The browser inference implementation in `src/ml/classifier.ts` must be validated to produce identical probability outputs to the Python scikit-learn pipeline. Include a validation script output in your pull request.

**Export format:**

- The exported model JSON must include the `version`, `vocabulary`, `idf`, `weights`, `intercept`, `threshold`, and `metrics` fields as defined in `ml/training/train.py`.
- The model JSON file at `public/model.json` must be committed alongside any ML changes so the extension ships with up-to-date weights.

**Evaluation priority:**

- Precision for the Educational class (minimizing false positives that block legitimate study content) is the most important metric. Changes that significantly reduce educational precision will not be accepted even if overall accuracy improves.

---

## Pull Request Process

**Before submitting:**

1. Fetch and rebase onto the latest `upstream/main`:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Build the extension and confirm it builds without errors:

   ```bash
   npm run build
   ```

3. Confirm TypeScript compiles without errors:

   ```bash
   npx tsc --noEmit
   ```

4. Test the built extension manually in Chrome by loading the `dist/` directory as an unpacked extension and verifying your changes work correctly on YouTube.

5. If your change affects ML code, include the full training and evaluation output in the pull request description.

**Pull request description:**

Your pull request description must include:

- A summary of what was changed and why.
- Steps to reproduce any bug being fixed.
- Steps to test the change manually.
- For ML changes: evaluation metrics on the test set.
- Reference to any related GitHub issue (use `Closes #N` or `Related to #N`).

**Review process:**

- A maintainer will review the pull request within a reasonable time.
- Review feedback will be provided as inline comments. Address all feedback before the pull request can be merged.
- Requests for changes must be addressed within 14 days or the pull request may be closed.
- Do not force-push to a branch after a review has been started unless requested by the reviewer.
- Squash commits before merging if the branch history is noisy. The maintainer may do this during merge.

**Merge requirements:**

- TypeScript compilation passes with no errors.
- Extension builds without errors.
- Code follows the standards described in this document.
- Pull request description is complete.
- At least one approval from a maintainer.

---

## Reporting Issues

**Before reporting a bug:**

- Check the open issues to confirm it has not already been reported.
- Reproduce the issue on the latest build from `main`.

**Bug report format:**

```
Title: [Brief description of the issue]

Browser: [Chrome / Brave / Edge, version number]
Extension version: [From chrome://extensions]
Operating system: [Windows / macOS / Linux]

Steps to reproduce:
1.
2.
3.

Expected behavior:
[What should happen]

Actual behavior:
[What happens instead]

Additional context:
[Any error messages from chrome://extensions or the browser console]
```

**YouTube DOM changes:**

If a YouTube redesign has broken a filtering selector, include the new HTML structure from the browser DevTools inspector in your issue report.

**Feature requests:**

Feature requests should include a clear description of the problem being solved and why the existing behavior is insufficient. Features that require external network access, user accounts, or additional sensitive permissions will not be accepted.

---

## Licensing of Contributions

By submitting a pull request to this repository, you agree that your contribution is submitted under the Apache License 2.0 and that you have the right to grant that license.

You retain copyright over your contribution. The project does not require a contributor license agreement (CLA) beyond the terms of the Apache License 2.0.

Contributions that include third-party code must identify the source and license of that code clearly in the pull request description and in the source file.

Do not submit contributions that include code derived from GPL-licensed projects. The Apache License 2.0 is not compatible with the GPL in all contexts.

---

## Questions

For questions about contributing that are not covered by this document, open a GitHub Discussion in the repository or reference the existing documentation in the `docs/` directory.

GitHub repository: https://github.com/Md-Arif-hasnat99/Study-Tube

