import { LLMRouter } from './services/llm-router';
import { OpenAIProvider } from './models/providers/openai-provider';
import { ClaudeProvider } from './models/providers/claude-provider';
import { GeminiProvider } from './models/providers/gemini-provider';
import { defaultModelConfigs } from './config/model-configs';
import { RequestOptions, TaskComplexity } from './models/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize router
  const router = new LLMRouter(true); // Enable semantic caching
  
  // Initialize providers with API keys from environment variables
  const openai = new OpenAIProvider(process.env.OPENAI_API_KEY || '');
  const claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY || '');
  const gemini = new GeminiProvider(process.env.GOOGLE_API_KEY || '');
  
  // Register models
  router.registerProviders([
    { 
      provider: openai, 
      config: defaultModelConfigs.find(m => m.provider === 'openai' && m.name === 'gpt-4-turbo')! 
    },
    { 
      provider: openai, 
      config: defaultModelConfigs.find(m => m.provider === 'openai' && m.name === 'gpt-3.5-turbo')! 
    },
    { 
      provider: claude, 
      config: defaultModelConfigs.find(m => m.provider === 'anthropic' && m.name === 'claude-3-7-sonnet')! 
    },
    { 
      provider: claude, 
      config: defaultModelConfigs.find(m => m.provider === 'anthropic' && m.name === 'claude-3-opus')! 
    },
    { 
      provider: gemini, 
      config: defaultModelConfigs.find(m => m.provider === 'google' && m.name === 'gemini-1.5-pro')! 
    },
    { 
      provider: gemini, 
      config: defaultModelConfigs.find(m => m.provider === 'google' && m.name === 'gemini-1.5-flash')! 
    }
  ]);
  
  // Example 1: Simple query with default options
  try {
    console.log("\n--- Example 1: Simple query with default options ---");
    const response1 = await router.processPrompt("What's the weather like today?");
    console.log("Response:", response1.content);
    console.log("Model used:", response1.modelUsed);
    console.log("Token usage:", response1.tokenUsage);
  } catch (error) {
    console.error("Error:", error.message);
  }
  
  // Example 2: Complex query with specific preferences
  const options: RequestOptions = {
    preferredProvider: 'anthropic',
    minCapability: { reasoning: 9 },
    fallbackStrategy: 'capability-descending',
    cacheResults: true
  };
  
  try {
    console.log("\n--- Example 2: Complex query with specific preferences ---");
    const response2 = await router.processPrompt(
      "Analyze the implications of quantum computing on modern cryptography and suggest three potential mitigation strategies for existing systems.",
      options
    );
    console.log("Response:", response2.content);
    console.log("Model used:", response2.modelUsed);
    console.log("Token usage:", response2.tokenUsage);
  } catch (error) {
    console.error("Error:", error.message);
  }
  
  // Example 3: Using fallback strategy with specific models
  try {
    console.log("\n--- Example 3: Using fallback strategy with specific models ---");
    const fallbackOptions: RequestOptions = {
      fallbackStrategy: 'specific-models',
      fallbackModels: [
        'openai:gpt-4-turbo',
        'anthropic:claude-3-7-sonnet',
        'google:gemini-1.5-flash'
      ],
      cacheResults: true
    };
    
    const response3 = await router.processPrompt(
      "Summarize the key points of the FrugalGPT approach to efficient LLM usage.",
      fallbackOptions
    );
    console.log("Response:", response3.content);
    console.log("Model used:", response3.modelUsed);
    console.log("Token usage:", response3.tokenUsage);
  } catch (error) {
    console.error("Error:", error.message);
  }
  
  // Example 4: Cost-optimized approach for simple tasks
  try {
    console.log("\n--- Example 4: Cost-optimized approach for simple tasks ---");
    const costOptions: RequestOptions = {
      fallbackStrategy: 'cost-ascending',
      maxCost: 0.0001, // Maximum cost per 1000 tokens
      cacheResults: true
    };
    
    const response4 = await router.processPrompt(
      "What is the capital of France?",
      costOptions
    );
    console.log("Response:", response4.content);
    console.log("Model used:", response4.modelUsed);
    console.log("Token usage:", response4.tokenUsage);
    
    // Calculate actual cost
    const modelConfig = defaultModelConfigs.find(m => 
      `${m.provider}:${m.name}` === `${response4.metadata?.provider}:${response4.modelUsed}`
    );
    
    if (modelConfig) {
      const cost = (
        modelConfig.costPerInputToken * response4.tokenUsage.input +
        modelConfig.costPerOutputToken * response4.tokenUsage.output
      ).toFixed(6);
      
      console.log(`Cost: ${cost}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

import express from 'express';
import cors from 'cors';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  
  const router = new LLMRouter(true);
  
  const openai = new OpenAIProvider(process.env.OPENAI_API_KEY || '');
  const claude = new ClaudeProvider(process.env.ANTHROPIC_API_KEY || '');
  const gemini = new GeminiProvider(process.env.GOOGLE_API_KEY || '');
  
  router.registerProviders([
    { provider: openai, config: defaultModelConfigs.find(m => m.provider === 'openai' && m.name === 'gpt-4-turbo')! },
    { provider: openai, config: defaultModelConfigs.find(m => m.provider === 'openai' && m.name === 'gpt-3.5-turbo')! },
    { provider: claude, config: defaultModelConfigs.find(m => m.provider === 'anthropic' && m.name === 'claude-3-7-sonnet')! },
    { provider: claude, config: defaultModelConfigs.find(m => m.provider === 'anthropic' && m.name === 'claude-3-opus')! },
    { provider: gemini, config: defaultModelConfigs.find(m => m.provider === 'google' && m.name === 'gemini-1.5-pro')! },
    { provider: gemini, config: defaultModelConfigs.find(m => m.provider === 'google' && m.name === 'gemini-1.5-flash')! }
  ]);
  
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
      console.error('API Error:', error.message);
      res.status(500).json({ error: error.message });
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
