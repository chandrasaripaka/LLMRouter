import { LLMResponse } from '../types';

export abstract class LLMProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected modelName: string;

  constructor(apiKey: string, baseUrl: string, modelName: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.modelName = modelName;
  }

  abstract async generateCompletion(prompt: string, options?: Record<string, any>): Promise<LLMResponse>;
  
  abstract async generateEmbedding(text: string): Promise<number[]>;
  
  abstract calculateTokens(text: string): { input: number; output?: number };
}