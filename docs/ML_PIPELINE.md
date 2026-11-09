# StudyTube
## Machine Learning Pipeline

**Version:** 1.0

---

## 1. Objective

Develop a lightweight text classification model that identifies
educational and distracting YouTube video content.

The model operates locally inside the browser extension.

---

## 2. Classification Objective

Initial classes:

- Educational.
- Non-Educational.

The intended classification target is study suitability rather
than merely whether a video contains instructional information.

---

## 3. Input Features

Primary:
- Video title.
- Video description.

Optional:
- Channel name.
- YouTube category.
- Trusted channel information.

The initial model must primarily rely on title and description.

---

## 4. Dataset

Candidate datasets:

- Google Research i3-video.
- YouTube video metadata datasets.
- Educational video metadata datasets.

Dataset selection must consider:

- Label quality.
- Licensing.
- Metadata availability.
- Class balance.
- Duplicate videos.
- Dataset age.

---

## 5. Data Preprocessing

Tasks:

- Remove duplicate records.
- Handle missing descriptions.
- Normalize text.
- Validate labels.
- Remove unusable samples.
- Analyze class distribution.

---

## 6. Train / Validation / Test Split

Use separate training, validation, and test datasets.

Avoid data leakage.

Where possible, group related videos or channels
to reduce leakage between splits.

---

## 7. Baseline Model

TF-IDF + Logistic Regression.

Recommended experiments:

- Word unigrams and bigrams.
- Different minimum document frequencies.
- Different regularization strengths.
- Class weighting.
- Probability threshold tuning.

---

## 8. Evaluation

Metrics:

- Accuracy.
- Precision.
- Recall.
- F1-score.
- Confusion matrix.
- Classification latency.

The most important operational metric is the false-positive rate
for educational videos.

Incorrectly blocking legitimate educational content
is particularly harmful.

---

## 9. Model Export

Export:

- Vocabulary.
- IDF weights.
- Logistic Regression coefficients.
- Intercept.
- Class labels.
- Model metadata.

The export format must support browser inference.

---

## 10. Browser Inference

The browser performs:

1. Text normalization.
2. Tokenization.
3. TF-IDF calculation.
4. Logistic Regression inference.
5. Probability calculation.
6. Filtering decision.

Inference must be deterministic and tested against Python predictions.

---

## 11. Model Versioning

Each exported model should include:

- Model version.
- Dataset version.
- Training configuration.
- Evaluation metrics.
- Export timestamp.

---

## 12. Model Limitations

- Titles may be misleading.
- Descriptions may be incomplete.
- Channel names can introduce bias.
- Educational and entertainment categories overlap.
- Dataset labels may be subjective.
- Classification confidence is not guaranteed correctness.

---

## 13. Future Experiments

- Linear SVM.
- Improved dataset quality.
- Threshold optimization.
- Additional classification categories.
- DistilBERT.
- Feedback-driven retraining.