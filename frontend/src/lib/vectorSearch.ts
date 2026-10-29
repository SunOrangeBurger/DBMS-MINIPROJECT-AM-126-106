// Pure TypeScript TF-IDF and Cosine Similarity Engine
// Mirrors vector/semantic_search.py logic for real-time semantic issue matching

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 's', 'same', 'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would'
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export interface SemanticDocument {
  id: string | number;
  appointment_id: number;
  text: string;
  metadata: {
    appointment_id: number;
    registration_no: string;
    vehicle: string;
    status: string;
    complaint_notes?: string;
    diagnosis_notes?: string;
    parts_used?: string[];
    cost?: number;
  };
}

export interface SemanticSearchResult {
  document: SemanticDocument;
  distance: number;
  similarity: number;
}

export class SemanticSearchEngine {
  private documents: SemanticDocument[] = [];
  private vocabulary: Map<string, number> = new Map();
  private idf: number[] = [];
  private docVectors: number[][] = [];

  constructor(documents: SemanticDocument[] = []) {
    if (documents.length > 0) {
      this.fit(documents);
    }
  }

  public fit(documents: SemanticDocument[]) {
    this.documents = documents;
    this.vocabulary.clear();

    const tokenizedDocs: string[][] = [];
    const docFreq: Map<string, number> = new Map();

    for (const doc of documents) {
      const tokens = tokenize(doc.text);
      tokenizedDocs.push(tokens);
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, this.vocabulary.size);
        }
      }
    }

    const N = documents.length;
    const vocabSize = this.vocabulary.size;
    this.idf = new Array(vocabSize).fill(0);

    for (const [token, idx] of this.vocabulary.entries()) {
      const df = docFreq.get(token) || 0;
      // Smooth IDF formula matching scikit-learn
      this.idf[idx] = Math.log((1 + N) / (1 + df)) + 1.0;
    }

    this.docVectors = tokenizedDocs.map((tokens) => this.vectorizeTokens(tokens));
  }

  private vectorizeTokens(tokens: string[]): number[] {
    const vocabSize = this.vocabulary.size;
    const vec = new Array(vocabSize).fill(0);
    if (tokens.length === 0) return vec;

    const termCounts: Map<string, number> = new Map();
    for (const t of tokens) {
      termCounts.set(t, (termCounts.get(t) || 0) + 1);
    }

    for (const [token, count] of termCounts.entries()) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        // TF * IDF
        vec[idx] = (count / tokens.length) * this.idf[idx];
      }
    }

    // L2 normalize
    let sumSq = 0;
    for (let i = 0; i < vocabSize; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < vocabSize; i++) {
        vec[i] /= norm;
      }
    }
    return vec;
  }

  public query(queryText: string, topK: number = 3): SemanticSearchResult[] {
    if (!queryText || this.documents.length === 0) return [];
    const queryTokens = tokenize(queryText);
    const queryVec = this.vectorizeTokens(queryTokens);

    const results: SemanticSearchResult[] = [];

    for (let i = 0; i < this.documents.length; i++) {
      const docVec = this.docVectors[i];
      let dot = 0;
      for (let j = 0; j < queryVec.length; j++) {
        dot += queryVec[j] * docVec[j];
      }

      // Cosine distance = 1 - similarity
      const similarity = Math.max(0, Math.min(1, dot));
      const distance = 1.0 - similarity;

      results.push({
        document: this.documents[i],
        distance: Number(distance.toFixed(4)),
        similarity: Number(similarity.toFixed(4)),
      });
    }

    // Sort by lowest distance / highest similarity
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, topK);
  }
}
