'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Heart, Send, ArrowLeft, Gift, Share2, X, Radio, RefreshCw } from 'lucide-react';
import { MOCK_LIVE_STREAMS, MOCK_COMMENTS, formatCount } from '@/lib/constants';
import { LiveStream, ChatMessage } from '@/types';
import Avatar from '@/components/ui/Avatar';
import GiftModal from '@/components/ui/GiftModal';
import { useLiveChannel } from '@/lib/supabase/useLiveChannel';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { createClient } from '@/lib/supabase/client';

interface RealStream {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  title: string;
  viewer_count: number;
  started_at: string;
}

// Floating heart component
function FloatingHeart({ id, onRemove }: { id: number; onRemove: (id: number) => void }) {
  const x = Math.random() * 60 - 30;
  const emojis = ['❤️', '💕', '💖', '💗', '🧡', '💛', '💚', '💙', '💜'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <motion.div
      className="absolute bottom-0 right-4 text-2xl pointer-events-none"
      initial={{ opacity: 1, y: 0, x: 0 }}
      animate={{ opacity: 0, y: -300, x }}
      transition={{ duration: 3, ease: 'easeOut' }}
    >
      {emoji}
    </motion.div>
  );
}

// Live stream card for browse view — real streams
function RealStreamCard({ stream, onClick }: { stream: RealStream; onClick: () => void }) {
  const timeSince = () => {
    const diff = Date.now() - new Date(stream.started_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <motion.button
      className="relative rounded-2xl overflow-hidden group"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ background: '#111', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      {/* Placeholder for live stream — gradient background */}
      <div style={{
        width: '100%', aspectRatio: '3/4',
        background: `linear-gradient(135deg, hsl(${Math.abs(stream.user_id.charCodeAt(0) * 7) % 360}, 60%, 25%), hsl(${Math.abs(stream.user_id.charCodeAt(1) * 11) % 360}, 50%, 20%))`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', border: '3px solid #ef4444',
          overflow: 'hidden', boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
        }}>
          <img src={stream.avatar_url || `https://i.pravatar.cc/150?u=${stream.user_id}`}
            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)', fontSize: '0.7rem', color: '#fff', fontWeight: 600,
        }}>
          📺 Tap to watch
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Live badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="live-badge flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 text-[11px] font-medium">
          <Eye size={10} />
          {stream.viewer_count || 0}
        </span>
      </div>

      {/* Time */}
      <div className="absolute top-3 right-3">
        <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.5)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>
          {timeSince()}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ef4444' }}>
            <img src={stream.avatar_url || `https://i.pravatar.cc/150?u=${stream.user_id}`}
              alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="text-xs font-semibold truncate">{stream.username}</span>
        </div>
        <p className="text-xs text-white/80 line-clamp-1">{stream.title}</p>
      </div>
    </motion.button>
  );
}

// Mock stream card (fallback)
function LiveStreamCard({ stream, onClick }: { stream: LiveStream; onClick: () => void }) {
  return (
    <motion.button
      className="relative rounded-2xl overflow-hidden group"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <img src={stream.thumbnail_url} alt={stream.title} className="w-full aspect-[3/4] object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="live-badge flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 text-[11px] font-medium">
          <Eye size={10} />{formatCount(stream.viewer_count)}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar src={stream.user.avatar_url} alt={stream.user.username} size="xs" live />
          <span className="text-xs font-semibold truncate">{stream.user.username}</span>
        </div>
        <p className="text-xs text-white/80 line-clamp-1">{stream.title}</p>
      </div>
    </motion.button>
  );
}

export default function LivePage() {
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [selectedRealStream, setSelectedRealStream] = useState<RealStream | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [realStreams, setRealStreams] = useState<RealStream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);

  const heartIdRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { profile } = useProfile();

  // Fetch real live streams from Supabase
  const fetchStreams = useCallback(async () => {
    setLoadingStreams(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('is_live', true)
      .order('started_at', { ascending: false });

    if (data && data.length > 0) {
      setRealStreams(data);
    } else {
      setRealStreams([]);
    }
    setLoadingStreams(false);
  }, []);

  useEffect(() => {
    fetchStreams();
    // Poll every 10 seconds for new streams
    const poll = setInterval(fetchStreams, 10000);
    return () => clearInterval(poll);
  }, [fetchStreams]);

  // Supabase Realtime for viewing a real stream
  const { messages: realtimeMessages, viewerCount, sendMessage: sendRealtimeMsg, isConnected } = useLiveChannel({
    roomId: selectedRealStream?.id || '',
    userId: user?.id || `viewer-${Date.now()}`,
    username: profile.username || 'Viewer',
    avatar_url: profile.avatar_url || '',
    role: 'viewer',
  });

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [realtimeMessages]);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h !== id));
  }, []);

  const addHeart = () => {
    heartIdRef.current++;
    setHearts(prev => [...prev, heartIdRef.current]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (selectedRealStream) {
      sendRealtimeMsg(newMessage);
    }
    setNewMessage('');
  };

  // ── Watching a REAL stream ──
  if (selectedRealStream) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Video area — placeholder for now */}
        <div className="flex-1 relative overflow-hidden">
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, hsl(${Math.abs(selectedRealStream.user_id.charCodeAt(0) * 7) % 360}, 60%, 15%), hsl(${Math.abs(selectedRealStream.user_id.charCodeAt(1) * 11) % 360}, 50%, 10%))`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', border: '3px solid #ef4444',
              overflow: 'hidden', boxShadow: '0 4px 30px rgba(239,68,68,0.4)',
            }}>
              <img src={selectedRealStream.avatar_url || `https://i.pravatar.cc/150?u=${selectedRealStream.user_id}`}
                alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>@{selectedRealStream.username}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              {isConnected ? '🔴 Live — Audio/video coming in Phase 2 (LiveKit)' : 'Connecting...'}
            </p>
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedRealStream(null)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ef4444' }}>
                  <img src={selectedRealStream.avatar_url || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p className="text-xs font-bold">{selectedRealStream.username}</p>
                  <p className="text-[10px] text-white/40">{selectedRealStream.title}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="live-badge text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 text-[11px] font-medium">
                <Eye size={10} />{viewerCount}
              </span>
            </div>
          </div>

          {/* Hearts */}
          <div className="absolute bottom-28 right-3 w-12 h-64 z-20">
            <AnimatePresence>
              {hearts.map(id => <FloatingHeart key={id} id={id} onRemove={removeHeart} />)}
            </AnimatePresence>
          </div>

          {/* Chat messages — real-time from Supabase */}
          <div className="absolute bottom-24 left-0 right-16 z-20 max-h-[35vh] px-3">
            <div ref={chatRef} className="overflow-y-auto max-h-[35vh] flex flex-col gap-1 no-scrollbar">
              <motion.div
                style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '4px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.2)', maxWidth: '85%' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Welcome to {selectedRealStream.username}'s live!</span>
              </motion.div>
              {realtimeMessages.map(msg => (
                <motion.div
                  key={msg.id}
                  className="inline-flex items-baseline gap-1 px-2 py-1 rounded-xl bg-black/35 backdrop-blur-sm max-w-[85%]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {msg.type === 'join' ? (
                    <span className="text-[11px] text-green-400">👋 <b>{msg.username}</b> {msg.text}</span>
                  ) : (
                    <>
                      <span className="text-[11px] font-bold text-pink-400 whitespace-nowrap">{msg.username}</span>
                      <span className="text-[11px] text-white/85">{msg.text}</span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom input */}
        <div className="p-3 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              className="flex-1 bg-transparent border-none outline-none text-white text-sm"
              placeholder="Say something..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: newMessage.trim() ? '#ef4444' : 'rgba(255,255,255,0.08)' }}
          >
            <Send size={16} color={newMessage.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
          </button>
          <button onClick={addHeart} className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Heart size={16} color="#ef4444" fill="#ef4444" />
          </button>
        </div>
      </div>
    );
  }

  // ── Watching a MOCK stream (fallback) ──
  if (selectedStream) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden">
          <img src={selectedStream.thumbnail_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedStream(null)} className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Avatar src={selectedStream.user.avatar_url} alt="" size="sm" live />
                <div>
                  <p className="text-xs font-bold">{selectedStream.user.display_name}</p>
                  <p className="text-[10px] text-white/40">{selectedStream.title}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="live-badge text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 text-[11px] font-medium">
                <Eye size={10} />{formatCount(selectedStream.viewer_count)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-3 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <input className="flex-1 bg-transparent border-none outline-none text-white text-sm" placeholder="Say something..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Heart size={16} color="#ef4444" fill="#ef4444" />
          </button>
        </div>
      </div>
    );
  }

  // ── Browse streams ──
  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Live Now</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {realStreams.length > 0 ? `${realStreams.length} real stream${realStreams.length > 1 ? 's' : ''} live` : 'Watch live streams'}
          </p>
        </div>
        <button
          onClick={fetchStreams}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Real streams from Supabase */}
      {realStreams.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400">LIVE ON VOXO</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {realStreams.map(stream => (
              <RealStreamCard key={stream.id} stream={stream} onClick={() => setSelectedRealStream(stream)} />
            ))}
          </div>
        </div>
      )}

      {loadingStreams && realStreams.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.2)', borderTopColor: '#ef4444' }}
          />
        </div>
      )}

      {/* Divider */}
      {realStreams.length > 0 && (
        <div style={{ padding: '0 16px', margin: '8px 0 16px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 8 }}>Mock streams below</p>
        </div>
      )}

      {/* Mock streams */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-2">
          {MOCK_LIVE_STREAMS.map(stream => (
            <LiveStreamCard key={stream.id} stream={stream} onClick={() => setSelectedStream(stream)} />
          ))}
        </div>
      </div>
    </div>
  );
}
