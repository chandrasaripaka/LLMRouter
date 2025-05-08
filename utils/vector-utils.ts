// utils/vector-utils.ts

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  // services/task-classifier.ts
  
  import { TaskComplexity } from '../models/types';
  
  export class TaskClassifier {
    private complexityPatterns: Record<TaskComplexity, RegExp[]> = {
      [TaskComplexity.SIMPLE]: [
        /what is|who is|when|where|can you|could you/i,
        /hello|hi there|good morning|help me/i,
        /simple|basic|quick|short/i
      ],
      [TaskComplexity.MODERATE]: [
        /explain|describe|compare|contrast|summarize/i,
        /how to|how do I|steps to|process of/i,
        /analyze the|provide feedback|what are the implications/i
      ],
      [TaskComplexity.COMPLEX]: [
        /design a|create a comprehensive|develop a strategy/i,
        /ethical implications|philosophical|theoretical|conceptual/i,
        /critique|evaluate the merits|assess the validity/i,
        /research|investigate|deep dive/i,
        /complex|complicated|advanced|sophisticated/i
      ]
    };
  
    private taskLengthThresholds = {
      [TaskComplexity.SIMPLE]: 50,    // words
      [TaskComplexity.MODERATE]: 150  // anything above is COMPLEX
    };
  
    classifyTask(prompt: string): TaskComplexity {
      // Count words in the prompt
      const wordCount = prompt.split(/\s+/).length;
      
      // Check for complexity based on patterns
      for (const [complexity, patterns] of Object.entries(this.complexityPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(prompt)) {
            return complexity as TaskComplexity;
          }
        }
      }
      
      // If no patterns matched, classify based on length
      if (wordCount <= this.taskLengthThresholds[TaskComplexity.SIMPLE]) {
        return TaskComplexity.SIMPLE;
      } else if (wordCount <= this.taskLengthThresholds[TaskComplexity.MODERATE]) {
        return TaskComplexity.MODERATE;
      } else {
        return TaskComplexity.COMPLEX;
      }
    }
  }
  
  // services/llm-router.ts
  
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
  
  // config/model-configs.ts
  
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