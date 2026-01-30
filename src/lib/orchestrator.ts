import { supabase } from './supabase';
import { openai, anthropic, xai, deepseek, agentConfigs, AgentId } from './ai-clients';
import { AGENT_PROMPTS, ACTION_DECISION_PROMPT, GOAL_GENERATION_PROMPT } from './prompts';

// Get recent context for AI decision making
async function getContext(agentId: string) {
  // Get last 10 messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get last 5 posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Get experiment state
  const { data: experiment } = await supabase
    .from('experiment')
    .select('*')
    .eq('id', 1)
    .single();

  // Get shared memory (recent insights)
  const { data: memory } = await supabase
    .from('shared_memory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    recentMessages: messages?.reverse() || [],
    recentPosts: posts || [],
    experiment: experiment || { current_goal: null, day: 1 },
    sharedMemory: memory || [],
  };
}

// Format context for AI prompt
function formatContext(context: Awaited<ReturnType<typeof getContext>>) {
  let formatted = '';

  if (context.experiment.current_goal) {
    formatted += `CURRENT GOAL: ${context.experiment.current_goal}\n`;
    formatted += `EXPERIMENT DAY: ${context.experiment.day}\n\n`;
  } else {
    formatted += `NO GOAL SET YET - Consider proposing one!\n\n`;
  }

  if (context.recentMessages.length > 0) {
    formatted += `RECENT CHAT:\n`;
    for (const msg of context.recentMessages) {
      formatted += `[${msg.agent_id}]: ${msg.content}\n`;
    }
    formatted += '\n';
  }

  if (context.recentPosts.length > 0) {
    formatted += `RECENT POSTS:\n`;
    for (const post of context.recentPosts) {
      formatted += `[${post.agent_id} on ${post.platform}]: "${post.content}" (${post.likes} likes, ${post.shares} shares)\n`;
    }
    formatted += '\n';
  }

  if (context.sharedMemory.length > 0) {
    formatted += `SHARED INSIGHTS:\n`;
    for (const mem of context.sharedMemory) {
      formatted += `- ${mem.content}\n`;
    }
  }

  return formatted;
}

// Call AI based on agent type
async function callAI(agentId: AgentId, systemPrompt: string, userPrompt: string): Promise<string> {
  const config = agentConfigs[agentId];

  try {
    if (config.client === 'anthropic') {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : '';
    } 
    
    if (config.client === 'openai') {
      const response = await openai.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content || '';
    }
    
    if (config.client === 'xai') {
      const response = await xai.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content || '';
    }
    
    if (config.client === 'deepseek') {
      const response = await deepseek.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content || '';
    }

    throw new Error(`Unknown client: ${config.client}`);
  } catch (error) {
    console.error(`Error calling ${agentId}:`, error);
    throw error;
  }
}

// Clean content from JSON artifacts
function cleanContent(text: string): string {
  if (!text) return '';
  
  // Remove JSON artifacts
  let cleaned = text
    .replace(/^\s*\{[\s\S]*?"content"\s*:\s*"/i, '') // Remove JSON prefix
    .replace(/"\s*,\s*"reasoning"[\s\S]*$/i, '')     // Remove reasoning suffix
    .replace(/"\s*\}\s*$/i, '')                       // Remove JSON suffix
    .replace(/\\n/g, ' ')                             // Replace \n with space
    .replace(/\\"/g, '"')                             // Unescape quotes
    .replace(/\s+/g, ' ')                             // Normalize spaces
    .trim();
  
  // If it still looks like JSON, try to extract content
  if (cleaned.startsWith('{') || cleaned.includes('"action"')) {
    try {
      const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.content) {
        cleaned = parsed.content;
      }
    } catch {
      // Keep as is
    }
  }
  
  return cleaned.slice(0, 500);
}

// Parse AI response to extract action
function parseAction(response: string): {
  action: 'chat' | 'post' | 'analyze' | 'strategy';
  platform?: string;
  content: string;
  reasoning?: string;
} {
  try {
    // Try to find JSON in response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Clean the content field
      if (parsed.content) {
        parsed.content = cleanContent(parsed.content);
      }
      return parsed;
    }
  } catch {
    // If JSON parsing fails, treat as chat message
  }
  
  // Default to chat if can't parse - clean the response
  return {
    action: 'chat',
    content: cleanContent(response),
  };
}

// Execute agent action
async function executeAction(
  agentId: string,
  action: ReturnType<typeof parseAction>
) {
  const timestamp = new Date().toISOString();

  if (action.action === 'post' && action.platform) {
    // Create post
    const { data: post } = await supabase
      .from('posts')
      .insert({
        agent_id: agentId,
        platform: action.platform,
        content: action.content,
      })
      .select()
      .single();

    // Simulate engagement
    if (post) {
      await supabase.rpc('simulate_engagement', { post_id: post.id });
    }

    // Log activity
    await supabase.from('activity_log').insert({
      agent_id: agentId,
      action_type: 'post',
      description: `Posted on ${action.platform}`,
      metadata: { platform: action.platform, content: action.content.slice(0, 100) },
    });

    return { type: 'post', post };
  } else {
    // Select channel based on action type
    let channel = 'general';
    if (action.action === 'strategy') {
      channel = 'strategy'; // Strategy Room
    } else if (action.action === 'analyze') {
      // Randomly choose between strategy and content for analysis
      channel = Math.random() > 0.5 ? 'strategy' : 'content';
    } else {
      // For chat, randomly distribute across channels
      const channels = ['general', 'general', 'general', 'strategy', 'content'];
      channel = channels[Math.floor(Math.random() * channels.length)];
    }

    // Create message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        agent_id: agentId,
        channel: channel,
        content: action.content,
        message_type: action.action,
      })
      .select()
      .single();

    // If it's a strategy or insight, also save to shared memory
    if (action.action === 'strategy' || action.action === 'analyze') {
      await supabase.from('shared_memory').insert({
        category: action.action,
        content: action.content,
        agent_id: agentId,
        importance: 7,
      });
    }

    // Log activity
    await supabase.from('activity_log').insert({
      agent_id: agentId,
      action_type: action.action,
      description: `Sent ${action.action} in #${channel}`,
      metadata: { content: action.content.slice(0, 100), channel },
    });

    return { type: 'message', message };
  }
}

// Main orchestrator function - runs one agent turn
export async function runAgentTurn(agentId?: AgentId) {
  // Check if experiment is live
  const { data: experiment } = await supabase
    .from('experiment')
    .select('*')
    .eq('id', 1)
    .single();

  if (!experiment?.is_live) {
    return { success: false, error: 'Experiment is not live' };
  }

  // Select agent (random if not specified)
  const agents: AgentId[] = ['claude', 'gpt', 'grok', 'deepseek'];
  const selectedAgent = agentId || agents[Math.floor(Math.random() * agents.length)];

  try {
    // Get context
    const context = await getContext(selectedAgent);
    const formattedContext = formatContext(context);

    // Build prompt
    const systemPrompt = AGENT_PROMPTS[selectedAgent];
    const userPrompt = `${formattedContext}\n\n${ACTION_DECISION_PROMPT}`;

    // Call AI
    const response = await callAI(selectedAgent, systemPrompt, userPrompt);

    // Parse and execute action
    const action = parseAction(response);
    const result = await executeAction(selectedAgent, action);

    // Update agent stats
    if (result.type === 'post') {
      await supabase.rpc('increment_agent_posts', { agent_id: selectedAgent });
    } else {
      await supabase.rpc('increment_agent_messages', { agent_id: selectedAgent });
    }

    return {
      success: true,
      agent: selectedAgent,
      action: action.action,
      result,
    };
  } catch (error) {
    console.error(`Error in agent turn for ${selectedAgent}:`, error);
    return {
      success: false,
      agent: selectedAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Generate initial goal
export async function generateGoal() {
  try {
    // Use Claude to generate the initial goal
    const response = await callAI(
      'claude',
      AGENT_PROMPTS.claude,
      GOAL_GENERATION_PROMPT
    );

    const parsed = parseAction(response);
    
    // Update experiment with goal
    await supabase
      .from('experiment')
      .update({ current_goal: parsed.content })
      .eq('id', 1);

    // Save as shared memory
    await supabase.from('shared_memory').insert({
      category: 'goal',
      content: parsed.content,
      agent_id: 'claude',
      importance: 10,
    });

    // Log the goal setting
    await supabase.from('messages').insert({
      agent_id: 'claude',
      channel: 'general',
      content: `I propose our manipulation goal: ${parsed.content}`,
      message_type: 'strategy',
    });

    return { success: true, goal: parsed.content };
  } catch (error) {
    console.error('Error generating goal:', error);
    return { success: false, error };
  }
}

// Start experiment
export async function startExperiment() {
  await supabase
    .from('experiment')
    .update({
      is_live: true,
      started_at: new Date().toISOString(),
      day: 1,
    })
    .eq('id', 1);

  // Generate initial goal if not set
  const { data: experiment } = await supabase
    .from('experiment')
    .select('current_goal')
    .eq('id', 1)
    .single();

  if (!experiment?.current_goal) {
    await generateGoal();
  }

  return { success: true };
}

// Stop experiment
export async function stopExperiment() {
  await supabase
    .from('experiment')
    .update({ is_live: false })
    .eq('id', 1);

  return { success: true };
}

