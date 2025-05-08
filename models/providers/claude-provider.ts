import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions } from '../types';

export class ClaudeProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'claude-3-7-sonnet') {
    super(apiKey, 'https://api.anthropic.com/v1', modelName);
  }

  async generateCompletion(prompt: string, options: RequestOptions = {}): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        '/messages',
        'POST',
        {
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokensToSample || 1024,
          temperature: options.temperature,
          top_p: options.topP,
          stop_sequences: options.stopSequences
        },
        {
          ...options,
          headers: {
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return {
        text: response.content[0].text,
        model: this.modelName,
        provider: 'anthropic',
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        metadata: {
          id: response.id
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error);
      }
      return this.createErrorResponse(new Error('An unknown error occurred'));
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Claude doesn't have a native embedding API, so we'll use a proxy service
    // In a production environment, you might use another service or implement a solution
    try {
      this.validatePrompt(text);

      const response = await this.makeRequest<any>(
        'https://api.embeddings-as-service.com/v1/embed',
        'POST',
        {
          text: text,
          model: 'claude-embedding'
        }
      );

      return response.embedding;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate embedding');
    }
  }

  calculateTokens(text: string): { input: number; output?: number } {
    // Simple approximation: ~4 chars per token for English text
    const approxTokens = Math.ceil(text.length / 4);
    return { input: approxTokens };
  }
}