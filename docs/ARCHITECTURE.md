# StudyTube
## System Architecture

**Version:** 1.0

---

## 1. Architecture Overview

StudyTube follows a local-first browser extension architecture.

The extension consists of:

- Popup UI.
- Background service worker.
- YouTube content scripts.
- Local ML inference engine.
- Browser storage.
- Python model training pipeline.

No backend server is required for normal operation.

---

## 2. System Architecture

```text
                STUDYTUBE EXTENSION

+----------------------------------+
|          Popup UI               |
|       React + TypeScript        |
|                                  |
| Focus Toggle | Timer | Settings |
+----------------+-----------------+
                 |
                 v
+----------------------------------+
|      Background Service Worker  |
|                                  |
| Focus Session Management         |
| Timer State                     |
| Notifications                    |
| Storage Coordination             |
+----------------+-----------------+
                 |
                 v
+----------------------------------+
|       Browser Local Storage      |
|                                  |
| Settings                         |
| Focus Session                    |
| Trusted Channels                 |
| Trusted Videos                   |
+----------------------------------+

                 |
                 v

+----------------------------------+
|        YouTube Content Script    |
|                                  |
| DOM Observation                  |
| Metadata Extraction               |
| Content Filtering                |
| UI Modification                  |
+----------------+-----------------+
                 |
                 v
+----------------------------------+
|         Local ML Engine          |
|                                  |
| Tokenization                     |
| TF-IDF                          |
| Logistic Regression              |
| Probability Calculation           |
+----------------------------------+