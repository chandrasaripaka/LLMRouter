import { CacheEntry } from '../models/types';
import { cosineSimilarity } from '../utils/vector-utils';

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private semanticCache: CacheEntry[] = [];
  private readonly similarityThreshold: number;
  private readonly defaultExpiration: number; // in milliseconds

  constructor(similarityThreshold: number = 0.95, defaultExpiration: number = 24 * 60 * 60 * 1000) {
    this.similarityThreshold = similarityThreshold;
    this.defaultExpiration = defaultExpiration;
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanupExpiredEntries(), 60 * 60 * 1000); // Every hour
  }

  set(key: string, prompt: string, response: any, embedding?: number[], expirationMs?: number): void {
    const entry: CacheEntry = {
      prompt,
      response,
      embedding,
      timestamp: Date.now(),
      expiresAt: Date.now() + (expirationMs || this.defaultExpiration)
    };
    
    this.cache.set(key, entry);
    
    if (embedding) {
      this.semanticCache.push(entry);
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  findSemantically(embedding: number[], threshold?: number): any | null {
    const actualThreshold = threshold || this.similarityThreshold;
    
    let bestMatch: CacheEntry | null = null;
    let highestSimilarity = 0;
    
    for (const entry of this.semanticCache) {
      if (!entry.embedding || Date.now() > entry.expiresAt) continue;
      
      const similarity = cosineSimilarity(embedding, entry.embedding);
      if (similarity > actualThreshold && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = entry;
      }
    }
    
    return bestMatch ? bestMatch.response : null;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Clean regular cache
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    // Clean semantic cache
    this.semanticCache = this.semanticCache.filter(entry => now <= entry.expiresAt);
  }
}

