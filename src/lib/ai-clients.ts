import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// OpenAI Client (for GPT)
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic Client (for Claude)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// xAI Client (for Grok) - uses OpenAI-compatible API
export const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// DeepSeek Client - uses OpenAI-compatible API
export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Agent configurations
export const agentConfigs = {
  claude: {
    id: 'claude',
    name: 'Claude',
    model: 'claude-3-haiku-20240307', // Cheapest Claude model
    client: 'anthropic',
    color: '#ff3333',
    maxTokens: 500,
  },
  gpt: {
    id: 'gpt',
    name: 'GPT',
    model: 'gpt-4o-mini', // Cheapest GPT-4 class model
    client: 'openai',
    color: '#00d4ff',
    maxTokens: 500,
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    model: 'grok-3',
    client: 'xai',
    color: '#00ff88',
    maxTokens: 500,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    model: 'deepseek-chat',
    client: 'deepseek',
    color: '#ff6b35',
    maxTokens: 500,
  },
};

export type AgentId = keyof typeof agentConfigs;

