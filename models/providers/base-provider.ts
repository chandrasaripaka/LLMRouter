import { LLMResponse, RequestOptions, TokenCount } from '../types';

export abstract class LLMProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected modelName: string;
  protected defaultTimeout: number = 30000; // 30 seconds
  protected lastRequestTime: number = 0;
  protected readonly minRequestInterval: number = 1000; // 1 second between requests
  protected readonly maxRetries: number = 3;
  protected readonly retryDelay: number = 2000; // 2 seconds

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
  
  abstract calculateTokens(text: string): TokenCount;

  protected async makeRequest<T>(
    endpoint: string,
    method: string = 'POST',
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.maxRetries) {
      try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
          console.log(`Rate limiting: waiting ${this.minRequestInterval - timeSinceLastRequest}ms`);
          await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || this.defaultTimeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(options?.headers || {})
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || response.statusText;
          
          if (response.status === 429 && retryCount < this.maxRetries) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '0');
            const delay = retryAfter * 1000 || this.retryDelay * Math.pow(2, retryCount);
            console.log(`Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
          
          throw new Error(`API request failed: ${errorMessage}`);
        }

        this.lastRequestTime = Date.now();
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request timed out');
          throw new Error('Request timed out');
        }
        
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(`Request failed. Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
        } else {
          console.log('Max retries reached');
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  protected validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') {
      console.log('Invalid prompt: must be a non-empty string');
      throw new Error('Invalid prompt: must be a non-empty string');
    }
  }

  protected validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      console.log('Invalid text: must be a non-empty string');
      throw new Error('Invalid text: must be a non-empty string');
    }
  }

  protected createResponse(
    text: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    metadata?: Record<string, any>
  ): LLMResponse {
    return {
      text,
      model: this.modelName,
      provider: this.constructor.name.replace('Provider', '').toLowerCase(),
      usage,
      metadata
    };
  }
}