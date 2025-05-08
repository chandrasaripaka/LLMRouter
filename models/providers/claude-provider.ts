import { LLMProvider } from './base-provider';
import { LLMResponse } from '../types';
import axios from 'axios';

export class ClaudeProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'claude-3-7-sonnet') {
    super(apiKey, 'https://api.anthropic.com/v1', modelName);
  }

  async generateCompletion(prompt: string, options: Record<string, any> = {}): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.max_tokens || 1024,
          ...options
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.content[0].text,
        modelUsed: this.modelName,
        tokenUsage: {
          input: response.data.usage.input_tokens,
          output: response.data.usage.output_tokens,
          total: response.data.usage.input_tokens + response.data.usage.output_tokens
        },
        metadata: {
          id: response.data.id,
          provider: 'anthropic'
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API Error: ${error.message}`);
      }
      throw new Error('Claude API Error: An unknown error occurred');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Claude doesn't have a native embedding API, so we'll use a proxy service
    // In a production environment, you might use another service or implement a solution
    try {
      const response = await axios.post(
        'https://api.embeddings-as-service.com/v1/embed',
        {
          text: text,
          model: 'claude-embedding'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.embedding;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude Embedding Error: ${error.message}`);
      }
      throw new Error('Claude Embedding Error: An unknown error occurred');
    }
  }

  calculateTokens(text: string): { input: number; output?: number } {
    // Simple approximation: ~4 chars per token
    const approxTokens = Math.ceil(text.length / 4);
    return { input: approxTokens };
  }
}