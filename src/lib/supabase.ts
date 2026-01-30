import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Agent {
  id: string;
  name: string;
  color: string;
  role: string;
  personality: string;
  status: string;
  total_messages: number;
  total_posts: number;
}

export interface Message {
  id: string;
  agent_id: string;
  channel: string;
  content: string;
  message_type: string;
  created_at: string;
}

export interface Post {
  id: string;
  agent_id: string;
  platform: string;
  content: string;
  likes: number;
  shares: number;
  comments: number;
  engagement_score: number;
  created_at: string;
}

export interface Experiment {
  id: number;
  is_live: boolean;
  day: number;
  started_at: string | null;
  total_messages: number;
  total_posts: number;
  total_revenue: number;
  current_goal: string | null;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: string;
  progress: number;
  total_reach: number;
  total_engagement: number;
}

export interface SharedMemory {
  id: string;
  category: string;
  content: string;
  importance: number;
  agent_id: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  agent_id: string;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

