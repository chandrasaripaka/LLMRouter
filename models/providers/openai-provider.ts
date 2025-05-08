import { LLMProvider } from './base-provider';
import { LLMResponse } from '../types';
import axios from 'axios';

export class OpenAIProvider extends LLMProvider {
  constructor(apiKey: string, modelName: string = 'gpt-4-turbo') {
    super(apiKey, 'https://api.openai.com/v1', modelName);
  }

  async generateCompletion(prompt: string, options: Record<string, any> = {}): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          ...options
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.choices[0].message.content,
        modelUsed: this.modelName,
        tokenUsage: {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens
        },
        metadata: {
          id: response.data.id,
          created: response.data.created,
          provider: 'openai'
        }
      };
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          model: 'text-embedding-3-small',
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      throw new Error(`OpenAI Embedding Error: ${error.message}`);
    }
  }

  calculateTokens(text: string): { input: number; output?: number } {
    // Simple approximation: ~4 chars per token
    const approxTokens = Math.ceil(text.length / 4);
    return { input: approxTokens };
  }
}