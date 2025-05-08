// Dynamic LLM Router - A system to efficiently switch between different LLM providers

// Define the common response structure from any LLM provider
export interface LLMResponse {
    content: string;
    modelUsed: string;
    tokenUsage: {
      input: number;
      output: number;
      total: number;
    };
    metadata?: Record<string, any>;
  }
  
  // Define the complexity level of a prompt
  export enum TaskComplexity {
    SIMPLE = 'simple',
    MODERATE = 'moderate',
    COMPLEX = 'complex'
  }
  
  // Define the configuration for each model
  export interface ModelConfig {
    name: string;
    provider: string;
    costPerInputToken: number;
    costPerOutputToken: number;
    capabilities: {
      reasoning: number;     // 0-10 rating
      creativity: number;    // 0-10 rating
      knowledge: number;     // 0-10 rating
      speed: number;         // 0-10 rating (higher is faster)
    };
    apiConfig: Record<string, any>;
  }
  
  // Define the request options
  export interface RequestOptions {
    preferredModel?: string;
    preferredProvider?: string;
    maxCost?: number;
    minCapability?: Record<string, number>;
    timeoutMs?: number;
    fallbackStrategy?: 'cost-ascending' | 'capability-descending' | 'specific-models';
    fallbackModels?: string[];
    cacheResults?: boolean;
  }
  
  // Cache interface
  export interface CacheEntry {
    prompt: string;
    embedding?: number[];
    response: LLMResponse;
    timestamp: number;
    expiresAt: number;
  }
