'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SkipForward, Heart, Flag, Gift, Video, VideoOff,
  Mic, MicOff, Phone, Sparkles, MessageCircle, Send,
  UserPlus, Check, X, AlertTriangle, Users, Wifi, WifiOff
} from 'lucide-react';
import GiftModal from '@/components/ui/GiftModal';
import { MOCK_USERS } from '@/lib/constants';
import { fetchRealUsers } from '@/lib/supabase/users';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { RandomMatchmaker, WebRTCSignaling, createPeerConnection, QueueUser } from '@/lib/supabase/randomChat';
import type { User, Gift as GiftType } from '@/types';

type MatchStatus = 'idle' | 'searching' | 'connected' | 'ended';
type Stranger = User & { interests: string[] };

// Fallback mock strangers (only used if no real users in DB)
const FALLBACK_STRANGERS: Stranger[] = MOCK_USERS.map((u, i) => ({
  ...u,
  interests: [
    ['Dance', 'Music', 'Fashion'][i % 3],
    ['Travel', 'Food', 'Art'][i % 3],
    ['Fitness', 'Gaming', 'Tech'][i % 3],
  ],
}));

// Extract interests from bio text
function extractInterests(bio: string): string[] {
  const tags: string[] = [];
  const emojiMap: Record<string, string> = {
    '💃': 'Dance', '🎵': 'Music', '✈️': 'Travel', '📸': 'Photography',
    '👩‍🍳': 'Cooking', '🍕': 'Food', '💪': 'Fitness', '🏋️': 'Fitness',
    '🎨': 'Art', '✨': 'Creative', '😂': 'Comedy', '🎬': 'Film',
    '🚀': 'Tech', '🎮': 'Gaming', '🎧': 'Music', '🌍': 'Travel',
    '🏔️': 'Adventure', '💎': 'Fashion', '📱': 'Tech', '🎤': 'Music',
  };
  for (const [emoji, tag] of Object.entries(emojiMap)) {
    if (bio.includes(emoji)) tags.push(tag);
  }
  // Also check keywords
  const keywords = ['dance', 'music', 'travel', 'food', 'cook', 'fitness', 'art', 'game', 'code', 'fashion', 'photo'];
  for (const kw of keywords) {
    if (bio.toLowerCase().includes(kw)) {
      const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
      if (!tags.includes(cap)) tags.push(cap);
    }
  }
  if (tags.length === 0) tags.push('Voxo', 'Social', 'Fun');
  return tags.slice(0, 3);
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function RandomPage() {
  const [status, setStatus] = useState<MatchStatus>('idle');
  const [showGifts, setShowGifts] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [matchDuration, setMatchDuration] = useState(0);
  const [searchDots, setSearchDots] = useState('');
  const [matchedUser, setMatchedUser] = useState<Stranger | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [giftToast, setGiftToast] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(350);
  const [matchHistory, setMatchHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{ text: string; isMe: boolean; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [strangersPool, setStrangersPool] = useState<Stranger[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [connectionMode, setConnectionMode] = useState<'real' | 'mock'>('mock');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const matchmakerRef = useRef<RandomMatchmaker | null>(null);
  const signalingRef = useRef<WebRTCSignaling | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set random online count client-side to avoid hydration mismatch
  useEffect(() => {
    setOnlineCount(Math.floor(Math.random() * 500) + 200);
  }, []);

  // Fetch real users from posts table
  useEffect(() => {
    fetchRealUsers(50).then(users => {
      if (users.length > 0) {
        const realUsers: Stranger[] = users
          .filter(u => u.id !== user?.id)
          .map(u => ({
            ...u,
            interests: extractInterests(u.bio || ''),
          }));
        setStrangersPool([...realUsers, ...FALLBACK_STRANGERS]);
      } else {
        setStrangersPool(FALLBACK_STRANGERS);
      }
      setLoadingPool(false);
    });
  }, [user]);

  // Animate search dots
  useEffect(() => {
    if (status === 'searching') {
      const interval = setInterval(() => {
        setSearchDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Match duration timer
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setMatchDuration(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Start real camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      // Camera not available
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (matchmakerRef.current) matchmakerRef.current.cleanup();
      if (signalingRef.current) signalingRef.current.cleanup();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  // Toggle video track
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoEnabled; });
    }
  }, [isVideoEnabled]);

  // Toggle audio track
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = isAudioEnabled; });
    }
  }, [isAudioEnabled]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, strangerTyping]);

  const getRandomStranger = useCallback(() => {
    const pool = strangersPool.length > 0 ? strangersPool : FALLBACK_STRANGERS;
    const available = pool.filter(s => !matchHistory.includes(s.id));
    const finalPool = available.length > 0 ? available : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }, [matchHistory, strangersPool]);

  // Clean up WebRTC and signaling
  const cleanupConnection = useCallback(() => {
    if (signalingRef.current) {
      signalingRef.current.sendLeave();
      signalingRef.current.cleanup();
      signalingRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (matchmakerRef.current) {
      matchmakerRef.current.cleanup();
      matchmakerRef.current = null;
    }
    setHasRemoteVideo(false);
  }, []);

  // Setup WebRTC connection after match
  const setupWebRTC = useCallback(async (roomId: string, isInitiator: boolean) => {
    if (!streamRef.current) return;

    const signaling = new WebRTCSignaling(roomId, user?.id || 'anon');
    signalingRef.current = signaling;

    const pc = createPeerConnection(
      signaling,
      streamRef.current,
      (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setHasRemoteVideo(true);
        }
      },
      isInitiator,
    );
    pcRef.current = pc;

    await signaling.connect({
      onOffer: async (offer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signaling.sendAnswer(answer);
      },
      onAnswer: async (answer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      },
      onIceCandidate: async (candidate) => {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      },
      onChatMessage: (msg) => {
        setChatMessages(prev => [...prev, { text: msg.text, isMe: false, time: msg.time }]);
      },
      onPartnerLeft: () => {
        setStatus('ended');
        cleanupConnection();
      },
    });
  }, [user, cleanupConnection]);

  const startSearching = useCallback(async () => {
    setStatus('searching');
    setMatchDuration(0);
    setIsLiked(false);
    setShowReport(false);
    setReportSent(false);
    setChatMessages([]);
    setShowChat(false);
    setHasRemoteVideo(false);
    cleanupConnection();
    await startCamera();

    // Try real matching if user is logged in
    if (user) {
      setConnectionMode('real');
      const matchmaker = new RandomMatchmaker(
        user.id,
        profile.username || 'User',
        profile.avatar_url || '',
        {
          onMatched: async (roomId, partner) => {
            const stranger: Stranger = {
              id: partner.userId,
              username: partner.username,
              display_name: partner.username,
              avatar_url: partner.avatar_url || `https://i.pravatar.cc/150?u=${partner.userId}`,
              bio: '',
              followers_count: 0, following_count: 0, likes_count: 0,
              is_verified: false, is_live: false, created_at: '',
              interests: ['Voxo', 'Social'],
            };
            setMatchedUser(stranger);
            setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
            setStatus('connected');
            // Setup WebRTC
            const isInitiator = user.id < partner.userId;
            await setupWebRTC(roomId, isInitiator);
          },
          onQueueUpdate: (count) => {
            setQueueCount(count);
            setOnlineCount(Math.max(count, onlineCount));
          },
        },
      );
      matchmakerRef.current = matchmaker;
      await matchmaker.joinQueue();

      // Fallback to mock after 15 seconds if no match
      setTimeout(() => {
        if (status === 'searching') {
          setConnectionMode('mock');
          matchmaker.cleanup();
          const stranger = getRandomStranger();
          setMatchedUser(stranger);
          setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
          setStatus('connected');
        }
      }, 15000);
    } else {
      // No auth — mock matching
      setConnectionMode('mock');
      setTimeout(() => {
        const stranger = getRandomStranger();
        setMatchedUser(stranger);
        setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
        setStatus('connected');
      }, 2000 + Math.random() * 2000);
    }
  }, [startCamera, getRandomStranger, user, profile, setupWebRTC, cleanupConnection, status, onlineCount]);

  const skipMatch = useCallback(() => {
    cleanupConnection();
    setStatus('searching');
    setMatchDuration(0);
    setIsLiked(false);
    setChatMessages([]);
    setHasRemoteVideo(false);

    if (user && connectionMode === 'real') {
      // Re-join queue for real matching
      const matchmaker = new RandomMatchmaker(
        user.id, profile.username || 'User', profile.avatar_url || '',
        {
          onMatched: async (roomId, partner) => {
            const stranger: Stranger = {
              id: partner.userId, username: partner.username, display_name: partner.username,
              avatar_url: partner.avatar_url || `https://i.pravatar.cc/150?u=${partner.userId}`,
              bio: '', followers_count: 0, following_count: 0, likes_count: 0,
              is_verified: false, is_live: false, created_at: '', interests: ['Voxo', 'Social'],
            };
            setMatchedUser(stranger);
            setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
            setStatus('connected');
            const isInitiator = user.id < partner.userId;
            await setupWebRTC(roomId, isInitiator);
          },
          onQueueUpdate: (count) => setQueueCount(count),
        },
      );
      matchmakerRef.current = matchmaker;
      matchmaker.joinQueue();
      // Fallback to mock
      setTimeout(() => {
        if (status === 'searching') {
          matchmaker.cleanup();
          const stranger = getRandomStranger();
          setMatchedUser(stranger); setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
          setStatus('connected');
        }
      }, 10000);
    } else {
      setTimeout(() => {
        const stranger = getRandomStranger();
        setMatchedUser(stranger);
        setMatchHistory(prev => [...prev.slice(-5), stranger.id]);
        setStatus('connected');
      }, 1500 + Math.random() * 2000);
    }
  }, [getRandomStranger, cleanupConnection, user, profile, connectionMode, setupWebRTC, status]);

  const endCall = useCallback(() => {
    cleanupConnection();
    setStatus('ended');
    setMatchDuration(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [cleanupConnection]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { text: chatInput, isMe: true, time }]);

    // Send via WebRTC signaling if connected
    if (signalingRef.current && connectionMode === 'real') {
      signalingRef.current.sendChat(chatInput, profile.username || 'You');
    } else {
      // Simulate reply for mock connections
      setTimeout(() => {
        setStrangerTyping(true);
        setTimeout(() => {
          setStrangerTyping(false);
          const replies = ['That\'s cool! 😄', 'Haha nice 😂', 'Tell me more!', 'Awesome! ✨', 'Same here! 🙌', 'For real? 🤩'];
          setChatMessages(prev => [...prev, {
            text: replies[Math.floor(Math.random() * replies.length)],
            isMe: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        }, 1500 + Math.random() * 2000);
      }, 1000);
    }
    setChatInput('');
  };

  const handleSendGift = (gift: GiftType) => {
    setGiftToast(`Sent ${gift.icon} ${gift.name} to ${matchedUser?.display_name}!`);
    setTimeout(() => setGiftToast(null), 2500);
    setChatMessages(prev => [...prev, {
      text: `Sent a ${gift.icon} ${gift.name}!`,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const handleReport = () => {
    setReportSent(true);
    setTimeout(() => { setShowReport(false); skipMatch(); }, 1500);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ height: '100dvh', background: 'var(--background)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Remote Area ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {status === 'connected' && matchedUser ? (
          <>
            {/* Remote video (WebRTC) or avatar placeholder */}
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Remote video element */}
              <video ref={remoteVideoRef} autoPlay playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  position: 'absolute', inset: 0,
                  display: hasRemoteVideo ? 'block' : 'none',
                }} />

              {/* Avatar fallback when no remote video */}
              {!hasRemoteVideo && (
                <motion.div
                  style={{ textAlign: 'center', zIndex: 2 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <motion.div
                    style={{
                      width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
                      overflow: 'hidden', border: `3px solid ${connectionMode === 'real' ? 'rgba(34,197,94,0.5)' : 'rgba(139,92,246,0.4)'}`,
                      boxShadow: `0 0 40px ${connectionMode === 'real' ? 'rgba(34,197,94,0.2)' : 'rgba(139,92,246,0.2)'}`,
                    }}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <img src={matchedUser.avatar_url} alt={matchedUser.display_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{matchedUser.display_name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '4px 0' }}>@{matchedUser.username}</p>
                  {connectionMode === 'real' && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                      padding: '4px 12px', borderRadius: 12,
                      background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    }}>
                      <Wifi size={12} color="#22c55e" />
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#22c55e' }}>Real User • WebRTC</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    {matchedUser.interests.map(tag => (
                      <span key={tag} style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 600,
                        background: 'rgba(139,92,246,0.15)', color: 'rgba(139,92,246,0.9)',
                        border: '1px solid rgba(139,92,246,0.2)',
                      }}>{tag}</span>
                    ))}
                  </div>
                  {connectionMode === 'mock' && (
                    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{formatCount(matchedUser.followers_count)}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Followers</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{formatCount(matchedUser.likes_count)}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Likes</p>
                      </div>
                    </div>
                  )}
                  {matchedUser.is_verified && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                      fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600,
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>✓</span>
                      Verified Creator
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Duration badge */}
            <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
              <motion.div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
                  borderRadius: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{formatDuration(matchDuration)}</span>
              </motion.div>
            </div>

            {/* Online users count */}
            <div style={{ position: 'absolute', top: 70, left: 16, zIndex: 30 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500,
              }}>
                <Users size={12} /> {onlineCount} online
              </div>
            </div>
          </>

        ) : status === 'searching' ? (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f2e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div style={{ textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 24px' }}>
                <motion.div
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)' }}
                  animate={{ scale: [1, 1.6, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(236,72,153,0.3)' }}
                  animate={{ scale: [1, 1.6, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <motion.div
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)' }}
                  animate={{ scale: [1, 1.6, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <div style={{
                  position: 'absolute', inset: 20, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={36} color="#8b5cf6" />
                </div>
              </div>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Finding someone{searchDots}</p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                {onlineCount} people online now
              </p>
            </motion.div>
          </div>

        ) : status === 'ended' ? (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f2e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div style={{ textAlign: 'center', padding: 32 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Call Ended</p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
                {matchedUser ? `Chat with ${matchedUser.display_name} ended` : 'Session ended'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <motion.button
                  onClick={startSearching}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 28px', borderRadius: 16, fontWeight: 700, fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff',
                    border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(139,92,246,0.3)',
                  }}
                >
                  New Match
                </motion.button>
                <motion.button
                  onClick={() => setStatus('idle')}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 28px', borderRadius: 16, fontWeight: 600, fontSize: '0.9rem',
                    background: 'rgba(255,255,255,0.08)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                  }}
                >
                  Home
                </motion.button>
              </div>
            </motion.div>
          </div>

        ) : (
          /* ── Idle Screen ── */
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f2e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div style={{ textAlign: 'center', padding: 32 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Video size={34} color="#8b5cf6" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Random Video Chat</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8, maxWidth: 280 }}>
                Connect with interesting people from around the world instantly
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(139,92,246,0.8)', marginBottom: 28, fontWeight: 600 }}>
                🟢 {onlineCount} people online now
              </p>
              <motion.button
                onClick={startSearching}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '14px 40px', borderRadius: 20, fontWeight: 800, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff',
                  border: 'none', cursor: 'pointer', boxShadow: '0 12px 40px rgba(139,92,246,0.3)',
                }}
              >
                Start Matching
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Local Video PiP ── */}
      <AnimatePresence>
        {(status === 'searching' || status === 'connected') && (
          <motion.div
            style={{
              position: 'absolute', top: 68, right: 14, zIndex: 30,
              width: 110, height: 155, borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)',
            }}
            initial={{ scale: 0, opacity: 0, x: 50 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0, opacity: 0, x: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            drag
            dragConstraints={{ left: -250, right: 10, top: -10, bottom: 400 }}
          >
            <video ref={localVideoRef} autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }} />
            {!isVideoEnabled && (
              <div style={{
                position: 'absolute', inset: 0, background: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <VideoOff size={20} color="rgba(255,255,255,0.4)" />
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 4, left: 0, right: 0,
              textAlign: 'center', fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)',
              fontWeight: 600,
            }}>You</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Panel (slide up) ── */}
      <AnimatePresence>
        {showChat && status === 'connected' && (
          <motion.div
            style={{
              position: 'absolute', bottom: 140, left: 12, right: 12, zIndex: 35,
              maxHeight: 250, borderRadius: 16, overflow: 'hidden',
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Chat</span>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', maxHeight: 160 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: msg.isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 6,
                }}>
                  <div style={{
                    maxWidth: '75%', padding: '6px 12px', borderRadius: 12,
                    background: msg.isMe ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)',
                    fontSize: '0.75rem', color: '#fff',
                  }}>
                    {msg.text}
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{msg.time}</span>
                  </div>
                </div>
              ))}
              {strangerTyping && (
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                  {matchedUser?.display_name} is typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <input
                type="text"
                placeholder="Say something..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
                  padding: '7px 12px', color: '#fff', fontSize: '0.75rem', outline: 'none',
                }}
              />
              <button onClick={handleSendChat} style={{
                background: chatInput.trim() ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
              }}>
                <Send size={14} color={chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls ── */}
      <AnimatePresence>
        {status === 'connected' && (
          <motion.div
            style={{ position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 30, padding: '0 20px' }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {/* Video */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isVideoEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${isVideoEnabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'}`,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                whileTap={{ scale: 0.9 }}
              >
                {isVideoEnabled ? <Video size={18} color="#fff" /> : <VideoOff size={18} color="#ef4444" />}
              </motion.button>

              {/* Audio */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isAudioEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${isAudioEnabled ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'}`,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                whileTap={{ scale: 0.9 }}
              >
                {isAudioEnabled ? <Mic size={18} color="#fff" /> : <MicOff size={18} color="#ef4444" />}
              </motion.button>

              {/* Chat */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: showChat ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${showChat ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setShowChat(!showChat)}
                whileTap={{ scale: 0.9 }}
              >
                <MessageCircle size={18} color={showChat ? '#8b5cf6' : '#fff'} />
              </motion.button>

              {/* Like */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isLiked ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${isLiked ? 'rgba(236,72,153,0.3)' : 'rgba(255,255,255,0.15)'}`,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setIsLiked(!isLiked)}
                whileTap={{ scale: 0.9 }}
              >
                <Heart size={18} color="#ec4899" fill={isLiked ? '#ec4899' : 'none'} />
              </motion.button>

              {/* Gift */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setShowGifts(true)}
                whileTap={{ scale: 0.9 }}
              >
                <Gift size={18} color="#eab308" />
              </motion.button>

              {/* Report */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
                onClick={() => setShowReport(true)}
                whileTap={{ scale: 0.9 }}
              >
                <Flag size={18} color="rgba(255,255,255,0.5)" />
              </motion.button>

              {/* End Call */}
              <motion.button
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#ef4444', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                }}
                onClick={endCall}
                whileTap={{ scale: 0.9 }}
              >
                <Phone size={18} color="#fff" style={{ transform: 'rotate(135deg)' }} />
              </motion.button>
            </div>

            {/* Skip */}
            <motion.button
              onClick={skipMatch}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              <SkipForward size={16} /> Next Person
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {showReport && (
          <>
            <motion.div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReport(false)}
            />
            <motion.div
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 'min(340px, 90vw)', padding: 24, borderRadius: 20, zIndex: 101,
                background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            >
              {reportSent ? (
                <div style={{ textAlign: 'center' }}>
                  <Check size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Report Submitted</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 4 }}>
                    Thank you. We'll review this shortly.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <AlertTriangle size={20} color="#eab308" />
                    <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Report User</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: 16 }}>
                    Report {matchedUser?.display_name} for inappropriate behavior?
                  </p>
                  {['Inappropriate content', 'Harassment', 'Spam', 'Other'].map(reason => (
                    <button
                      key={reason}
                      onClick={handleReport}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px', marginBottom: 6,
                        borderRadius: 10, background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)', color: '#fff',
                        fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                      }}
                    >{reason}</button>
                  ))}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gift Modal */}
      <GiftModal isOpen={showGifts} onClose={() => setShowGifts(false)} onSendGift={handleSendGift} />

      {/* Gift Toast */}
      <AnimatePresence>
        {giftToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed', top: '35%', left: '50%', transform: 'translateX(-50%)',
              padding: '14px 24px', borderRadius: 16, background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(15px)', color: '#fff', fontSize: '0.85rem',
              fontWeight: 600, zIndex: 200, textAlign: 'center',
              border: '1px solid rgba(234,179,8,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            🎁 {giftToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
