// Dynamic LLM Router - A system to efficiently switch between different LLM providers
// models/types.ts

// Define the common response structure from any LLM provider
export interface LLMResponse {
    text: string;
    model: string;
    provider: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    metadata?: {
      id?: string;
      provider?: string;
      created?: number;
      [key: string]: any; // Allow additional metadata fields
    };
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
  }
  
  // Define the request options
  export interface RequestOptions {
    preferredProvider?: string;
    preferredModel?: string;
    minCapability?: Partial<ModelCapabilities>;
    maxCost?: number;
    fallbackStrategy?: 'cost-ascending' | 'capability-descending' | 'specific-models';
    fallbackModels?: string[];
    timeoutMs?: number;
    cacheResults?: boolean;
    headers?: Record<string, string>;
    // OpenAI specific options
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    // Claude specific options
    maxTokensToSample?: number;
    stopSequences?: string[];
    // Gemini specific options
    candidateCount?: number;
    safetySettings?: Array<{
      category: string;
      threshold: string;
    }>;
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

  export interface TokenUsage {
    input: number;
    output: number;
    total: number;
  }