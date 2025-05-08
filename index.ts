// index.ts - Usage example
  
import { LLMRouter } from './services/llm-router';
import { OpenAIProvider } from './models/providers/openai-provider';
import { ClaudeProvider } from './models/providers/claude-provider';
import { GeminiProvider } from './models/providers/gemini-provider';
import { defaultModelConfigs } from './config/model-configs';
import { RequestOptions, TaskComplexity } from './models/types';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize router
  const router = new LLMRouter();

  // Initialize providers with API keys and register them if keys are present
  const openaiKey = process.env.OPENAI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  if (openaiKey) {
    const openaiProvider = new OpenAIProvider(openaiKey);
    router.registerProviders([
      { provider: openaiProvider, config: defaultModelConfigs[0] }  // GPT-3.5
    ]);
  }

  if (claudeKey) {
    const claudeProvider = new ClaudeProvider(claudeKey);
    router.registerProviders([
      { provider: claudeProvider, config: defaultModelConfigs[1] }  // Claude Sonnet
    ]);
  }

  if (geminiKey) {
    const geminiProvider = new GeminiProvider(geminiKey);
    router.registerProviders([
      { provider: geminiProvider, config: defaultModelConfigs[2] }  // Gemini Flash
    ]);
  }

  // Test 1: Simple task with default settings
  console.log("\nTest 1: Simple task with default settings");
  const response1 = await router.processPrompt("What is the capital of France?");
  console.log("Response:", response1.text);
  console.log("Model used:", response1.model);
  console.log("Token usage:", response1.usage);

  // Test 2: Complex task with specific model
  console.log("\nTest 2: Complex task with specific model");
  const response2 = await router.processPrompt(
    "Analyze the ethical implications of artificial intelligence in healthcare, considering both benefits and potential risks.",
    { preferredModel: "gpt-3.5-turbo" }
  );
  console.log("Response:", response2.text);
  console.log("Model used:", response2.model);
  console.log("Token usage:", response2.usage);

  // Test 3: Cost-constrained task
  console.log("\nTest 3: Cost-constrained task");
  const response3 = await router.processPrompt(
    "Write a short poem about programming.",
    { maxCost: 0.001, fallbackStrategy: "cost-ascending" }
  );
  console.log("Response:", response3.text);
  console.log("Model used:", response3.model);
  console.log("Token usage:", response3.usage);

  // Test 4: Capability-focused task
  console.log("\nTest 4: Capability-focused task");
  const response4 = await router.processPrompt(
    "Create a comprehensive guide on implementing a microservices architecture.",
    {
      minCapability: { reasoning: 8, knowledge: 8 },
      fallbackStrategy: "capability-descending"
    }
  );
  console.log("Response:", response4.text);
  console.log("Model used:", response4.model);
  console.log("Token usage:", response4.usage);

  // Calculate cost for the last response
  const modelConfig = defaultModelConfigs.find(
    m => `${m.provider}:${m.name}` === `${response4.provider}:${response4.model}`
  );
  if (modelConfig && response4.usage) {
    const cost = 
      modelConfig.costPerInputToken * response4.usage.promptTokens +
      modelConfig.costPerOutputToken * response4.usage.completionTokens;
    console.log("Estimated cost: $", cost.toFixed(6));
  }
}

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  
  const router = new LLMRouter(true);
  
  // Initialize providers with API keys and register them if keys are present
  const openaiKey = process.env.OPENAI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  if (openaiKey) {
    const openai = new OpenAIProvider(openaiKey);
    router.registerProviders([
      { provider: openai, config: defaultModelConfigs.find(m => m.provider === 'openai' && m.name === 'gpt-3.5-turbo')! }
    ]);
  }
  
  if (claudeKey) {
    const claude = new ClaudeProvider(claudeKey);
    router.registerProviders([
      { provider: claude, config: defaultModelConfigs.find(m => m.provider === 'anthropic' && m.name === 'claude-3-7-sonnet')! }
    ]);
  }
  
  if (geminiKey) {
    const gemini = new GeminiProvider(geminiKey);
    router.registerProviders([
      { provider: gemini, config: defaultModelConfigs.find(m => m.provider === 'google' && m.name === 'gemini-1.5-flash')! }
    ]);
  }
  
  app.use(cors());
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Main API endpoint
  app.post('/api/generate', async (req, res) => {
    try {
      const { prompt, options } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      const response = await router.processPrompt(prompt, options || {});
      res.json(response);
    } catch (error) {
      if (error instanceof Error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: error.message });
      } else {
        console.error('Unknown API Error occurred');
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  });
  
  // Start the server
  app.listen(port, () => {
    console.log(`LLM Router API running on port ${port}`);
  });
}

// Run the example or server based on environment
if (process.env.NODE_ENV === 'production') {
  startServer().catch(console.error);
} else {
  main().catch(console.error);
}