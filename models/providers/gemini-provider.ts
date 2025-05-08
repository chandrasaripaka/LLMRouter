import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions, TokenCount } from '../types';

export class GeminiProvider extends LLMProvider {
  protected readonly baseUrl = 'https://generativelanguage.googleapis.com/v1';
  protected readonly defaultTimeout = 30000;

  constructor(apiKey: string) {
    super(apiKey, 'gemini-1.5-flash', 'https://generativelanguage.googleapis.com/v1');
  }

  async generateCompletion(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/models/${options?.model || this.modelName}:generateContent`,
        'POST',
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 1000,
            topP: options?.topP || 0.95,
            topK: options?.topK || 40
          }
        },
        options
      );

      return {
        text: response.candidates[0].content.parts[0].text,
        model: options?.model || this.modelName,
        provider: 'google',
        usage: {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount
        },
        metadata: {
          safetyRatings: response.candidates[0].safetyRatings
        }
      };
    } catch (error) {
      console.log('Error in Gemini completion:', error instanceof Error ? error.message : 'Unknown error');
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
        `${this.baseUrl}/models/embedding-001:embedContent`,
        'POST',
        {
          model: 'embedding-001',
          content: { parts: [{ text }] }
        }
      );

      return response.embedding.values;
    } catch (error) {
      console.log('Error in Gemini embedding:', error instanceof Error ? error.message : 'Unknown error');
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