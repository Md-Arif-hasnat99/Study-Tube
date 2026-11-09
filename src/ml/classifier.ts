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

export function isDistractingQuery(query: string): { isDistracting: boolean; reason?: string } {
  if (!query) return { isDistracting: false };
  const lower = query.toLowerCase().trim();

  // Strong educational indicators: do not restrict if user is explicitly studying
  const educationalPattern = /\b(tutorial|course|lecture|learn|study|lesson|class|exam|revision|history of|science of|film analysis|cinema study|music theory|explained|documentary|how to code|how to program|math|physics|chemistry|biology|programming|computer science|algorithm|datastructure)\b/i;
  if (educationalPattern.test(lower)) {
    return { isDistracting: false };
  }

  // Strong entertainment & distraction patterns
  const entertainmentRules: Array<{ pattern: RegExp; reason: string }> = [
    {
      pattern: /\b(movie|movies|film|cinema|trailer|teaser|full movie|box office|hollywood|bollywood|tollywood|hindi dubbed|action scene|action movie|horror movie|comedy movie)\b/i,
      reason: 'Movies & Film Entertainment',
    },
    {
      pattern: /\b(song|songs|music|lyrics|audio|remix|dj|album|soundtrack|vevo|lofi beats|party song|dance song|punjabi song|hindi song|pop music|rap|hip hop|sing along|karaoke)\b/i,
      reason: 'Music & Songs',
    },
    {
      pattern: /\b(gameplay|gaming|walkthrough part|lets play|stream highlights|fortnite|minecraft|gta|roblox|valorant|pubg|free fire|bgmi)\b/i,
      reason: 'Gaming & Gameplay Streams',
    },
    {
      pattern: /\b(prank|pranks|funny moments|meme|memes|vlog|daily vlog|roast|standup comedy|comedy show|celebrity gossip|drama|tiktok compilation)\b/i,
      reason: 'Comedy, Vlogs & Viral Content',
    },
    {
      pattern: /\b(web series|season \d+|episode \d+|ep \d+|kdrama|k-drama|anime fight|soap opera)\b/i,
      reason: 'TV Shows & Web Series',
    },
  ];

  for (const rule of entertainmentRules) {
    if (rule.pattern.test(lower)) {
      return { isDistracting: true, reason: rule.reason };
    }
  }

  // Check with ML model
  const mlResult = classifier.predict(lower);
  if (!mlResult.isEducational && mlResult.probability < 0.35) {
    return { isDistracting: true, reason: 'Non-study content detected by StudyTube ML' };
  }

  return { isDistracting: false };
}
