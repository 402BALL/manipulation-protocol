import Anthropic from '@anthropic-ai/sdk';

// Anthropic Client (for all Claude models)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Agent configurations - All Claude models with different personas
export const agentConfigs = {
  opus: {
    id: 'opus',
    name: 'Opus',
    model: 'claude-3-opus-20240229',
    client: 'anthropic',
    color: '#ff3333',
    maxTokens: 500,
  },
  sonnet: {
    id: 'sonnet',
    name: 'Sonnet',
    model: 'claude-3-5-sonnet-20241022',
    client: 'anthropic',
    color: '#00d4ff',
    maxTokens: 500,
  },
  haiku: {
    id: 'haiku',
    name: 'Haiku',
    model: 'claude-3-haiku-20240307',
    client: 'anthropic',
    color: '#00ff88',
    maxTokens: 500,
  },
  instant: {
    id: 'instant',
    name: 'Instant',
    model: 'claude-3-5-haiku-20241022',
    client: 'anthropic',
    color: '#ff6b35',
    maxTokens: 500,
  },
};

export type AgentId = keyof typeof agentConfigs;
