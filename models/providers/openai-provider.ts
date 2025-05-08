import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions, TokenCount } from '../types';

export class OpenAIProvider extends LLMProvider {
  protected readonly baseUrl = 'https://api.openai.com/v1';
  protected readonly defaultTimeout = 30000;

  constructor(apiKey: string) {
    super(apiKey, 'gpt-3.5-turbo', 'https://api.openai.com/v1');
  }

  async generateCompletion(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/chat/completions`,
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
        text: response.choices[0].message.content,
        model: response.model,
        provider: 'openai',
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        },
        metadata: {
          finishReason: response.choices[0].finish_reason
        }
      };
    } catch (error) {
      console.log('Error in OpenAI completion:', error instanceof Error ? error.message : 'Unknown error');
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
          model: 'text-embedding-ada-002',
          input: text
        }
      );

      return response.data[0].embedding;
    } catch (error) {
      console.log('Error in OpenAI embedding:', error instanceof Error ? error.message : 'Unknown error');
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