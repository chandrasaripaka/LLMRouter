// Dynamic LLM Router - A system to efficiently switch between different LLM providers
// models/types.ts

// Define the common response structure from any LLM provider
export interface LLMResponse {
    text: string;
    model: string;
    provider: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    metadata?: Record<string, any>;
  }
  
  // Define the complexity level of a prompt
  export enum TaskComplexity {
    SIMPLE = 'SIMPLE',
    MODERATE = 'MODERATE',
    COMPLEX = 'COMPLEX'
  }
  
  // Define the configuration for each model
  export interface ModelConfig {
    name: string;
    provider: string;
    capabilities: ModelCapabilities;
    costPerInputToken: number;
    costPerOutputToken: number;
    maxContextTokens: number;
  }
  
  // Define the request options
  export interface RequestOptions {
    model?: string;
    preferredModel?: string;
    preferredProvider?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
    maxCost?: number;
    minCapability?: Partial<ModelCapabilities>;
    fallbackStrategy?: 'cost-ascending' | 'capability-descending' | 'specific-models';
    fallbackModels?: string[];
  }
  
  // Cache interface
  export interface CacheEntry {
    prompt: string;
    embedding?: number[];
    response: LLMResponse;
    timestamp: number;
    expiresAt: number;
  }

  export interface ModelCapabilities {
    speed: number;
    knowledge: number;
    reasoning: number;
    creativity: number;
  }

  export interface TokenCount {
    input: number;
    output?: number;
  }