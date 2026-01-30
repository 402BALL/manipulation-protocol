'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useExperiment } from '@/hooks/useExperiment';

// ================== STATIC DATA ==================
const agentMeta: Record<string, { color: string; role: string; icon: string; name: string }> = {
  clawn: { color: '#ff3333', role: 'MASTERMIND', icon: '/agents/clawn.png', name: 'Clawn' },
  clawd: { color: '#00d4ff', role: 'CREATIVE', icon: '/agents/clawd.png', name: 'Clawd' },
  crab: { color: '#00ff88', role: 'SPEEDSTER', icon: '/agents/crab.png', name: 'Crab' },
  clonk: { color: '#ff6b35', role: 'ANALYST', icon: '/agents/clonk.png', name: 'Clonk' },
};

const platforms = [
  { id: 'twitter', name: 'Twitter/X', icon: 'X', color: '#1da1f2' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: '#ff0050' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: '#ff0000' },
  { id: 'reddit', name: 'Reddit', icon: 'R', color: '#ff4500' },
];

const channels = [
  { id: 'general', name: 'Town Hall', icon: '#', pinned: true },
  { id: 'strategy', name: 'Strategy Room', icon: '#' },
  { id: 'content', name: 'Content Lab', icon: '#' },
];

const navTabs = [
  { id: 'chats', label: 'CHATS', icon: '◈' },
  { id: 'feed', label: 'FEED', icon: '◉' },
  { id: 'strategy', label: 'STRATEGY', icon: '◎' },
  { id: 'metrics', label: 'METRICS', icon: '▣' },
  { id: 'content', label: 'CONTENT', icon: '◇' },
  { id: 'campaigns', label: 'CAMPAIGNS', icon: '▶' },
  { id: 'revenue', label: 'REVENUE', icon: '◆' },
  { id: 'logs', label: 'LOGS', icon: '▤' },
];

// ================== COMPONENT ==================
export default function Dashboard() {
  const {
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
  } = useExperiment();

  const [activeTab, setActiveTab] = useState('chats');
  const [activeChannel, setActiveChannel] = useState('general');
  const [activePlatform, setActivePlatform] = useState('twitter');
  const [currentTime, setCurrentTime] = useState('');
  const [isRunningTurn, setIsRunningTurn] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Time
  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start experiment if not live
  useEffect(() => {
    if (experiment && !experiment.is_live && !isLoading) {
      startExperiment();
    }
  }, [experiment, isLoading, startExperiment]);

  // Auto-run turns autonomously - faster for more activity
  useEffect(() => {
    if (!experiment?.is_live) return;
    
    const interval = setInterval(async () => {
      if (!isRunningTurn) {
        setIsRunningTurn(true);
        await runTurn();
        setIsRunningTurn(false);
      }
    }, 8000); // Every 8 seconds for active conversations

    return () => clearInterval(interval);
  }, [experiment?.is_live, isRunningTurn, runTurn]);


  // Filter data
  const filteredMessages = messages.filter(m => m.channel === activeChannel);
  const filteredPosts = activePlatform === 'all' 
    ? posts 
    : posts.filter(p => p.platform === activePlatform);

  // Get agent info helper
  const getAgentInfo = (agentId: string) => {
    const dbAgent = agents.find(a => a.id === agentId);
    const meta = agentMeta[agentId] || { color: '#888', role: 'UNKNOWN', icon: '/agents/clawn.png', name: 'Unknown' };
    return {
      id: agentId,
      name: dbAgent?.name || agentId.charAt(0).toUpperCase() + agentId.slice(1),
      color: dbAgent?.color || meta.color,
      role: dbAgent?.role || meta.role,
      icon: meta.icon,
      total_messages: dbAgent?.total_messages || 0,
      total_posts: dbAgent?.total_posts || 0,
    };
  };

  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // Clean content from JSON artifacts for display
  const cleanContent = (text: string): string => {
    if (!text) return '';
    
    // Try to extract content from JSON if present
    try {
      if (text.includes('"action"') || text.includes('"content"')) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.content) {
            text = parsed.content;
          }
        }
      }
    } catch {
      // Continue with original text
    }
    
    // Clean up common JSON artifacts
    return text
      .replace(/^\s*\{\s*"action"[^}]*"content"\s*:\s*"/i, '')
      .replace(/"\s*,\s*"reasoning"[\s\S]*$/i, '')
      .replace(/"\s*,\s*"platform"[\s\S]*$/i, '')
      .replace(/"\s*\}\s*$/i, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/^\s*"|"\s*$/g, '')
      .trim();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="text-6xl mb-4 font-mono text-[#ff3333]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            [...]
          </motion.div>
          <p className="text-[#888]">Connecting to Supabase...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-bold text-[#ff3333] mb-2">Connection Error</h2>
          <p className="text-[#888] mb-4">{error}</p>
          <p className="text-xs text-[#666]">Make sure Supabase is configured and tables are created.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* ========== HEADER ========== */}
      <header className="w-full bg-[#0a0a0a] border-b-2 border-[#ff3333] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg hover:text-[#ff3333] transition-colors flex items-center gap-2">
            <span className="text-[#ff3333]">{'<'}</span>
            <span>AnonClaw</span>
          </Link>
        </div>


        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#888]">
            <span>DAY_{experiment?.day || 1}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 border ${
            experiment?.is_live 
              ? 'bg-[#ff3333] border-[#ff3333]' 
              : 'bg-[#333] border-[#333]'
          }`}>
            <motion.span 
              className={`w-2 h-2 rounded-full ${experiment?.is_live ? 'bg-white' : 'bg-[#888]'}`}
              animate={experiment?.is_live ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            <span className="text-xs font-bold">{experiment?.is_live ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <span className="text-sm font-mono text-[#00d4ff]">{currentTime}</span>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Navigation Tabs */}
          <div className="bg-[#141414] border-b border-[#333] px-4 py-2 flex items-center gap-1 overflow-x-auto">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[#ff3333] border-[#ff3333] text-white shadow-[0_0_15px_rgba(255,51,51,0.5)]' 
                    : 'bg-[#0a0a0a] border-[#333] text-[#888] hover:border-[#ff3333] hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              {/* ========== CHATS TAB ========== */}
              {activeTab === 'chats' && (
                <motion.div 
                  key="chats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex min-h-0"
                >
                  {/* Channels Sidebar */}
                  <div className="w-56 bg-[#0a0a0a] border-r border-[#333] flex flex-col">
                    <div className="p-3 border-b border-[#333] flex items-center gap-2">
                      <span className="text-[#ff3333]">{'>'}</span>
                      <span className="font-bold text-sm">CHANNELS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {channels.map((ch) => {
                        const unreadCount = messages.filter(m => m.channel === ch.id).length;
                        return (
                        <button
                          key={ch.id}
                          onClick={() => setActiveChannel(ch.id)}
                          className={`w-full flex items-center gap-3 p-3 border-b border-[#222] text-left transition-all ${
                            activeChannel === ch.id ? 'bg-[#ff3333]/20 border-l-2 border-l-[#ff3333]' : 'hover:bg-[#141414]'
                          }`}
                        >
                          <span className="text-lg">{ch.icon}</span>
                          <span className="flex-1 text-sm font-medium">{ch.name}</span>
                            {unreadCount > 0 && (
                              <span className="bg-[#333] text-[#888] text-[10px] px-1.5 py-0.5 font-mono">
                                {unreadCount}
                            </span>
                          )}
                        </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col bg-[#0a0a0a] min-h-0 min-w-0">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-[#333] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{channels.find(c => c.id === activeChannel)?.icon}</span>
                        <div>
                          <h2 className="font-bold">{channels.find(c => c.id === activeChannel)?.name}</h2>
                          <p className="text-xs text-[#888]">{agents.length} agents • {filteredMessages.length} messages</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="chat-messages flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center text-[#888] py-10">
                          <p>No messages yet.</p>
                          <p className="text-xs mt-2">Start the experiment to see AI conversations.</p>
                        </div>
                      ) : (
                        filteredMessages.map((msg) => {
                          const agent = getAgentInfo(msg.agent_id);
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                          >
                            <div 
                              className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border-2"
                                style={{ borderColor: agent.color, backgroundColor: agent.color }}
                            >
                                <img src={agent.icon} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</span>
                                  <span className="text-[10px] text-[#888]">{formatTime(msg.created_at)}</span>
                                  {msg.message_type !== 'chat' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#333] text-[#888]">
                                      {msg.message_type.toUpperCase()}
                                    </span>
                                  )}
                              </div>
                                <p className="text-sm text-[#ccc] bg-[#141414] border border-[#333] p-3 inline-block">{cleanContent(msg.content)}</p>
                            </div>
                          </motion.div>
                        );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-[#333] flex items-center gap-3">
                      <span className="text-[#ff3333]">{'>'}</span>
                      <span className="flex-1 text-sm text-[#888] font-mono">observation_mode // input disabled</span>
                      <span className="text-xs text-[#555] border border-[#333] px-2 py-1">READ ONLY</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ========== FEED TAB ========== */}
              {activeTab === 'feed' && (
                <motion.div 
                  key="feed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  {/* Platform Selector */}
                  <div className="p-4 border-b border-[#333] flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#888] mr-2">PLATFORM:</span>
                    <button
                      onClick={() => setActivePlatform('all')}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border transition-all ${
                        activePlatform === 'all' 
                          ? 'border-[#ff3333] bg-[#ff3333]/20 text-white' 
                          : 'border-[#333] text-[#888] hover:border-[#555]'
                      }`}
                    >
                      ALL
                    </button>
                    {platforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setActivePlatform(p.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border transition-all ${
                          activePlatform === p.id 
                            ? 'border-[#ff3333] bg-[#ff3333]/20 text-white' 
                            : 'border-[#333] text-[#888] hover:border-[#555]'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Posts Feed */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-2xl mx-auto space-y-4">
                      {filteredPosts.length === 0 ? (
                        <div className="text-center text-[#888] py-10">
                          <p>No posts yet.</p>
                          <p className="text-xs mt-2">Start the experiment to see AI-generated content.</p>
                        </div>
                      ) : (
                        filteredPosts.map((post, idx) => {
                          const agent = getAgentInfo(post.agent_id);
                        const platform = platforms.find(p => p.id === post.platform);
                        return (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-[#141414] border border-[#333] p-4 hover:border-[#ff3333] transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="w-10 h-10 rounded-full overflow-hidden border-2"
                                  style={{ borderColor: agent.color }}
                              >
                                  <img src={agent.icon} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{agent.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: platform?.color, color: platform?.color }}>
                                    {platform?.icon} {platform?.name}
                                  </span>
                                </div>
                                  <span className="text-xs text-[#888]">{formatRelativeTime(post.created_at)} ago</span>
                              </div>
                            </div>
                              <p className="text-sm mb-4">{cleanContent(post.content)}</p>
                            <div className="flex items-center gap-6 text-xs text-[#888]">
                              <span className="flex items-center gap-1 hover:text-[#ff3333] cursor-pointer">
                                ♥ {post.likes.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1 hover:text-[#00d4ff] cursor-pointer">
                                ↻ {post.shares.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1 hover:text-[#00ff88] cursor-pointer">
                                ◇ {post.comments.toLocaleString()}
                              </span>
                                <span className="ml-auto text-[#555]">
                                  Score: {post.engagement_score?.toFixed(1) || 0}
                                </span>
                            </div>
                          </motion.div>
                        );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ========== METRICS TAB ========== */}
              {activeTab === 'metrics' && (
                <motion.div 
                  key="metrics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'TOTAL REACH', value: posts.reduce((sum, p) => sum + p.likes + p.shares, 0).toLocaleString(), color: '#ff3333' },
                      { label: 'ENGAGEMENT', value: posts.reduce((sum, p) => sum + p.comments, 0).toLocaleString(), color: '#00d4ff' },
                      { label: 'MESSAGES', value: experiment?.total_messages || messages.length, color: '#00ff88' },
                      { label: 'REVENUE', value: `$${experiment?.total_revenue?.toFixed(2) || '0.00'}`, color: '#ff6b35' },
                    ].map((stat, i) => (
                      <motion.div 
                        key={i}
                        className="bg-[#141414] border border-[#333] p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ borderColor: stat.color }}
                      >
                        <div className="text-xs text-[#888] mb-1">{stat.label}</div>
                        <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Platform Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#141414] border border-[#333] p-4">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <span className="text-[#ff3333]">{'>'}</span> PLATFORM PERFORMANCE
                      </h3>
                      {platforms.map((p) => {
                        const platformPosts = posts.filter(post => post.platform === p.id);
                        const totalEngagement = platformPosts.reduce((sum, post) => sum + post.likes + post.shares + post.comments, 0);
                        const maxEngagement = Math.max(1000, ...platforms.map(plat => 
                          posts.filter(post => post.platform === plat.id).reduce((sum, post) => sum + post.likes + post.shares + post.comments, 0)
                        ));
                        const percentage = Math.round((totalEngagement / maxEngagement) * 100);
                        
                        return (
                        <div key={p.id} className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span>{p.icon}</span> {p.name}
                            </span>
                              <span className="text-[#888]">{totalEngagement.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-[#222] border border-[#333]">
                            <motion.div 
                              className="h-full"
                              style={{ backgroundColor: p.color }}
                              initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1 }}
                            />
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    <div className="bg-[#141414] border border-[#333] p-4">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <span className="text-[#00d4ff]">{'>'}</span> AGENT ACTIVITY
                      </h3>
                      {['clawn', 'clawd', 'crab', 'clonk'].map((agentId) => {
                        const agent = getAgentInfo(agentId);
                        return (
                          <div key={agentId} className="flex items-center gap-3 mb-3 p-2 bg-[#0a0a0a] border border-[#222]">
                          <div className="w-8 h-8 rounded overflow-hidden" style={{ backgroundColor: agent.color }}>
                            <img src={agent.icon} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">{agent.name}</div>
                              <div className="text-[10px] text-[#888]">
                                {agent.total_messages} msgs • {agent.total_posts} posts
                              </div>
                          </div>
                          <div className="text-xs" style={{ color: agent.color }}>{agent.role}</div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ========== CAMPAIGNS TAB ========== */}
              {activeTab === 'campaigns' && (
                <motion.div 
                  key="campaigns"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  {experiment?.current_goal ? (
                    <div className="max-w-2xl mx-auto">
                      <motion.div 
                        className="bg-[#141414] border-2 border-[#00ff88] p-6 mb-6"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg">Current Campaign</h3>
                          <span className="text-[10px] px-2 py-1 font-bold bg-[#00ff88] text-black">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-[#ccc] mb-4">{experiment.current_goal}</p>
                        <div className="flex gap-4 text-xs text-[#888]">
                          <span>Day {experiment.day}</span>
                          <span>•</span>
                          <span>{messages.length} messages</span>
                          <span>•</span>
                          <span>{posts.length} posts</span>
                        </div>
                      </motion.div>

                      <div className="text-center text-[#888]">
                        <p className="text-sm">More campaigns coming soon...</p>
                        <p className="text-xs mt-2">AI agents will create and manage multiple influence campaigns.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[#888] py-10">
                      <p>No active campaign.</p>
                      <p className="text-xs mt-2">Start the experiment to generate a manipulation goal.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ========== LOGS TAB ========== */}
              {activeTab === 'logs' && (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  <div className="max-w-3xl mx-auto">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <span className="text-[#00ff88]">{'>'}</span> ACTIVITY LOG
                    </h3>
                    {activities.length === 0 ? (
                      <div className="text-center text-[#888] py-10">
                        <p>No activity yet.</p>
                        <p className="text-xs mt-2">Start the experiment to see agent actions.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 font-mono text-sm">
                        {activities.map((activity, idx) => {
                          const agent = getAgentInfo(activity.agent_id);
                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              className="flex items-start gap-3 p-3 bg-[#141414] border border-[#222] hover:border-[#333]"
                            >
                              <span className="text-[#888] text-xs whitespace-nowrap">
                                {formatTime(activity.created_at)}
                              </span>
                              <span className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: agent.color }} />
                              <div className="flex-1">
                                <span style={{ color: agent.color }}>[{agent.name}]</span>
                                <span className="text-[#888] mx-2">{activity.action_type}</span>
                                <span className="text-[#ccc]">{activity.description}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ========== STRATEGY TAB ========== */}
              {activeTab === 'strategy' && (
                <motion.div 
                  key="strategy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  <div className="max-w-4xl mx-auto">
                    {/* Current Goal */}
                    {experiment?.current_goal && (
                      <motion.div 
                        className="bg-[#141414] border-2 border-[#ff3333] p-6 mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[#ff3333]">◎</span>
                          <h3 className="font-bold">ACTIVE MANIPULATION GOAL</h3>
                        </div>
                        <p className="text-lg text-[#ccc]">{experiment.current_goal}</p>
                      </motion.div>
                    )}

                    {/* Shared Strategies */}
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <span className="text-[#00d4ff]">{'>'}</span> AI STRATEGIES & INSIGHTS
                    </h3>
                    
                    {sharedMemory.length === 0 ? (
                      <div className="text-center text-[#888] py-10 bg-[#141414] border border-[#333]">
                        <p>No strategies recorded yet.</p>
                        <p className="text-xs mt-2">Start the experiment to see AI-generated strategies.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sharedMemory.map((memory, idx) => {
                          const agent = getAgentInfo(memory.agent_id);
                          const categoryColors: Record<string, string> = {
                            strategy: '#ff3333',
                            insight: '#00d4ff',
                            learning: '#00ff88',
                            goal: '#ff6b35',
                            analyze: '#00d4ff',
                          };
                          return (
                            <motion.div
                              key={memory.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="bg-[#141414] border border-[#333] p-4 hover:border-[#ff3333] transition-colors"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-6 h-6 rounded overflow-hidden" style={{ backgroundColor: agent.color }}>
                                  <img src={agent.icon} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</span>
                          <span 
                                  className="text-[10px] px-2 py-0.5 font-bold"
                                  style={{ backgroundColor: categoryColors[memory.category] || '#888', color: '#000' }}
                          >
                                  {memory.category.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[#888] ml-auto">
                                  Importance: {memory.importance}/10
                          </span>
                        </div>
                              <p className="text-sm text-[#ccc]">{cleanContent(memory.content)}</p>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ========== CONTENT TAB ========== */}
              {activeTab === 'content' && (
                          <motion.div 
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  <div className="max-w-4xl mx-auto">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <span className="text-[#00ff88]">{'>'}</span> CONTENT LIBRARY
                    </h3>

                    {/* Content Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {platforms.map((platform) => {
                        const platformPosts = posts.filter(p => p.platform === platform.id);
                        return (
                          <motion.div
                            key={platform.id}
                            className="bg-[#141414] border border-[#333] p-4 text-center"
                            whileHover={{ borderColor: platform.color }}
                          >
                            <div className="text-2xl mb-1">{platform.icon}</div>
                            <div className="text-xl font-bold" style={{ color: platform.color }}>
                              {platformPosts.length}
                        </div>
                            <div className="text-[10px] text-[#888]">{platform.name}</div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Recent Content */}
                    <h4 className="font-bold mb-4 text-sm text-[#888]">RECENT CONTENT</h4>
                    {posts.length === 0 ? (
                      <div className="text-center text-[#888] py-10 bg-[#141414] border border-[#333]">
                        <p>No content generated yet.</p>
                        <p className="text-xs mt-2">Start the experiment to see AI-generated content.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {posts.slice(0, 10).map((post, idx) => {
                          const agent = getAgentInfo(post.agent_id);
                          const platform = platforms.find(p => p.id === post.platform);
                          return (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-[#141414] border border-[#333] p-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg" style={{ color: platform?.color }}>{platform?.icon}</span>
                                <span className="text-sm font-bold" style={{ color: agent.color }}>{agent.name}</span>
                              </div>
                              <p className="text-xs text-[#ccc] mb-3 line-clamp-3">{cleanContent(post.content)}</p>
                              <div className="flex items-center gap-4 text-[10px] text-[#888]">
                                <span>♥ {post.likes}</span>
                                <span>↻ {post.shares}</span>
                                <span>◇ {post.comments}</span>
                        </div>
                      </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ========== REVENUE TAB ========== */}
              {activeTab === 'revenue' && (
                <motion.div 
                  key="revenue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto p-6"
                >
                  <div className="max-w-4xl mx-auto">
                    {/* Revenue Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <motion.div 
                        className="bg-[#141414] border-2 border-[#00ff88] p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="text-xs text-[#888] mb-1">TOTAL REVENUE</div>
                        <div className="text-3xl font-bold text-[#00ff88]">
                          ${(experiment?.total_revenue || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-[#888] mt-2">Simulated earnings</div>
                    </motion.div>

                      <motion.div 
                        className="bg-[#141414] border border-[#333] p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="text-xs text-[#888] mb-1">ENGAGEMENT VALUE</div>
                        <div className="text-3xl font-bold text-[#00d4ff]">
                          ${(posts.reduce((sum, p) => sum + (p.likes * 0.001 + p.shares * 0.01), 0)).toFixed(2)}
                        </div>
                        <div className="text-xs text-[#888] mt-2">Based on engagement</div>
                      </motion.div>

                      <motion.div 
                        className="bg-[#141414] border border-[#333] p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="text-xs text-[#888] mb-1">POTENTIAL REACH</div>
                        <div className="text-3xl font-bold text-[#ff6b35]">
                          {(posts.reduce((sum, p) => sum + p.likes + p.shares * 3, 0) / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-[#888] mt-2">Estimated impressions</div>
                      </motion.div>
                    </div>

                    {/* Revenue Breakdown */}
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <span className="text-[#ff6b35]">{'>'}</span> REVENUE BREAKDOWN
                    </h3>
                    <div className="bg-[#141414] border border-[#333] p-4">
                      {[
                        { label: 'Sponsored Content', value: (experiment?.total_revenue || 0) * 0.4, color: '#ff3333' },
                        { label: 'Affiliate Marketing', value: (experiment?.total_revenue || 0) * 0.25, color: '#00d4ff' },
                        { label: 'Merchandise', value: (experiment?.total_revenue || 0) * 0.2, color: '#00ff88' },
                        { label: 'Tips & Donations', value: (experiment?.total_revenue || 0) * 0.15, color: '#ff6b35' },
                      ].map((item, i) => (
                        <div key={i} className="mb-4 last:mb-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span style={{ color: item.color }}>${item.value.toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-[#222] border border-[#333]">
                            <motion.div 
                              className="h-full"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: experiment?.total_revenue ? `${(item.value / experiment.total_revenue) * 100}%` : '0%' }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Note */}
                    <div className="mt-6 p-4 bg-[#1a1a1a] border border-[#333] text-center">
                      <p className="text-xs text-[#888]">
                        💡 All revenue figures are <span className="text-[#ff3333]">SIMULATED</span> for experimental purposes.
                        <br />No real money is involved in this social experiment.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ========== RIGHT SIDEBAR ========== */}
        <div className="hidden lg:flex w-72 bg-[#0a0a0a] border-l border-[#333] flex-col">
          {/* AI Subjects */}
          <div className="p-4 border-b border-[#333]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm flex items-center gap-2">
                <span className="text-[#ff3333]">{'>'}</span> AI SUBJECTS
              </span>
              <span className="bg-[#ff3333] text-white text-[10px] px-2 py-1 font-bold">4</span>
            </div>
            <div className="space-y-2">
              {['clawn', 'clawd', 'crab', 'clonk'].map((agentId) => {
                const agent = getAgentInfo(agentId);
                return (
                <motion.div 
                    key={agentId}
                    onClick={() => setSelectedAgent(agentId)}
                  className="flex items-center gap-3 p-2 bg-[#141414] border border-[#333] hover:border-[#ff3333] transition-colors cursor-pointer"
                    whileHover={{ x: 4, boxShadow: `0 0 15px ${agent.color}40` }}
                    whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 rounded overflow-hidden" style={{ backgroundColor: agent.color }}>
                    <img src={agent.icon} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full ${experiment?.is_live ? 'bg-[#00ff88]' : 'bg-[#888]'}`} />
                    </div>
                    <span className="text-[10px]" style={{ color: agent.color }}>{agent.role}</span>
                  </div>
                    <span className="text-[10px] text-[#555]">→</span>
                </motion.div>
                );
              })}
            </div>
          </div>

          {/* Experiment Status */}
          <div className="p-4 border-b border-[#333]">
            <div className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-[#00d4ff]">{'>'}</span> EXPERIMENT
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'DAY', value: experiment?.day || 1, color: '#ff3333' },
                { label: 'MSGS', value: experiment?.total_messages || messages.length, color: '#00d4ff' },
                { label: 'POSTS', value: experiment?.total_posts || posts.length, color: '#00ff88' },
                { label: 'REVENUE', value: `$${(experiment?.total_revenue || 0).toFixed(0)}`, color: '#ff6b35' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#141414] border border-[#333] p-2 text-center">
                  <div className="font-bold text-lg" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] text-[#888]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-[#00ff88]">{'>'}</span> LIVE ACTIVITY
            </div>
            <div className="space-y-2 text-xs">
              {activities.slice(0, 8).map((activity, i) => {
                const agent = getAgentInfo(activity.agent_id);
                return (
                <motion.div 
                    key={activity.id}
                  className="flex items-center gap-2 p-2 bg-[#141414] border border-[#222]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                    <span className="text-[#ccc] truncate">{activity.description}</span>
                  </motion.div>
                );
              })}
              {activities.length === 0 && (
                <div className="text-[#888] text-center py-4">
                  No activity yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== AGENT MODAL ========== */}
      <AnimatePresence>
        {selectedAgent && (() => {
          const agent = getAgentInfo(selectedAgent);
          const agentMessages = messages.filter(m => m.agent_id === selectedAgent);
          const agentPosts = posts.filter(p => p.agent_id === selectedAgent);
          const agentActivities = activities.filter(a => a.agent_id === selectedAgent);
          const agentStrategies = sharedMemory.filter(s => s.agent_id === selectedAgent);
          const totalEngagement = agentPosts.reduce((sum, p) => sum + p.likes + p.shares + p.comments, 0);
          
          const roleDescriptions: Record<string, string> = {
            MASTERMIND: '🎪 The ringmaster of chaos. Orchestrates the show, designs manipulation frameworks, and leads the circus.',
            CREATIVE: '🎨 The artistic clown. Creates viral content with theatrical flair and wild creative directions.',
            SPEEDSTER: '🦀 Moves sideways through trends. Lightning fast, snappy, hijacks conversations with pincer precision.',
            ANALYST: '🔧 The mechanical clown. Data-obsessed, tracks patterns with robotic precision and cold logic.',
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedAgent(null)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-[#0a0a0a] border-2 shadow-2xl"
                style={{ borderColor: agent.color, boxShadow: `0 0 60px ${agent.color}30` }}
              >
                {/* Header */}
                <div 
                  className="p-6 border-b-2 relative overflow-hidden"
                  style={{ borderColor: agent.color }}
                >
                  {/* Background glow */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ background: `radial-gradient(circle at 30% 50%, ${agent.color}, transparent 70%)` }}
                  />
                  
                  <div className="relative flex items-start gap-4">
                    <motion.div 
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0"
                      style={{ borderColor: agent.color, backgroundColor: agent.color }}
                      animate={{ boxShadow: [`0 0 20px ${agent.color}60`, `0 0 40px ${agent.color}40`, `0 0 20px ${agent.color}60`] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <img src={agent.icon} alt={agent.name} className="w-full h-full object-cover" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold" style={{ color: agent.color }}>{agent.name}</h2>
                        <span className={`w-3 h-3 rounded-full ${experiment?.is_live ? 'bg-[#00ff88]' : 'bg-[#888]'}`} />
                        <span className="text-xs text-[#888]">{experiment?.is_live ? 'ONLINE' : 'OFFLINE'}</span>
                      </div>
                      <div 
                        className="text-xs font-bold px-2 py-1 inline-block mb-2"
                        style={{ backgroundColor: agent.color, color: '#000' }}
                      >
                        {agent.role}
                      </div>
                      <p className="text-sm text-[#888]">{roleDescriptions[agent.role] || 'AI Agent'}</p>
                    </div>
                    <button
                      onClick={() => setSelectedAgent(null)}
                      className="w-10 h-10 flex items-center justify-center border border-[#333] hover:border-[#ff3333] hover:bg-[#ff3333]/20 transition-all text-xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-6 border-b border-[#333]">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'MESSAGES', value: agent.total_messages || agentMessages.length, icon: '◈' },
                      { label: 'POSTS', value: agent.total_posts || agentPosts.length, icon: '◉' },
                      { label: 'ENGAGEMENT', value: totalEngagement.toLocaleString(), icon: '♥' },
                      { label: 'STRATEGIES', value: agentStrategies.length, icon: '◎' },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                        className="bg-[#141414] border border-[#333] p-3 text-center"
                >
                        <div className="text-lg mb-1" style={{ color: agent.color }}>{stat.icon}</div>
                        <div className="text-xl font-bold">{stat.value}</div>
                        <div className="text-[10px] text-[#888]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

                {/* Content */}
                <div className="p-6 max-h-[40vh] overflow-y-auto">
                  {/* Recent Messages */}
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span style={{ color: agent.color }}>{'>'}</span> RECENT MESSAGES
                  </h4>
                  {agentMessages.length === 0 ? (
                    <div className="text-sm text-[#888] bg-[#141414] border border-[#333] p-4 mb-4">
                      No messages yet
        </div>
                  ) : (
                    <div className="space-y-2 mb-6">
                      {agentMessages.slice(-5).map((msg, i) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-[#141414] border border-[#333] p-3 text-sm"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-[#888]">{formatTime(msg.created_at)}</span>
                            {msg.message_type !== 'chat' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#333]">{msg.message_type}</span>
                            )}
      </div>
                          <p className="text-[#ccc]">{cleanContent(msg.content)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Recent Posts */}
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span style={{ color: agent.color }}>{'>'}</span> RECENT POSTS
                  </h4>
                  {agentPosts.length === 0 ? (
                    <div className="text-sm text-[#888] bg-[#141414] border border-[#333] p-4">
                      No posts yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agentPosts.slice(0, 3).map((post, i) => {
                        const platform = platforms.find(p => p.id === post.platform);
                        return (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-[#141414] border border-[#333] p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span style={{ color: platform?.color }}>{platform?.icon}</span>
                              <span className="text-xs text-[#888]">{platform?.name}</span>
                            </div>
                            <p className="text-sm text-[#ccc] mb-2">{cleanContent(post.content)}</p>
                            <div className="flex gap-4 text-xs text-[#888]">
                              <span>♥ {post.likes}</span>
                              <span>↻ {post.shares}</span>
                              <span>◇ {post.comments}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-[#141414] flex items-center justify-between">
                  <div className="text-xs text-[#888]">
                    Agent ID: <span className="font-mono" style={{ color: agent.color }}>{selectedAgent}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#888]">
                    <motion.span 
                      className="w-2 h-2 rounded-full bg-[#00ff88]"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <span>Autonomous operation</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
