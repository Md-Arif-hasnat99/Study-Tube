import defaultModelData from '../../public/model.json';

export interface ModelData {
  version: string;
  model_type: string;
  threshold: number;
  intercept: number;
  vocabulary: Record<string, number>;
  idf: number[];
  weights: number[];
}

export interface PredictionResult {
  isEducational: boolean;
  probability: number;
  confidence: number;
  reason?: string;
}

export class EducationalClassifier {
  private model: ModelData | null = null;
  private cache: Map<string, PredictionResult> = new Map();

  constructor(modelData?: ModelData) {
    if (modelData) {
      this.model = modelData;
    }
  }

  public async loadModel(): Promise<void> {
    if (this.model) return;

    try {
      const url = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL('model.json')
        : '/model.json';

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      this.model = await res.json();
    } catch (err) {
      console.warn('[StudyTube] Could not load model.json:', err);
    }
  }

  public setModel(model: ModelData) {
    this.model = model;
    this.cache.clear();
  }

  public isLoaded(): boolean {
    return this.model !== null;
  }

  private cleanText(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/https?:\/\/\S+|www\.\S+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public predict(title: string, description: string = ''): PredictionResult {
    const cacheKey = `${title}\0${description}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const rawInput = `${title} ${description}`.trim();

    if (!this.model) {
      // Fallback heuristic if model is not loaded yet
      const lower = rawInput.toLowerCase();
      const educationalKeywords = ['tutorial', 'lecture', 'course', 'class', 'learn', 'math', 'physics', 'programming', 'study'];
      const matches = educationalKeywords.filter(k => lower.includes(k));
      const fallbackResult: PredictionResult = {
        isEducational: matches.length > 0,
        probability: matches.length > 0 ? 0.75 : 0.25,
        confidence: 0.5,
      };
      this.cache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }

    const cleaned = this.cleanText(rawInput);
    const words = cleaned.split(' ').filter(w => w.length > 0);

    // Extract unigrams and bigrams
    const termCounts = new Map<string, number>();
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      termCounts.set(w, (termCounts.get(w) || 0) + 1);

      if (i < words.length - 1) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        termCounts.set(bigram, (termCounts.get(bigram) || 0) + 1);
      }
    }

    // Calculate sublinear TF-IDF and squared sum for L2 normalization
    const tfidfVec = new Map<number, number>();
    let sumSq = 0.0;

    for (const [term, count] of termCounts.entries()) {
      const idx = this.model.vocabulary[term];
      if (idx !== undefined) {
        const tf = 1.0 + Math.log(count);
        const val = tf * this.model.idf[idx];
        tfidfVec.set(idx, val);
        sumSq += val * val;
      }
    }

    const norm = sumSq > 0 ? Math.sqrt(sumSq) : 1.0;

    // Logistic regression dot product: z = intercept + sum(x_i * w_i)
    let z = this.model.intercept;
    for (const [idx, val] of tfidfVec.entries()) {
      const normalizedVal = val / norm;
      z += normalizedVal * this.model.weights[idx];
    }

    // Sigmoid probability
    const probability = 1.0 / (1.0 + Math.exp(-z));
    const isEducational = probability >= (this.model.threshold || 0.5);
    const confidence = Math.abs(probability - 0.5) * 2; // 0.0 to 1.0

    const result: PredictionResult = {
      isEducational,
      probability,
      confidence,
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    return result;
  }
}

// Export pre-initialized singleton with bundled production model weights
export const classifier = new EducationalClassifier(defaultModelData as unknown as ModelData);
