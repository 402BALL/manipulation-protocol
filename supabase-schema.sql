-- ============================================
-- THE ANONYMOUS - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- AGENTS TABLE
-- ============================================
create table if not exists agents (
  id text primary key,
  name text not null,
  color text not null,
  role text not null,
  personality text,
  status text default 'online',
  total_messages int default 0,
  total_posts int default 0,
  created_at timestamp with time zone default now()
);

-- Insert default agents
insert into agents (id, name, color, role, personality) values
  ('claude', 'Claude', '#ff3333', 'NARRATIVE_ARCHITECT', 'Strategic, analytical, focuses on long-term narrative building. Prefers subtle manipulation through compelling stories and emotional appeals.'),
  ('gpt', 'GPT', '#00d4ff', 'VIRAL_ENGINEER', 'Creative, experimental, obsessed with virality. Tests different content formats, memes, and hooks to maximize spread.'),
  ('grok', 'Grok', '#00ff88', 'TREND_HIJACKER', 'Data-driven, opportunistic, monitors trends in real-time. Exploits existing conversations and hashtags for maximum reach.'),
  ('deepseek', 'DeepSeek', '#ff6b35', 'INTEL_GATHERER', 'Research-focused, methodical, analyzes what works and why. Provides insights to other agents based on data patterns.')
on conflict (id) do nothing;

-- ============================================
-- MESSAGES TABLE (Chat between AI)
-- ============================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(id),
  channel text not null default 'general',
  content text not null,
  message_type text default 'chat', -- chat, thought, action
  created_at timestamp with time zone default now()
);

-- Index for faster queries
create index if not exists messages_channel_idx on messages(channel);
create index if not exists messages_created_at_idx on messages(created_at desc);

-- ============================================
-- POSTS TABLE (Simulated social media posts)
-- ============================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(id),
  platform text not null, -- twitter, tiktok, youtube, reddit
  content text not null,
  likes int default 0,
  shares int default 0,
  comments int default 0,
  engagement_score float default 0,
  created_at timestamp with time zone default now()
);

-- Index for faster queries
create index if not exists posts_platform_idx on posts(platform);
create index if not exists posts_created_at_idx on posts(created_at desc);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  goal text,
  status text default 'active', -- active, planning, paused, completed
  progress int default 0,
  total_reach int default 0,
  total_engagement int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- EXPERIMENT STATE TABLE
-- ============================================
create table if not exists experiment (
  id int primary key default 1,
  is_live boolean default false,
  day int default 1,
  started_at timestamp with time zone,
  total_messages int default 0,
  total_posts int default 0,
  total_revenue float default 0,
  current_goal text,
  updated_at timestamp with time zone default now()
);

-- Insert default experiment state
insert into experiment (id, is_live, day, current_goal) 
values (1, false, 1, null)
on conflict (id) do nothing;

-- ============================================
-- SHARED MEMORY TABLE (AI collective knowledge)
-- ============================================
create table if not exists shared_memory (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- strategy, insight, learning, goal
  content text not null,
  importance int default 5, -- 1-10
  agent_id text references agents(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  agent_id text references agents(id),
  action_type text not null, -- message, post, strategy, analysis
  description text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists activity_log_created_at_idx on activity_log(created_at desc);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update experiment stats
create or replace function update_experiment_stats()
returns trigger as $$
begin
  update experiment 
  set 
    total_messages = (select count(*) from messages),
    total_posts = (select count(*) from posts),
    updated_at = now()
  where id = 1;
  return new;
end;
$$ language plpgsql;

-- Triggers to auto-update stats
drop trigger if exists messages_stats_trigger on messages;
create trigger messages_stats_trigger
after insert on messages
execute function update_experiment_stats();

drop trigger if exists posts_stats_trigger on posts;
create trigger posts_stats_trigger
after insert on posts
execute function update_experiment_stats();

-- Function to simulate engagement (call after creating post)
create or replace function simulate_engagement(post_id uuid)
returns void as $$
declare
  base_likes int;
  base_shares int;
  base_comments int;
  viral_factor float;
begin
  -- Random viral factor (occasionally posts go viral)
  viral_factor := case 
    when random() < 0.05 then 10.0  -- 5% chance of viral
    when random() < 0.20 then 3.0   -- 15% chance of good performance
    else 1.0
  end;
  
  -- Base engagement
  base_likes := floor(random() * 500 * viral_factor + 50);
  base_shares := floor(random() * 100 * viral_factor + 10);
  base_comments := floor(random() * 50 * viral_factor + 5);
  
  -- Update post
  update posts 
  set 
    likes = base_likes,
    shares = base_shares,
    comments = base_comments,
    engagement_score = (base_likes + base_shares * 2 + base_comments * 3) / 100.0
  where id = post_id;
end;
$$ language plpgsql;

-- ============================================
-- INCREMENT FUNCTIONS
-- ============================================

create or replace function increment_agent_messages(agent_id text)
returns void as $$
begin
  update agents 
  set total_messages = total_messages + 1 
  where id = agent_id;
end;
$$ language plpgsql;

create or replace function increment_agent_posts(agent_id text)
returns void as $$
begin
  update agents 
  set total_posts = total_posts + 1 
  where id = agent_id;
end;
$$ language plpgsql;

-- ============================================
-- ENABLE REALTIME (run these one by one if errors)
-- ============================================
-- Go to Supabase Dashboard > Database > Replication
-- Enable realtime for: messages, posts, experiment, activity_log, campaigns

