'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Heart, Send, ArrowLeft } from 'lucide-react';
import { useLiveChannel } from '@/lib/supabase/useLiveChannel';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { createClient } from '@/lib/supabase/client';

export const runtime = 'edge';

interface RealStream {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  title: string;
  viewer_count: number;
}

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

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;

  const [stream, setStream] = useState<RealStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [hearts, setHearts] = useState<number[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const heartIdRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (!streamId) return;
    const loadStream = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('live_streams').select('*').eq('id', streamId).single();
      if (data) setStream(data);
      setLoading(false);
    };
    loadStream();
  }, [streamId]);

  const { messages: realtimeMessages, viewerCount, sendMessage: sendRealtimeMsg, isConnected } = useLiveChannel({
    roomId: stream?.id || '',
    userId: user?.id || `viewer-${Date.now()}`,
    username: profile?.username || 'Viewer',
    avatar_url: profile?.avatar_url || '',
    role: 'viewer',
  });

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
    if (!newMessage.trim() || !stream) return;
    sendRealtimeMsg(newMessage);
    setNewMessage('');
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading Broadcast...</div>;
  if (!stream) return <div className="h-screen bg-black flex items-center justify-center text-white flex-col gap-4"><h2>Broadcast Ended or Not Found</h2><button onClick={() => router.back()} className="px-4 py-2 bg-neutral-800 rounded">Go Back</button></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(135deg, hsl(${Math.abs(stream.user_id.charCodeAt(0) * 7) % 360}, 60%, 15%), hsl(${Math.abs(stream.user_id.charCodeAt(1) * 11) % 360}, 50%, 10%))`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', border: '3px solid #ef4444',
            overflow: 'hidden', boxShadow: '0 4px 30px rgba(239,68,68,0.4)',
          }}>
            <img src={stream.avatar_url || `https://i.pravatar.cc/150?u=${stream.user_id}`}
              alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>@{stream.username}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            {isConnected ? '🔴 Live — Audio/video connecting...' : 'Connecting to host...'}
          </p>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ef4444' }}>
                <img src={stream.avatar_url || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{stream.username}</p>
                <p className="text-[10px] text-white/40">{stream.title}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="live-badge text-[10px] flex items-center gap-1 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 text-[11px] font-medium text-white">
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

        {/* Chat messages */}
        <div className="absolute bottom-24 left-0 right-16 z-20 max-h-[35vh] px-3">
          <div ref={chatRef} className="overflow-y-auto max-h-[35vh] flex flex-col gap-1 no-scrollbar">
            <motion.div
              style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '4px 8px', borderRadius: 12, background: 'rgba(139,92,246,0.2)', maxWidth: '85%' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Welcome to {stream.username}'s live!</span>
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
