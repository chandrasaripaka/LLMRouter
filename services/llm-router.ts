import { createHash } from 'crypto';
import { LLMProvider } from '../models/providers/base-provider';
import { OpenAIProvider } from '../models/providers/openai-provider';
import { ClaudeProvider } from '../models/providers/claude-provider';
import { GeminiProvider } from '../models/providers/gemini-provider';
import { CacheService } from './cache-service';
import { TaskClassifier } from './task-classifier';
import { ModelConfig, RequestOptions, TaskComplexity, LLMResponse } from '../models/types';

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

  async processPrompt(
    prompt: string,
    options: RequestOptions = {}
  ): Promise<LLMResponse> {
    const cacheKey = this.generateCacheKey(prompt);
    
    // Check exact cache first
    if (options.cacheResults !== false) {
      const cachedResponse = this.cacheService.get(cacheKey);
      if (cachedResponse) {
        console.log('Cache hit: Exact match found');
        return cachedResponse;
      }

      // Check semantic cache if enabled
      if (this.useSemantic) {
        // Get embedding for semantic search
        try {
          const primaryProvider = this.getProviderByName(
            options.preferredProvider || 'openai',
            options.preferredModel || 'text-embedding-3-small'
          );
          
          if (primaryProvider) {
            const embedding = await primaryProvider.generateEmbedding(prompt);
            const semanticResponse = this.cacheService.findSemantically(embedding);
            
            if (semanticResponse) {
              console.log('Cache hit: Semantic match found');
              return semanticResponse;
            }
          }
        } catch (error) {
          console.warn('Error in semantic search:', error.message);
          // Continue without semantic search if it fails
        }
      }
    }

    // Determine task complexity
    const complexity = this.taskClassifier.classifyTask(prompt);
    
    // Select appropriate model based on task complexity and options
    const selectedModels = this.selectModels(complexity, options);
    
    // Try models in order with fallback
    for (const modelKey of selectedModels) {
      const [provider, modelName] = modelKey.split(':');
      const modelProvider = this.getProviderByName(provider, modelName);
      
      if (!modelProvider) {
        console.warn(`Provider not found: ${modelKey}`);
        continue;
      }
      
      try {
        console.log(`Attempting request with model: ${modelKey}`);
        const response = await modelProvider.generateCompletion(prompt);
        
        // Cache the result if caching is enabled
        if (options.cacheResults !== false) {
          // Get embedding for caching if semantic caching is enabled
          let embedding = undefined;
          if (this.useSemantic) {
            try {
              embedding = await modelProvider.generateEmbedding(prompt);
            } catch (error) {
              console.warn('Failed to generate embedding for caching:', error.message);
            }
          }
          
          this.cacheService.set(cacheKey, prompt, response, embedding);
        }
        
        return response;
      } catch (error) {
        console.error(`Error with provider ${modelKey}:`, error.message);
        // Continue to next fallback model
      }
    }
    
    throw new Error('All models failed to generate a response');
  }

  private generateCacheKey(prompt: string): string {
    return createHash('md5').update(prompt).digest('hex');
  }

  private selectModels(complexity: TaskComplexity, options: RequestOptions): string[] {
    // Filter models based on constraints
    let eligibleModels = [...this.modelConfigs];
    
    // Apply preferred provider/model filter if specified
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
          m => m.capabilities[capability] >= minValue
        );
      }
    }
    
    // Apply cost filter
    if (options.maxCost) {
      // Simple cost estimate for 1000 tokens input/output
      eligibleModels = eligibleModels.filter(
        m => (m.costPerInputToken * 1000 + m.costPerOutputToken * 1000) <= options.maxCost
      );
    }
    
    // Sort models based on complexity and fallback strategy
    let orderedModels: ModelConfig[];
    
    switch (options.fallbackStrategy) {
      case 'cost-ascending':
        // Start with cheapest models
        orderedModels = eligibleModels.sort(
          (a, b) => 
            (a.costPerInputToken + a.costPerOutputToken) - 
            (b.costPerInputToken + b.costPerOutputToken)
        );
        break;
        
      case 'capability-descending':
        // Start with most capable models for the task
        let capabilityKey: keyof typeof TaskComplexity;
        switch (complexity) {
          case TaskComplexity.SIMPLE:
            capabilityKey = 'speed';
            break;
          case TaskComplexity.MODERATE:
            capabilityKey = 'knowledge';
            break;
          case TaskComplexity.COMPLEX:
            capabilityKey = 'reasoning';
            break;
          default:
            capabilityKey = 'reasoning';
        }
        
        orderedModels = eligibleModels.sort(
          (a, b) => b.capabilities[capabilityKey] - a.capabilities[capabilityKey]
        );
        break;
        
      case 'specific-models':
        // Use exactly the fallback models specified
        if (!options.fallbackModels || options.fallbackModels.length === 0) {
          throw new Error('Fallback models must be specified when using specific-models strategy');
        }
        
        // Filter and order models according to the fallback list
        orderedModels = [];
        for (const modelKey of options.fallbackModels) {
          const [provider, name] = modelKey.split(':');
          const model = eligibleModels.find(m => m.provider === provider && m.name === name);
          if (model) {
            orderedModels.push(model);
          }
        }
        break;
        
      default:
        // Default strategy: optimize for complexity
        switch (complexity) {
          case TaskComplexity.SIMPLE:
            // For simple tasks, prioritize speed and low cost
            orderedModels = eligibleModels.sort(
              (a, b) => 
                (b.capabilities.speed * 2 - (a.costPerInputToken + a.costPerOutputToken)) - 
                (a.capabilities.speed * 2 - (b.costPerInputToken + b.costPerOutputToken))
            );
            break;
            
          case TaskComplexity.MODERATE:
            // For moderate tasks, balance capabilities and cost
            orderedModels = eligibleModels.sort(
              (a, b) => 
                ((a.capabilities.knowledge + a.capabilities.reasoning) / 2) - 
                ((b.capabilities.knowledge + b.capabilities.reasoning) / 2)
            );
            break;
            
          case TaskComplexity.COMPLEX:
            // For complex tasks, prioritize reasoning capability
            orderedModels = eligibleModels.sort(
              (a, b) => b.capabilities.reasoning - a.capabilities.reasoning
            );
            break;
            
          default:
            orderedModels = eligibleModels;
        }
    }
    
    // Convert to provider:model format
    return orderedModels.map(m => `${m.provider}:${m.name}`);
  }

  private getProviderByName(provider: string, model: string): LLMProvider | undefined {
    return this.providers.get(`${provider}:${model}`);
  }
}
