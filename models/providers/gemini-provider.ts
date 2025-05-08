
import { LLMProvider } from './base-provider';
import { LLMResponse } from '../types';
import axios from 'axios';

export class GeminiProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'gemini-1.5-pro') {
    super(apiKey, 'https://generativelanguage.googleapis.com/v1beta', modelName);
  }

  async generateCompletion(prompt: string, options: Record<string, any> = {}): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.max_tokens || 1024,
            temperature: options.temperature || 0.7,
            ...options
          }
        }
      );

      return {
        content: response.data.candidates[0].content.parts[0].text,
        modelUsed: this.modelName,
        tokenUsage: {
          input: response.data.usageMetadata?.promptTokenCount || 0,
          output: response.data.usageMetadata?.candidatesTokenCount || 0,
          total: (response.data.usageMetadata?.promptTokenCount || 0) + 
                 (response.data.usageMetadata?.candidatesTokenCount || 0)
        },
        metadata: {
          provider: 'google'
        }
      };
    } catch (error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/embedding-001:embedContent?key=${this.apiKey}`,
        {
          content: { parts: [{ text: text }] }
        }
      );

      return response.data.embedding.values;
    } catch (error) {
      throw new Error(`Gemini Embedding Error: ${error.message}`);
    }
  }

  calculateTokens(text: string): { input: number; output?: number } {
    // Simple approximation: ~4 chars per token
    const approxTokens = Math.ceil(text.length / 4);
    return { input: approxTokens };
  }
}