'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Message, Post, Experiment, Agent, ActivityLog, SharedMemory, Campaign } from '@/lib/supabase';

export function useExperiment() {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [sharedMemory, setSharedMemory] = useState<SharedMemory[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch experiment state
      const { data: expData } = await supabase
        .from('experiment')
        .select('*')
        .eq('id', 1)
        .single();
      setExperiment(expData);

      // Fetch agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select('*');
      setAgents(agentsData || []);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      setMessages(messagesData || []);

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts(postsData || []);

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(activityData || []);

      // Fetch shared memory (strategies, insights)
      const { data: memoryData } = await supabase
        .from('shared_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setSharedMemory(memoryData || []);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      setCampaigns(campaignsData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchData();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Subscribe to posts
    const postsChannel = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts((prev) => [payload.new as Post, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPosts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Post) : p))
            );
          }
        }
      )
      .subscribe();

    // Subscribe to experiment state
    const experimentChannel = supabase
      .channel('experiment-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'experiment' },
        (payload) => {
          setExperiment(payload.new as Experiment);
        }
      )
      .subscribe();

    // Subscribe to activity log
    const activityChannel = supabase
      .channel('activity-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    // Subscribe to shared memory
    const memoryChannel = supabase
      .channel('memory-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shared_memory' },
        (payload) => {
          setSharedMemory((prev) => [payload.new as SharedMemory, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(experimentChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(memoryChannel);
    };
  }, [fetchData]);

  // Control functions
  const startExperiment = async () => {
    const res = await fetch('/api/experiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    return res.json();
  };

  const stopExperiment = async () => {
    const res = await fetch('/api/experiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    return res.json();
  };

  const runTurn = async (agentId?: string) => {
    const res = await fetch('/api/experiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'turn', agentId }),
    });
    return res.json();
  };

  return {
    experiment,
    messages,
    posts,
    agents,
    activities,
    sharedMemory,
    campaigns,
    isLoading,
    error,
    startExperiment,
    stopExperiment,
    runTurn,
    refetch: fetchData,
  };
}

