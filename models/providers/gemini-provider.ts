import { LLMProvider } from './base-provider';
import { LLMResponse, RequestOptions } from '../types';

export class GeminiProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    super(apiKey, 'https://generativelanguage.googleapis.com/v1', modelName);
  }

  async generateCompletion(prompt: string, options: RequestOptions = {}): Promise<LLMResponse> {
    try {
      this.validatePrompt(prompt);

      const response = await this.makeRequest<any>(
        `/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        'POST',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1024,
            temperature: options.temperature,
            topP: options.topP,
            candidateCount: options.candidateCount,
            safetySettings: options.safetySettings
          }
        },
        options
      );

      return {
        text: response.candidates[0].content.parts[0].text,
        model: this.modelName,
        provider: 'google',
        usage: {
          promptTokens: response.usage?.promptTokenCount || 0,
          completionTokens: response.usage?.candidatesTokenCount || 0,
          totalTokens: (response.usage?.promptTokenCount || 0) + (response.usage?.candidatesTokenCount || 0)
        },
        metadata: {
          id: response.candidates[0].citationMetadata?.citationSources?.[0]?.uri || ''
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
        `/models/${this.modelName}:embedContent?key=${this.apiKey}`,
        'POST',
        {
          content: { parts: [{ text }] }
        }
      );

      return response.embedding.values;
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