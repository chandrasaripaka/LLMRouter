import { LLMResponse } from '../models/types';

export function createErrorResponse(provider: string, model: string, error: unknown): LLMResponse {
  return {
    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    model,
    provider,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    metadata: {
      error: true
    }
  };
} 