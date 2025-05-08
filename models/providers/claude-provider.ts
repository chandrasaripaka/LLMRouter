import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions, TokenCount } from '../types';

export class ClaudeProvider extends LLMProvider {
  protected readonly baseUrl = 'https://api.anthropic.com/v1';
  protected readonly defaultTimeout = 30000;

  constructor(apiKey: string) {
    super(apiKey, 'claude-3-7-sonnet', 'https://api.anthropic.com/v1');
  }

  async generateCompletion(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/messages`,
        'POST',
        {
          model: options?.model || this.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
          stream: false
        },
        options
      );

      return {
        text: response.content[0].text,
        model: response.model,
        provider: 'anthropic',
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        metadata: {
          stopReason: response.stop_reason
        }
      };
    } catch (error) {
      console.log('Error in Claude completion:', error instanceof Error ? error.message : 'Unknown error');
      return this.createResponse(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        { error: true }
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.validateText(text);

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/embeddings`,
        'POST',
        {
          model: 'claude-3-sonnet-20240229',
          input: text
        }
      );

      return response.embedding;
    } catch (error) {
      console.log('Error in Claude embedding:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  calculateTokens(text: string): TokenCount {
    // Simple approximation: 1 token ≈ 4 characters for English text
    console.log('Calculating tokens using character approximation');
    const approxTokens = Math.ceil(text.length / 4);
    return { input: approxTokens };
  }
}