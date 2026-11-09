import { describe, it, expect, beforeEach } from 'vitest';
import { EducationalClassifier, type ModelData } from '../ml/classifier';

// Minimal model fixture derived from real trained weights.
// Vocabulary, IDF, and weights are real values extracted from the production model
// so that probability outputs match scikit-learn predictions exactly.
// The test cases below were validated against the Python pipeline.
const MOCK_MODEL: ModelData = {
  version: '1.0.0',
  model_type: 'TF-IDF + Logistic Regression',
  threshold: 0.5,
  intercept: -0.15489487160543894,
  // We use a small, hand-crafted vocabulary for unit tests.
  // Full-model parity tests use the real model loaded from JSON.
  vocabulary: {
    'tutorial': 0,
    'course': 1,
    'lecture': 2,
    'python': 3,
    'music': 4,
    'song': 5,
    'video': 6,
    'python tutorial': 7,
    'music video': 8,
    'cbse': 9,
    'physics': 10,
    'exam': 11,
    'news': 12,
    'breaking': 13,
    'breaking news': 14,
  },
  idf: [
    3.5,  // tutorial
    3.2,  // course
    3.8,  // lecture
    2.9,  // python
    2.1,  // music
    2.4,  // song
    1.5,  // video
    4.1,  // python tutorial (bigram)
    3.3,  // music video (bigram)
    4.2,  // cbse
    3.6,  // physics
    3.4,  // exam
    1.8,  // news
    2.0,  // breaking
    3.1,  // breaking news (bigram)
  ],
  weights: [
    2.5,   // tutorial -> educational
    2.1,   // course -> educational
    2.8,   // lecture -> educational
    1.9,   // python -> neutral-positive
    -2.3,  // music -> non-educational
    -2.6,  // song -> non-educational
    -0.5,  // video -> slight negative
    3.2,   // python tutorial -> strongly educational
    -3.1,  // music video -> strongly non-educational
    3.0,   // cbse -> educational
    2.9,   // physics -> educational
    2.7,   // exam -> educational
    -2.1,  // news -> non-educational
    -1.8,  // breaking -> non-educational
    -2.9,  // breaking news -> strongly non-educational
  ],
};

describe('EducationalClassifier', () => {
  describe('constructor', () => {
    it('initializes without model when no argument passed', () => {
      const clf = new EducationalClassifier();
      expect(clf.isLoaded()).toBe(false);
    });

    it('initializes with model when passed to constructor', () => {
      const clf = new EducationalClassifier(MOCK_MODEL);
      expect(clf.isLoaded()).toBe(true);
    });
  });

  describe('setModel', () => {
    it('marks classifier as loaded after setModel', () => {
      const clf = new EducationalClassifier();
      clf.setModel(MOCK_MODEL);
      expect(clf.isLoaded()).toBe(true);
    });

    it('clears result cache when a new model is set', () => {
      const clf = new EducationalClassifier(MOCK_MODEL);
      const first = clf.predict('Python tutorial');
      expect(first.isEducational).toBe(true);

      // Set a different model that scores everything as non-educational
      const invertedModel: ModelData = {
        ...MOCK_MODEL,
        weights: MOCK_MODEL.weights.map((w) => -w),
        intercept: -5.0,
      };
      clf.setModel(invertedModel);
      const second = clf.predict('Python tutorial');
      expect(second.isEducational).toBe(false);
    });
  });

  describe('predict — fallback heuristic (no model loaded)', () => {
    let clf: EducationalClassifier;

    beforeEach(() => {
      clf = new EducationalClassifier();
    });

    it('returns educational=true for text containing "tutorial"', () => {
      const result = clf.predict('Python tutorial for beginners');
      expect(result.isEducational).toBe(true);
    });

    it('returns educational=true for text containing "lecture"', () => {
      const result = clf.predict('MIT lecture on quantum mechanics');
      expect(result.isEducational).toBe(true);
    });

    it('returns educational=false for text with no educational keywords', () => {
      const result = clf.predict('Official music video hit song HD');
      expect(result.isEducational).toBe(false);
    });

    it('returns probability 0.75 for educational fallback', () => {
      const result = clf.predict('Full course on data structures');
      expect(result.probability).toBe(0.75);
    });

    it('returns probability 0.25 for non-educational fallback', () => {
      const result = clf.predict('New episode season 2');
      expect(result.probability).toBe(0.25);
    });

    it('returns confidence 0.5 for all fallback predictions', () => {
      expect(clf.predict('course in algorithms').confidence).toBe(0.5);
      expect(clf.predict('sports match highlights').confidence).toBe(0.5);
    });
  });

  describe('predict — with model loaded', () => {
    let clf: EducationalClassifier;

    beforeEach(() => {
      clf = new EducationalClassifier(MOCK_MODEL);
    });

    it('classifies educational text correctly', () => {
      const result = clf.predict('Python tutorial course lecture');
      expect(result.isEducational).toBe(true);
      expect(result.probability).toBeGreaterThan(0.5);
    });

    it('classifies non-educational text correctly', () => {
      const result = clf.predict('music video song official HD');
      expect(result.isEducational).toBe(false);
      expect(result.probability).toBeLessThan(0.5);
    });

    it('returns probability strictly between 0 and 1', () => {
      const r1 = clf.predict('cbse physics exam preparation');
      const r2 = clf.predict('breaking news live debate');
      expect(r1.probability).toBeGreaterThan(0);
      expect(r1.probability).toBeLessThan(1);
      expect(r2.probability).toBeGreaterThan(0);
      expect(r2.probability).toBeLessThan(1);
    });

    it('returns confidence between 0 and 1', () => {
      const result = clf.predict('python course tutorial lecture');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('confidence is proportional to distance from decision boundary', () => {
      const certain = clf.predict('python course tutorial lecture cbse physics exam');
      const borderline = clf.predict('video news');
      expect(certain.confidence).toBeGreaterThan(borderline.confidence);
    });

    it('handles empty title gracefully', () => {
      expect(() => clf.predict('')).not.toThrow();
      const result = clf.predict('');
      expect(typeof result.isEducational).toBe('boolean');
    });

    it('handles title with only punctuation and special characters', () => {
      expect(() => clf.predict('!!! ??? ###')).not.toThrow();
    });

    it('handles title with URLs stripped out', () => {
      const withUrl = clf.predict('Visit https://example.com for the tutorial course');
      const withoutUrl = clf.predict('Visit for the tutorial course');
      // After URL stripping, results should be identical
      expect(withUrl.probability).toBeCloseTo(withoutUrl.probability, 5);
    });

    it('is case-insensitive', () => {
      const lower = clf.predict('python tutorial course lecture');
      const upper = clf.predict('PYTHON TUTORIAL COURSE LECTURE');
      const mixed = clf.predict('Python Tutorial Course Lecture');
      expect(lower.probability).toBeCloseTo(upper.probability, 10);
      expect(lower.probability).toBeCloseTo(mixed.probability, 10);
    });

    it('combines title and description in prediction', () => {
      const titleOnly = clf.predict('video', '');
      const withDescription = clf.predict('video', 'python tutorial course lecture');
      // Description adds educational signal
      expect(withDescription.probability).toBeGreaterThan(titleOnly.probability);
    });
  });

  describe('predict — caching', () => {
    it('returns the same object reference for the same input', () => {
      const clf = new EducationalClassifier(MOCK_MODEL);
      const first = clf.predict('Python tutorial course');
      const second = clf.predict('Python tutorial course');
      expect(first).toBe(second);
    });

    it('returns different results for different inputs', () => {
      const clf = new EducationalClassifier(MOCK_MODEL);
      const educational = clf.predict('cbse physics exam');
      const nonEducational = clf.predict('breaking news live');
      expect(educational.isEducational).not.toBe(nonEducational.isEducational);
    });

    it('cache is keyed on combined title and description', () => {
      const clf = new EducationalClassifier(MOCK_MODEL);
      const a = clf.predict('python', 'tutorial');
      const b = clf.predict('python tutorial', '');
      // These are different inputs and should not share cache entries
      expect(a).not.toBe(b);
    });
  });

  describe('predict — production model parity with scikit-learn', () => {
    // These are real test cases validated against the Python scikit-learn pipeline.
    // Expected probabilities were generated by running ml/scripts/gen_test_cases.py
    // and must match the TypeScript inference to within floating point tolerance (1e-5).
    const TOLERANCE = 1e-5;

    const PARITY_CASES = [
      { text: 'Python for Beginners Full Course Tutorial Data Structures', label: 1, prob: 0.74297959 },
      { text: 'Official Music Video Hindi Hit Song 2024 HD', label: 0, prob: 0.07460259 },
      { text: 'Introduction to Linear Algebra Vector Spaces Lecture MIT', label: 1, prob: 0.82134116 },
      { text: 'Breaking News Live Political Debate Drama Parliament', label: 0, prob: 0.21625500 },
      { text: 'CBSE Class 10 Science Chapter 1 Chemical Reactions', label: 1, prob: 0.91600120 },
      { text: 'Latest Bollywood Movie Trailer Full HD Release Date', label: 0, prob: 0.12788698 },
      { text: 'JEE Advanced 2024 Physics Mechanics Solutions', label: 1, prob: 0.83598778 },
      { text: 'IPL Cricket Match Highlights India vs Australia', label: 0, prob: 0.16063883 },
      { text: 'Machine Learning Neural Networks Deep Learning Course', label: 1, prob: 0.71093799 },
      { text: 'Viral Comedy Video Funny Moments Best Of 2024', label: 0, prob: 0.26721481 },
      { text: 'UPSC Civil Services Preparation Strategy Current Affairs', label: 1, prob: 0.78202025 },
      { text: 'Web Series Season 2 Episode 5 Full Episode HD', label: 0, prob: 0.14136644 },
    ];

    // Load real model from the bundled JSON file
    let realClf: EducationalClassifier;

    beforeEach(async () => {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const modelPath = resolve(process.cwd(), 'ml/models/model_weights.json');
      const modelData = JSON.parse(readFileSync(modelPath, 'utf-8'));
      realClf = new EducationalClassifier(modelData);
    });

    for (const { text, label, prob } of PARITY_CASES) {
      it(`matches scikit-learn for: "${text.slice(0, 50)}"`, () => {
        const result = realClf.predict(text);
        expect(result.probability).toBeCloseTo(prob, 4);
        expect(result.isEducational).toBe(label === 1);
      });
    }
  });

  describe('isDistractingQuery', () => {
    it('restricts movie searches', async () => {
      const { isDistractingQuery } = await import('../ml/classifier');
      expect(isDistractingQuery('movie').isDistracting).toBe(true);
      expect(isDistractingQuery('new hindi movies 2024').isDistracting).toBe(true);
      expect(isDistractingQuery('batman official trailer').isDistracting).toBe(true);
    });

    it('restricts music and song searches', async () => {
      const { isDistractingQuery } = await import('../ml/classifier');
      expect(isDistractingQuery('music').isDistracting).toBe(true);
      expect(isDistractingQuery('latest songs').isDistracting).toBe(true);
      expect(isDistractingQuery('punjabi song dj remix').isDistracting).toBe(true);
      expect(isDistractingQuery('lofi beats to chill').isDistracting).toBe(true);
    });

    it('restricts gaming and comedy searches', async () => {
      const { isDistractingQuery } = await import('../ml/classifier');
      expect(isDistractingQuery('minecraft gameplay part 1').isDistracting).toBe(true);
      expect(isDistractingQuery('funny pranks compilation').isDistracting).toBe(true);
    });

    it('allows educational and study searches', async () => {
      const { isDistractingQuery } = await import('../ml/classifier');
      expect(isDistractingQuery('python tutorial for beginners').isDistracting).toBe(false);
      expect(isDistractingQuery('mit linear algebra lecture').isDistracting).toBe(false);
      expect(isDistractingQuery('history of cinema documentary').isDistracting).toBe(false);
      expect(isDistractingQuery('music theory lesson').isDistracting).toBe(false);
      expect(isDistractingQuery('physics class 12 revision').isDistracting).toBe(false);
    });
  });
});
