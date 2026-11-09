# StudyTube

**Version:** 1.0.0
**License:** Apache 2.0
**Status:** Active Development
**Type:** Open-Source Browser Extension

---

## Overview

StudyTube is a privacy-first browser extension that transforms YouTube into a distraction-free learning environment. It uses a locally executed machine learning model to automatically classify video content as educational or non-educational, and applies configurable content filters during study sessions.

No data leaves your device. No account is required. No external AI API is used.

---

## The Problem

YouTube contains a large amount of high-quality educational content, but its algorithmic design exposes users to entertainment, news, Shorts, unrelated recommendations, and comment sections during study sessions. Standard browser controls do not provide granular filtering for educational content. Users frequently lose focus when distracting content appears alongside study material.

---

## What StudyTube Does

When Focus Mode is active, StudyTube:

- Hides YouTube Shorts from all surfaces.
- Removes the homepage recommendation feed and replaces it with a minimal search prompt.
- Hides the related video sidebar on watch pages.
- Hides the comment section on video pages.
- Classifies visible video cards using a locally executed ML model.
- Dims non-educational video cards while preserving study-relevant content.
- Badges verified study content for quick identification.
- Tracks active study time with a configurable focus timer.
- Delivers a browser notification when a study session completes.

---

## Machine Learning Classifier

The classifier is a TF-IDF and Logistic Regression model trained on a labeled dataset of YouTube video metadata. It runs entirely within the browser extension without any network request.

**Training dataset:** 2,272 labeled YouTube videos (deduplicated), split 70/15/15 into training, validation, and test sets.

**Input features:** Video title, description, tags.

**Test set results:**

| Metric | Score |
|---|---|
| Accuracy | 98.24% |
| Precision (Educational) | 100.00% |
| Recall (Educational) | 96.63% |
| F1-Score | 0.9829 |
| ROC-AUC | 1.0000 |
| Title-Only Accuracy | 95.01% |

The model is exported as a JSON file (289 KB) bundled directly into the extension. The trained vocabulary, IDF weights, logistic regression coefficients, and intercept are reproduced in TypeScript for deterministic browser-side inference. Inference output has been validated to be numerically identical to scikit-learn predictions.

---

## Architecture

```
Popup UI (React + TypeScript)
        |
Background Service Worker
        |
Browser Local Storage
        |
YouTube Content Script
        |
Local ML Inference Engine (TF-IDF + Logistic Regression)
```

The extension requires no backend server. All state, settings, and model weights are stored and executed locally.

---

## Technology Stack

**Extension:**
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Chrome Manifest V3

**Machine Learning:**
- Python 3.10
- scikit-learn (TF-IDF Vectorizer, Logistic Regression)
- pandas, NumPy

**Browser Inference:**
- Pure TypeScript implementation of TF-IDF and Logistic Regression
- No external JavaScript ML libraries

---

## Repository Structure

```
StudyTube/
├── docs/
│   ├── ARCHITECTURE.md        System architecture
│   ├── DESIGN.md              Design system and visual guidelines
│   ├── ML_PIPELINE.md         ML pipeline specification
│   ├── PRD.md                 Product Requirements Document
│   └── ROADMAP.md             Development roadmap
├── ml/
│   ├── dataset/
│   │   ├── raw/               Raw CSV data files (not committed to repository)
│   │   ├── processed/         Cleaned train/val/test splits
│   │   └── preprocess.py      Preprocessing script
│   ├── models/
│   │   └── model_weights.json Exported model JSON (vocabulary, IDF, weights)
│   └── training/
│       └── train.py           Training and evaluation script
├── public/
│   ├── manifest.json          Chrome Manifest V3
│   ├── content.css            YouTube DOM filtering stylesheet
│   ├── model.json             Bundled browser model weights
│   └── icon*.png              Extension icons
├── src/
│   ├── background/            Background service worker
│   ├── content/               YouTube content script and DOM filtering
│   ├── ml/                    Browser ML inference engine
│   ├── popup/                 React popup UI
│   ├── storage/               Chrome storage abstraction
│   └── types/                 Shared TypeScript types
├── scripts/
│   └── generate-icons.mjs     Icon generation script
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Installation: Load as Unpacked Extension (Development)

**Requirements:**
- Node.js 18 or later
- npm 9 or later
- Google Chrome, Brave, or any Chromium-based browser

**Step 1: Clone the repository**

```bash
git clone https://github.com/Md-Arif-hasnat99/Study-Tube.git
cd Study-Tube
```

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Build the extension**

```bash
npm run build
```

This produces a `dist/` directory containing the complete extension.

**Step 4: Load into Chrome or Brave**

1. Open your browser and navigate to `chrome://extensions`.
2. Enable Developer mode using the toggle in the top-right corner.
3. Click Load unpacked.
4. Select the `dist/` folder inside the cloned repository.
5. The StudyTube extension will appear in your toolbar.

**Step 5: Use the extension**

1. Open YouTube in your browser.
2. Click the StudyTube icon in the toolbar.
3. Toggle Focus Mode to activate distraction filtering.
4. Start the focus timer to track your study session.

---

## Rebuilding the ML Model

The model weights shipped with this repository were generated by the included Python training pipeline. To retrain the model on updated data:

**Step 1: Prepare a dataset**

Place a labeled CSV file at `ml/dataset/raw/Data_final.csv`. The file must include the following columns:

- `Video ID`
- `Title`
- `Description1`
- `Description2`
- `Description3`
- `Tags`
- `Class` (integer: 1 for educational, 0 for non-educational)

**Step 2: Install Python dependencies**

```bash
pip install scikit-learn pandas numpy
```

**Step 3: Preprocess the dataset**

```bash
python ml/dataset/preprocess.py
```

**Step 4: Train and export the model**

```bash
python ml/training/train.py
```

This generates:
- `ml/models/model_weights.json` — full model for inspection
- `public/model.json` — model bundled for browser extension use

**Step 5: Rebuild the extension**

```bash
npm run build
```

---

## Privacy

StudyTube is designed to operate entirely offline.

- No video titles, descriptions, or browsing data are sent to any external server.
- No user account or registration is required.
- No analytics or telemetry are collected.
- All classification decisions are made locally using weights bundled into the extension package.
- Settings and session state are stored exclusively in the browser's local storage.

The only network requests the extension makes are to `youtube.com` as part of normal page loading. The ML inference engine does not make any network calls.

---

## Supported Browsers

| Browser | Manifest V3 Support | Status |
|---|---|---|
| Google Chrome | Full | Supported |
| Brave | Full | Supported |
| Microsoft Edge | Full | Supported |
| Firefox | Partial (MV3 in progress) | Planned |

---

## Known Limitations

- YouTube's DOM structure changes periodically. Filtering selectors may require updates after major YouTube redesigns.
- The ML classifier is trained on a fixed dataset. It may not generalize well to niche or newly emerging content categories.
- The classifier prioritizes precision for educational content. Some legitimate educational videos may be dimmed if their titles and descriptions lack standard educational terminology.
- Strict Focus Mode (preventing extension disabling during sessions) is not implemented in the current version. Browser-level extension management cannot be restricted by the extension itself.
- The classifier uses video titles primarily. Videos whose educational content is implied only from channel name or thumbnail will not be identified.

---

## Development Roadmap

Completed phases:

- Phase 1: Repository and documentation setup
- Phase 2: Extension foundation (Vite, React, TypeScript, Manifest V3)
- Phase 3: Popup UI and Focus Mode with glassmorphism design system
- Phase 4: Focus timer with alarm-based persistence across service worker suspension
- Phase 5: YouTube DOM filtering (Shorts, homepage feed, comments, sidebar)
- Phase 6: ML dataset preparation and preprocessing
- Phase 7: TF-IDF and Logistic Regression model training
- Phase 8: Browser inference engine and ML integration with content script

Planned phases:

- Phase 9: Unit tests, ML inference parity tests, extension integration tests
- Phase 10: Release documentation, screenshots, and v1.0 GitHub release

Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines covering repository setup, branch conventions, code standards, ML contributions, and the pull request process.

---

## License

StudyTube is released under the Apache License 2.0.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to the conditions stated in the [LICENSE](LICENSE) file.

```
Copyright 2024 Md Arif Hasnat

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Terms and Conditions of Use

By installing and using the StudyTube browser extension, you agree to the following terms:

**1. No Warranty**

StudyTube is provided on an "as is" basis without warranty of any kind, express or implied. The maintainers make no representations regarding the accuracy of the ML classifier, the completeness of content filtering, or the uninterrupted availability of extension functionality.

**2. No Liability**

The maintainers and contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of this software, including but not limited to incorrect content classification, failure of distraction filtering, or timer inaccuracies.

**3. Classification Accuracy**

The educational content classifier is a statistical model and will make classification errors. It may incorrectly block educational content or allow non-educational content. Users are responsible for verifying that the extension is functioning as intended in their use case.

**4. No Affiliation with YouTube or Google**

StudyTube is an independent open-source project. It is not affiliated with, endorsed by, or connected to YouTube LLC, Google LLC, or any of their affiliates. YouTube is a trademark of Google LLC.

**5. Compliance with YouTube Terms of Service**

Users are responsible for ensuring their use of this extension complies with YouTube's Terms of Service. The extension operates by modifying the visual presentation of YouTube's web interface in the user's own browser and does not scrape, harvest, or store YouTube content.

**6. No Data Collection**

StudyTube does not collect, transmit, or store any personally identifiable information. All data processed by the extension remains on the user's device.

**7. Open Source License**

The source code of StudyTube is released under the Apache License 2.0. The terms of that license govern use, reproduction, and distribution of the software. The user-facing terms above are supplementary and do not modify or supersede the Apache License 2.0.

**8. Changes to Terms**

These terms may be updated as the project evolves. Continued use of the extension after any changes constitutes acceptance of the updated terms.

---

## Contact and Issues

Bug reports, feature requests, and questions can be submitted via GitHub Issues at:

https://github.com/Md-Arif-hasnat99/Study-Tube/issues

For contribution discussions, open a GitHub Discussion or refer to the CONTRIBUTING.md guidelines.

