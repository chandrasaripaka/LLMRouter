import { LLMResponse, RequestOptions } from '../types';

export abstract class LLMProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected modelName: string;
  protected defaultTimeout: number = 30000; // 30 seconds
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 second between requests
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 2000; // 2 seconds

  constructor(apiKey: string, baseUrl: string, modelName: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.modelName = modelName;
  }

  abstract generateCompletion(prompt: string, options?: RequestOptions): Promise<LLMResponse>;
  
  abstract generateEmbedding(text: string): Promise<number[]>;
  
  abstract calculateTokens(text: string): { input: number; output?: number };

  protected async makeRequest<T>(
    endpoint: string,
    method: string = 'POST',
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    let retries = 0;
    while (retries <= this.maxRetries) {
      try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
          await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs || this.defaultTimeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
          });

          this.lastRequestTime = Date.now();

          if (response.status === 429) { // Too Many Requests
            const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            retries++;
            continue;
          }

          if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
            throw new Error(`API request failed: ${error.message || response.statusText}`);
          }

          return await response.json();
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          if (retries < this.maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
            continue;
          }
          throw error;
        }
        throw new Error('An unknown error occurred');
      }
    }
    throw new Error(`Failed after ${this.maxRetries} retries`);
  }

  protected validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }
  }

  protected createErrorResponse(error: Error): LLMResponse {
    return {
      text: `Error: ${error.message}`,
      model: this.modelName,
      provider: this.constructor.name.toLowerCase().replace('provider', ''),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }
}