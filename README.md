# Dynamic LLM Router

A system for efficiently managing API calls to multiple Large Language Models (LLMs) with intelligent routing, fallback mechanisms, and caching strategies.

## Features

- **Smart Routing**: Intelligently routes requests to the most appropriate LLM based on task complexity, cost, and performance requirements
- **Multi-Provider Support**: Built-in support for OpenAI (GPT-3.5), Anthropic (Claude Sonnet), and Google (Gemini Flash)
- **Dynamic Fallback**: Configurable fallback mechanisms when a provider is unavailable or returns an error
- **Semantic Caching**: Reduces redundant API calls by caching responses and identifying semantically similar queries
- **Cost Optimization**: Implements cost-aware routing to minimize API expenses
- **Task Complexity Analysis**: Automatically categorizes queries by complexity to route them appropriately
- **Rate Limiting**: Built-in rate limiting and retry logic to handle API throttling

## Installation

```bash
# Clone the repository
git clone https://github.com/chandrasaripaka/LLMRouter.git
cd LLMRouter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

#Also if you feel like just running it after putting the keys below, there is a index.ts,
which mimicks asking questions.,
npm install
npm start
```

## Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
PORT=3000
```

## Usage

### Basic Usage

```typescript
import { LLMRouter } from './services/llm-router';
import { OpenAIProvider } from './models/providers/openai-provider';
import { ClaudeProvider } from './models/providers/claude-provider';
import { GeminiProvider } from './models/providers/gemini-provider';
import { defaultModelConfigs } from './config/model-configs';

async function example() {
  // Initialize router
  const router = new LLMRouter();
  
  // Set up providers (only if API keys are available)
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAIProvider(process.env.OPENAI_API_KEY);
    router.registerProviders([
      { provider: openai, config: defaultModelConfigs.find(m => m.name === 'gpt-3.5-turbo')! }
    ]);
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    const claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY);
    router.registerProviders([
      { provider: claude, config: defaultModelConfigs.find(m => m.name === 'claude-3-7-sonnet')! }
    ]);
  }
  
  if (process.env.GOOGLE_API_KEY) {
    const gemini = new GeminiProvider(process.env.GOOGLE_API_KEY);
    router.registerProviders([
      { provider: gemini, config: defaultModelConfigs.find(m => m.name === 'gemini-1.5-flash')! }
    ]);
  }
  
  // Process a prompt
  const result = await router.processPrompt("Explain quantum computing in simple terms");
  console.log(`Model used: ${result.model}`);
  console.log(result.text);
}
```

### Advanced Usage with Options

```typescript
const options = {
  preferredProvider: 'anthropic',
  minCapability: { reasoning: 8 },
  fallbackStrategy: 'capability-descending',
  cacheResults: true,
  timeoutMs: 30000 // 30 seconds timeout
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

## Available Models

The system currently supports these models:

1. **OpenAI**
   - GPT-3.5 Turbo (default)

2. **Anthropic**
   - Claude 3.7 Sonnet (default)

3. **Google**
   - Gemini 1.5 Flash (default)

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
│       ├── base-provider.ts  # Abstract base provider class with rate limiting
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

## Features in Detail

### Rate Limiting and Retries
- Automatic rate limiting (1 request per second minimum)
- Exponential backoff retry logic (up to 3 retries)
- Respects API-provided retry-after headers
- Configurable timeouts and retry delays

### Task Classification
- Pattern-based complexity detection
- Length-based fallback classification
- Support for simple, moderate, and complex tasks

### Caching
- Exact match caching
- Semantic similarity caching
- Configurable TTL (Time To Live)
- Automatic cache cleanup

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
