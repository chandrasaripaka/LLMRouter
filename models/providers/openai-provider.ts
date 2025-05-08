import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions } from '../types';

export class OpenAIProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'gpt-3.5-turbo') {
    super(apiKey, 'https://api.openai.com/v1', modelName);
  }

  async generateCompletion(prompt: string, options: RequestOptions = {}): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        '/chat/completions',
        'POST',
        {
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty
        },
        options
      );

      return {
        text: response.choices[0].message.content,
        model: this.modelName,
        provider: 'openai',
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        metadata: {
          id: response.id,
          created: response.created
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
    try {
      this.validatePrompt(text);

      const response = await this.makeRequest<any>(
        '/embeddings',
        'POST',
        {
          model: 'text-embedding-3-small',
          input: text
        }
      );

      return response.data[0].embedding;
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