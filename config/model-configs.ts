import { ModelConfig } from '../models/types';

export const defaultModelConfigs: ModelConfig[] = [
  {
    provider: 'openai',
    name: 'gpt-3.5-turbo',
    capabilities: {
      speed: 9,
      knowledge: 7,
      reasoning: 7,
      creativity: 8
    },
    costPerInputToken: 0.000001,
    costPerOutputToken: 0.000002,
    maxContextTokens: 16384
  },
  {
    provider: 'anthropic',
    name: 'claude-3-7-sonnet',
    capabilities: {
      speed: 8,
      knowledge: 8,
      reasoning: 8,
      creativity: 8
    },
    costPerInputToken: 0.000005,
    costPerOutputToken: 0.000015,
    maxContextTokens: 200000
  },
  {
    provider: 'google',
    name: 'gemini-1.5-flash',
    capabilities: {
      speed: 10,
      knowledge: 7,
      reasoning: 7,
      creativity: 7
    },
    costPerInputToken: 0.000001,
    costPerOutputToken: 0.000002,
    maxContextTokens: 128000
  }
];