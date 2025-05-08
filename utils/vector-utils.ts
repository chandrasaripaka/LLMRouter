// utils/vector-utils.ts

import { TaskComplexity } from '../models/types';

export class VectorUtils {
  private static readonly VECTOR_SIZE = 1536; // OpenAI's embedding size

  static async generateEmbedding(text: string): Promise<number[]> {
    // Mock implementation - in reality, this would call an embedding API
    return Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());
  }

  static calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must be of the same length');
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }

  static async findSimilarPrompts(
    prompt: string,
    promptHistory: string[],
    threshold: number = 0.8
  ): Promise<string[]> {
    try {
      const promptEmbedding = await this.generateEmbedding(prompt);
      const similarities = await Promise.all(
        promptHistory.map(async (histPrompt) => {
          const histEmbedding = await this.generateEmbedding(histPrompt);
          return {
            prompt: histPrompt,
            similarity: this.calculateCosineSimilarity(promptEmbedding, histEmbedding)
          };
        })
      );

      return similarities
        .filter(({ similarity }) => similarity >= threshold)
        .map(({ prompt }) => prompt);
    } catch (error) {
      if (error instanceof Error) {
        console.warn('Error in semantic search:', error.message);
      } else {
        console.warn('Unknown error in semantic search');
      }
      return [];
    }
  }
}