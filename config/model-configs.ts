import { ModelConfig } from '../models/types';

export const defaultModelConfigs: ModelConfig[] = [
  {
    name: 'gpt-4-turbo',
    provider: 'openai',
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00003,
    capabilities: {
      reasoning: 9,
      creativity: 8,
      knowledge: 9,
      speed: 6
    },
    apiConfig: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  {
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
    capabilities: {
      reasoning: 7,
      creativity: 7,
      knowledge: 7,
      speed: 9
    },
    apiConfig: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  {
    name: 'claude-3-7-sonnet',
    provider: 'anthropic',
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.0000075,
    capabilities: {
      reasoning: 9,
      creativity: 8,
      knowledge: 9,
      speed: 7
    },
    apiConfig: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  {
    name: 'claude-3-opus',
    provider: 'anthropic',
    costPerInputToken: 0.000015,
    costPerOutputToken: 0.000075,
    capabilities: {
      reasoning: 10,
      creativity: 9,
      knowledge: 10,
      speed: 5
    },
    apiConfig: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  {
    name: 'gemini-1.5-pro',
    provider: 'google',
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000006,
    capabilities: {
      reasoning: 8,
      creativity: 8,
      knowledge: 9,
      speed: 7
    },
    apiConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  },
  {
    name: 'gemini-1.5-flash',
    provider: 'google',
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
    capabilities: {
      reasoning: 7,
      creativity: 7,
      knowledge: 8,
      speed: 9
    },
    apiConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  }
];