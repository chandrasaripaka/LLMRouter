// services/cache-service.ts

import { LLMResponse } from '../models/types';

interface CacheEntry {
  prompt: string;
  response: LLMResponse;
  embedding?: number[];
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private semanticCache: Array<{ embedding: number[]; response: LLMResponse; timestamp: number; expiresAt: number }> = [];
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }

  get(key: string): LLMResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.response;
  }

  set(key: string, prompt: string, response: LLMResponse, embedding?: number[], ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, { 
      prompt, 
      response, 
      embedding,
      timestamp: now,
      expiresAt
    });

    if (embedding) {
      this.semanticCache.push({ 
        embedding, 
        response,
        timestamp: now,
        expiresAt
      });
    }
  }

  findSemantically(embedding: number[]): LLMResponse | undefined {
    // Clear expired entries first
    this.clearExpiredEntries();

    // Simple implementation - in reality, you'd want to use a proper vector database
    const threshold = 0.8;
    for (const entry of this.semanticCache) {
      const similarity = this.calculateCosineSimilarity(embedding, entry.embedding);
      if (similarity >= threshold) {
        return entry.response;
      }
    }
    return undefined;
  }

  clearExpiredEntries(): void {
    const now = Date.now();

    // Clear expired entries from regular cache
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    // Clear expired entries from semantic cache
    this.semanticCache = this.semanticCache.filter(entry => now <= entry.expiresAt);
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must be of the same length');
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }
}

