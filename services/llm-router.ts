// services/llm-router.ts

import { createHash } from 'crypto';
import { LLMProvider } from '../models/providers/base-provider';
import { OpenAIProvider } from '../models/providers/openai-provider';
import { ClaudeProvider } from '../models/providers/claude-provider';
import { GeminiProvider } from '../models/providers/gemini-provider';
import { CacheService } from './cache-service';
import { TaskClassifier } from './task-classifier';
import { ModelConfig, RequestOptions, TaskComplexity, LLMResponse, ModelCapabilities } from '../models/types';

export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private modelConfigs: ModelConfig[] = [];
  private cacheService: CacheService;
  private taskClassifier: TaskClassifier;
  private useSemantic: boolean;

  constructor(useSemantic: boolean = true) {
    this.cacheService = new CacheService();
    this.taskClassifier = new TaskClassifier();
    this.useSemantic = useSemantic;
  }

  registerProvider(provider: LLMProvider, modelConfig: ModelConfig): void {
    const key = `${modelConfig.provider}:${modelConfig.name}`;
    this.providers.set(key, provider);
    this.modelConfigs.push(modelConfig);
  }

  registerProviders(configs: Array<{ provider: LLMProvider; config: ModelConfig }>): void {
    for (const { provider, config } of configs) {
      this.registerProvider(provider, config);
    }
  }

  async processPrompt(prompt: string, options: RequestOptions = {}): Promise<LLMResponse> {
    const selectedModels = this.selectModels(prompt, options);
    
    if (selectedModels.length === 0) {
      throw new Error('No eligible models found for the given prompt and options');
    }
    
    for (const modelKey of selectedModels) {
      const provider = this.providers.get(modelKey);
      if (!provider) {
        console.warn(`Provider not found for model key: ${modelKey}`);
        continue;
      }

      try {
        return await provider.generateCompletion(prompt, options);
      } catch (error) {
        console.error(`Error with provider ${modelKey}:`, error);
        // Continue to next provider
      }
    }
    
    throw new Error('All models failed to generate a response');
  }

  private selectModels(prompt: string, options: RequestOptions): string[] {
    let eligibleModels = [...this.modelConfigs];
    
    // Apply provider/model filters
    if (options.preferredProvider) {
      eligibleModels = eligibleModels.filter(m => m.provider === options.preferredProvider);
    }
    
    if (options.preferredModel) {
      eligibleModels = eligibleModels.filter(m => m.name === options.preferredModel);
    }
    
    // Apply capability filters
    if (options.minCapability) {
      for (const [capability, minValue] of Object.entries(options.minCapability)) {
        eligibleModels = eligibleModels.filter(
          m => m.capabilities[capability as keyof ModelCapabilities] >= minValue
        );
      }
    }
    
    // Apply cost filter
    if (options.maxCost !== undefined) {
      eligibleModels = eligibleModels.filter(
        m => (m.costPerInputToken * 1000 + m.costPerOutputToken * 1000) <= options.maxCost!
      );
    }
    
    // If no models are eligible, return an empty array
    if (eligibleModels.length === 0) {
      return [];
    }
    
    // Sort models based on fallback strategy
    switch (options.fallbackStrategy) {
      case 'cost-ascending':
        return eligibleModels
          .sort((a, b) => 
            (a.costPerInputToken + a.costPerOutputToken) - 
            (b.costPerInputToken + b.costPerOutputToken)
          )
          .map(m => `${m.provider}:${m.name}`);
        
      case 'capability-descending':
        return eligibleModels
          .sort((a, b) => {
            const aScore = Object.values(a.capabilities).reduce((sum, val) => sum + val, 0);
            const bScore = Object.values(b.capabilities).reduce((sum, val) => sum + val, 0);
            return bScore - aScore;
          })
          .map(m => `${m.provider}:${m.name}`);
        
      case 'specific-models':
        if (!options.fallbackModels || options.fallbackModels.length === 0) {
          throw new Error('Fallback models must be specified when using specific-models strategy');
        }
        return options.fallbackModels;
        
      default:
        // Default strategy: balance capabilities and cost
        return eligibleModels
          .sort((a, b) => {
            const aScore = Object.values(a.capabilities).reduce((sum, val) => sum + val, 0) / 
              (a.costPerInputToken + a.costPerOutputToken);
            const bScore = Object.values(b.capabilities).reduce((sum, val) => sum + val, 0) /
              (b.costPerInputToken + b.costPerOutputToken);
            return bScore - aScore;
          })
          .map(m => `${m.provider}:${m.name}`);
    }
  }

  private getProviderByName(provider: string, model: string): LLMProvider | undefined {
    return this.providers.get(`${provider}:${model}`);
  }
}