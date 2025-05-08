# Dynamic LLM Router

A TypeScript system for efficiently managing API calls to multiple Large Language Models (LLMs) with intelligent routing, fallback mechanisms, and caching strategies.

## Features

- **Smart Routing**: Intelligently routes requests to the most appropriate LLM based on task complexity, cost, and performance requirements
- **Multi-Provider Support**: Built-in support for OpenAI, Anthropic (Claude), and Google (Gemini) with an extensible architecture
- **Dynamic Fallback**: Configurable fallback mechanisms when a provider is unavailable or returns an error
- **Semantic Caching**: Reduces redundant API calls by caching responses and identifying semantically similar queries
- **Cost Optimization**: Implements the FrugalGPT approach to minimize costs without compromising quality
- **Task Complexity Analysis**: Automatically categorizes queries by complexity to route them appropriately

##  Installation

```bash
# Clone the repository
git clone https://github.com/chandrasaripaka/LLMRouter.git
cd llm-router

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

##  Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
```

## Usage

### Basic Usage

```typescript
import { LLMRouter } from './services/llm-router';
import { OpenAIProvider } from './models/providers/openai-provider';
import { ClaudeProvider } from './models/providers/claude-provider';
import { defaultModelConfigs } from './config/model-configs';

async function example() {
  // Initialize router
  const router = new LLMRouter();
  
  // Set up providers
  const openai = new OpenAIProvider(process.env.OPENAI_API_KEY!);
  const claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
  
  // Register models
  router.registerProviders([
    { provider: openai, config: defaultModelConfigs.find(m => m.name === 'gpt-4-turbo')! },
    { provider: claude, config: defaultModelConfigs.find(m => m.name === 'claude-3-7-sonnet')! }
  ]);
  
  // Process a prompt
  const result = await router.processPrompt("Explain quantum computing in simple terms");
  console.log(`Model used: ${result.modelUsed}`);
  console.log(result.content);
}
```

### Advanced Usage with Options

```typescript
const options = {
  preferredProvider: 'anthropic',
  minCapability: { reasoning: 9 },
  fallbackStrategy: 'capability-descending',
  cacheResults: true
};

const response = await router.processPrompt(
  "Analyze the implications of quantum computing on cryptography",
  options
);
```

### Cost-Optimized Routing

```typescript
const costOptions = {
  fallbackStrategy: 'cost-ascending',
  maxCost: 0.0001, // Maximum cost per 1000 tokens
  cacheResults: true
};

const response = await router.processPrompt(
  "What is the capital of France?",
  costOptions
);
```

## Routing Strategies

The system supports several routing strategies:

1. **Default**: Routes based on task complexity
   - Simple tasks → Faster, cheaper models
   - Complex tasks → More capable models

2. **Cost-Ascending**: Starts with cheapest models and escalates as needed

3. **Capability-Descending**: Starts with most capable models for the specific task type

4. **Specific-Models**: Uses a specified ordered list of models to try

## Architecture

```
├── models/
│   ├── types.ts              # Type definitions
│   └── providers/
│       ├── base-provider.ts  # Abstract base provider class
│       ├── openai-provider.ts
│       ├── claude-provider.ts
│       └── gemini-provider.ts
├── services/
│   ├── llm-router.ts         # Main routing logic
│   ├── cache-service.ts      # Caching implementation
│   └── task-classifier.ts    # Task complexity analyzer
├── config/
│   └── model-configs.ts      # Model configurations
└── utils/
    └── vector-utils.ts       # Utility functions for embeddings
```

## Example Use Cases

- **Cost Optimization**: Implement in cost-sensitive applications to minimize API expenses
- **High Reliability**: Ensure availability through automatic fallbacks when providers fail
- **Hybrid Performance**: Get the best of all models by routing to their strengths
- **API Abstraction**: Provide a unified interface for multiple LLM providers

## Adding Custom Providers

Extend the system with your own providers by:

1. Creating a new provider class that extends `LLMProvider`
2. Implementing the required methods (`generateCompletion`, `generateEmbedding`, `calculateTokens`)
3. Registering your provider and its configuration with the router

## License

MIT License

## Acknowledgements

This implementation is inspired by research and approaches including:
- FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance
- Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing
- GPT Semantic Cache: Reducing LLM Costs and Latency via Semantic Embedding Caching
