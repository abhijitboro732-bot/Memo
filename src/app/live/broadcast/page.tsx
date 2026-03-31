'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mic, MicOff, Camera, CameraOff, RotateCcw,
  Eye, Heart, Send, Radio, Zap, Pin,
  UserMinus, MessageCircle
} from 'lucide-react';
import { formatCount } from '@/lib/constants';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
import { useLiveChannel } from '@/lib/supabase/useLiveChannel';
import { createClient } from '@/lib/supabase/client';

/* ── Floating Heart ───────────────────────── */
function FloatingHeart({ id, onRemove }: { id: number; onRemove: (id: number) => void }) {
  const x = Math.random() * 50 - 25;
  const emojis = ['❤️', '💕', '💖', '🧡', '💛', '💚', '💙', '💜', '🔥', '✨'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  useEffect(() => { const t = setTimeout(() => onRemove(id), 3000); return () => clearTimeout(t); }, [id, onRemove]);
  return (
    <motion.div
      style={{ position: 'absolute', bottom: 0, right: `${Math.random() * 30}px`, fontSize: '1.5rem', pointerEvents: 'none' }}
      initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      animate={{ opacity: 0, y: -250, x, scale: 0.5 }}
      transition={{ duration: 2.5, ease: 'easeOut' }}
    >{emoji}</motion.div>
  );
}

export default function BroadcastPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'setup' | 'live' | 'ended'>('setup');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [streamTitle, setStreamTitle] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [duration, setDuration] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [totalViewers, setTotalViewers] = useState(0);
  const [streamId] = useState(() => `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const heartIdRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Supabase Realtime channel for chat + presence
  const { messages, viewerCount, sendMessage: sendRealtimeMessage, isConnected } = useLiveChannel({
    roomId: phase === 'live' ? streamId : '',
    userId: user?.id || 'anon',
    username: profile.username || 'Broadcaster',
    avatar_url: profile.avatar_url || '',
    role: 'broadcaster',
  });

  // Track total viewers
  useEffect(() => {
    setTotalViewers(prev => Math.max(prev, viewerCount));
  }, [viewerCount]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    return () => {
      document.body.style.overflow = '';
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [startCamera]);

  // Duration timer
  useEffect(() => {
    if (phase !== 'live') return;
    durationRef.current = setInterval(() => setDuration(p => p + 1), 1000);
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [phase]);

  // Heart animation from viewers
  useEffect(() => {
    if (phase !== 'live') return;
    const heartInt = setInterval(() => {
      if (viewerCount > 0) {
        heartIdRef.current++;
        setHearts(p => [...p, heartIdRef.current]);
      }
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(heartInt);
  }, [phase, viewerCount]);

  // Auto-scroll chat
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const removeHeart = useCallback((id: number) => setHearts(p => p.filter(h => h !== id)), []);
  const toggleMute = () => { if (streamRef.current) { streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; }); setIsMuted(!isMuted); } };
  const toggleCamera = () => { if (streamRef.current) { streamRef.current.getVideoTracks().forEach(t => { t.enabled = isCameraOff; }); setIsCameraOff(!isCameraOff); } };
  const flipCamera = () => setFacingMode(f => f === 'user' ? 'environment' : 'user');

  const goLive = async () => {
    setPhase('live');
    setDuration(0);

    // Register stream in Supabase live_streams table
    if (user) {
      const supabase = createClient();
      await supabase.from('live_streams').insert({
        id: streamId,
        user_id: user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        title: streamTitle || 'Live Video',
        is_live: true,
      });

      // Notify all followers that we're live
      import('@/lib/supabase/notifications').then(({ notifyFollowersLive }) => {
        notifyFollowersLive(user.id, profile.display_name || profile.username);
      });
    }
  };

  const endStream = async () => {
    setPhase('ended');
    if (durationRef.current) clearInterval(durationRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }

    // Update stream status in Supabase
    if (user) {
      const supabase = createClient();
      await supabase.from('live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString(), viewer_count: totalViewers })
        .eq('id', streamId);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendRealtimeMessage(newMessage);
    setNewMessage('');
  };

  const addHeart = () => { heartIdRef.current++; setHearts(p => [...p, heartIdRef.current]); };
  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  // Shared styles
  const S = {
    page: { position: 'fixed' as const, inset: 0, zIndex: 9999, background: '#000', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif" },
    videoWrap: { flex: 1, position: 'relative' as const, overflow: 'hidden', background: '#111' },
    video: { width: '100%', height: '100%', objectFit: 'cover' as const, transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' },
    setupOverlay: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 },
    setupBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.9rem', maxWidth: 320, width: '88%', textAlign: 'center' as const },
    setupIcon: { width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #ff2d55, #ff6090)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 30px rgba(255,45,85,0.4)' },
    setupTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 },
    setupSub: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: '-0.3rem 0 0' },
    setupInput: { width: '100%', padding: '0.7rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const },
    setupCtrls: { display: 'flex', gap: '0.75rem' },
    ctrlBtn: { width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    goBtn: { width: '100%', padding: '0.85rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ff2d55, #ff6090)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 6px 25px rgba(255,45,85,0.35)' },
    cancelBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', cursor: 'pointer' },
    closeBtn: { position: 'absolute' as const, top: 16, right: 16, zIndex: 50, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    hudTop: { position: 'absolute' as const, top: 0, left: 0, right: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' },
    badge: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em' },
    badgeDot: { width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s ease-in-out infinite' },
    pill: { padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 },
    endBtn: { padding: '4px 12px', borderRadius: 6, background: '#ef4444', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
    hostPill: { position: 'absolute' as const, top: 56, left: 12, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', borderRadius: 24, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' },
    hostAvatar: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid #ef4444' },
    chatArea: { position: 'absolute' as const, bottom: 100, left: 0, right: 60, zIndex: 20, maxHeight: '35vh', padding: '0 12px' },
    chatScroll: { overflowY: 'auto' as const, maxHeight: '35vh', display: 'flex', flexDirection: 'column' as const, gap: 3, scrollbarWidth: 'none' as const },
    chatMsg: { display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '4px 8px', borderRadius: 12, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', maxWidth: '85%' },
    chatUser: { fontSize: '0.7rem', fontWeight: 700, color: '#ff6090', whiteSpace: 'nowrap' as const },
    chatText: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)' },
    heartsArea: { position: 'absolute' as const, bottom: 120, right: 10, zIndex: 20, width: 50, height: 250 },
    bottomBar: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, zIndex: 30, padding: 12, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', display: 'flex', flexDirection: 'column' as const, gap: 10 },
    inputWrap: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' },
    input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.8rem' },
    sendBtn: { background: 'none', border: 'none', cursor: 'pointer' },
    btnsRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
    ctrlCircle: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    endPage: { position: 'fixed' as const, inset: 0, zIndex: 9999, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" },
    endCard: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', textAlign: 'center' as const },
  };

  /* ── END SCREEN ─────────────── */
  if (phase === 'ended') {
    return (
      <div style={S.endPage}>
        <motion.div style={S.endCard} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ ...S.setupIcon, background: 'rgba(255,255,255,0.06)' }}><Radio size={32} color="rgba(255,255,255,0.5)" /></div>
          <h2 style={{ ...S.setupTitle, fontSize: '1.4rem' }}>Live Ended</h2>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}><Eye size={14} />{totalViewers} viewers</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}><MessageCircle size={14} />{messages.length} comments</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}><Heart size={14} />{heartIdRef.current} reactions</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Duration: {fmt(duration)}</p>
          <motion.button style={S.goBtn} onClick={() => router.push('/profile')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            Back to Profile
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.videoWrap}>
        {/* Camera feed */}
        <video ref={videoRef} autoPlay playsInline muted style={{ ...S.video, display: isCameraOff ? 'none' : 'block' }} />
        {isCameraOff && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
            <CameraOff size={48} /><p>Camera is off</p>
          </div>
        )}
        {cameraError && !isCameraOff && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
            <CameraOff size={48} /><p style={{ fontSize: '0.8rem' }}>{cameraError}</p>
            <button style={{ ...S.ctrlBtn, width: 'auto', padding: '6px 16px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }} onClick={startCamera}><RotateCcw size={14} /> Retry</button>
          </div>
        )}

        {/* SETUP OVERLAY */}
        <AnimatePresence>
          {phase === 'setup' && (
            <motion.div style={S.setupOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={S.setupBox}>
                <div style={S.setupIcon}><Radio size={28} /></div>
                <h2 style={S.setupTitle}>Go Live</h2>
                <p style={S.setupSub}>Your followers will be notified</p>
                <input style={S.setupInput} placeholder="Add a title..." value={streamTitle} onChange={e => setStreamTitle(e.target.value)} maxLength={60} />
                <div style={S.setupCtrls}>
                  <button style={S.ctrlBtn} onClick={toggleMute}>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}</button>
                  <button style={S.ctrlBtn} onClick={toggleCamera}>{isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}</button>
                  <button style={S.ctrlBtn} onClick={flipCamera}><RotateCcw size={20} /></button>
                </div>
                <motion.button style={S.goBtn} onClick={goLive} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Zap size={18} /> Go Live
                </motion.button>
                <button style={S.cancelBtn} onClick={() => router.push('/profile')}>Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE HUD */}
        {phase === 'live' && (
          <>
            {/* Connection indicator */}
            {!isConnected && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.7)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
                Connecting to chat...
              </div>
            )}

            {/* Top bar */}
            <div style={S.hudTop}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={S.badge}><span style={S.badgeDot} />LIVE</div>
                <div style={S.pill}>{fmt(duration)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={S.pill}><Eye size={13} />{formatCount(viewerCount)}</div>
                <button style={S.endBtn} onClick={endStream}>End</button>
              </div>
            </div>

            {/* Host */}
            <div style={S.hostPill}>
              <img src={profile.avatar_url} alt="" style={S.hostAvatar} />
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', margin: 0 }}>{profile.display_name}</p>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{streamTitle || 'Live Video'}</p>
              </div>
            </div>

            {/* Hearts */}
            <div style={S.heartsArea}>
              <AnimatePresence>{hearts.map(id => <FloatingHeart key={id} id={id} onRemove={removeHeart} />)}</AnimatePresence>
            </div>

            {/* Chat — Real-time messages from Supabase */}
            <div style={S.chatArea}>
              <div ref={chatRef} style={S.chatScroll}>
                {/* System message */}
                <motion.div style={{ ...S.chatMsg, background: 'rgba(139,92,246,0.2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span style={{ ...S.chatText, color: '#a78bfa' }}>🔴 You are now live! Chat messages will appear here.</span>
                </motion.div>
                {messages.map(msg => (
                  <motion.div key={msg.id} style={S.chatMsg} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                    {msg.type === 'join' ? (
                      <span style={{ ...S.chatText, color: '#22c55e' }}>👋 <b>{msg.username}</b> {msg.text}</span>
                    ) : (
                      <>
                        <span style={{ ...S.chatUser, color: msg.userId === user?.id ? '#a78bfa' : '#ff6090' }}>{msg.username}</span>
                        <span style={S.chatText}>{msg.text}</span>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom controls */}
            <div style={S.bottomBar}>
              <div style={S.inputWrap}>
                <input style={S.input} placeholder="Comment..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                <button style={{ ...S.sendBtn, color: newMessage.trim() ? '#ff2d55' : 'rgba(255,255,255,0.2)' }} onClick={handleSendMessage}><Send size={16} /></button>
              </div>
              <div style={S.btnsRow}>
                <button style={S.ctrlCircle} onClick={toggleMute}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>
                <button style={S.ctrlCircle} onClick={toggleCamera}>{isCameraOff ? <CameraOff size={18} /> : <Camera size={18} />}</button>
                <button style={S.ctrlCircle} onClick={flipCamera}><RotateCcw size={18} /></button>
                <button style={{ ...S.ctrlCircle, color: '#ff2d55' }} onClick={addHeart}><Heart size={18} fill="currentColor" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Close X (setup only) */}
      {phase === 'setup' && <button style={S.closeBtn} onClick={() => router.push('/profile')}><X size={20} /></button>}

      <style jsx global>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
