'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Search, Phone, Video,
  Smile, Mic, CheckCheck, Camera, UserPlus,
  MessageCircle, Lock, Square, Image as ImageIcon,
  Play, Pause, X
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { createClient } from '@/lib/supabase/client';
import {
  sendMessage as sendMessageToDb,
  fetchMessages,
  fetchConversationSummaries,
  markMessagesAsRead,
  subscribeToMessages,
  unsubscribeChannel,
  type DBMessage,
} from '@/lib/supabase/messaging';
import { MOCK_USERS } from '@/lib/constants';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ContactUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface ConversationInfo {
  user: ContactUser;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const AUTO_REPLIES = [
  'Hey! How are you? 😊', "That's awesome! ✨", 'Haha love that 😂',
  "Let's catch up soon!", 'Cool! Tell me more 👀', 'Sounds great! 🙌',
  'I was just thinking about that!', 'No way! 🤩', 'Yesss! 💯',
  'OMG same here 😍', 'Sent you a reel check it out 📱', 'Brb! 🏃',
];

async function fetchRealProfiles(currentUserId: string): Promise<ContactUser[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', currentUserId)
      .limit(20);
    if (error || !data || data.length === 0) return [];
    return data.map(p => ({
      id: p.id,
      username: p.username || 'user',
      display_name: p.display_name || p.username || 'User',
      avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
    }));
  } catch { return []; }
}

async function fetchPostUsers(currentUserId: string): Promise<ContactUser[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('user_id, username, avatar_url')
      .neq('user_id', currentUserId)
      .limit(50);
    if (error || !data) return [];
    const seen = new Map<string, ContactUser>();
    for (const post of data) {
      if (post.user_id && !seen.has(post.user_id)) {
        seen.set(post.user_id, {
          id: post.user_id,
          username: post.username || 'user',
          display_name: post.username || 'User',
          avatar_url: post.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
        });
      }
    }
    return Array.from(seen.values());
  } catch { return []; }
}

// ── Voice Message Waveform Bubble ──
function VoiceMessageBubble({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animRef = useRef<number>(0);

  // Generate consistent random waveform bars from src hash
  const bars = useRef(
    Array.from({ length: 28 }, (_, i) => {
      const seed = (i * 7 + src.length) % 100;
      return 0.2 + (Math.sin(seed * 0.3) * 0.5 + 0.5) * 0.8;
    })
  ).current;

  const updateProgress = () => {
    const a = audioRef.current;
    if (a && a.duration) {
      setProgress(a.currentTime / a.duration);
      if (!a.paused) animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
      animRef.current = requestAnimationFrame(updateProgress);
    } else {
      a.pause();
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    cancelAnimationFrame(animRef.current);
  };

  const handleLoaded = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const barColor = isMe ? 'rgba(255,255,255,0.85)' : '#7c3aed';
  const barDimColor = isMe ? 'rgba(255,255,255,0.3)' : 'rgba(124,58,237,0.25)';
  const textColor = isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, padding: '2px 0' }}>
      <audio ref={audioRef} src={src} preload="metadata" onEnded={handleEnded} onLoadedMetadata={handleLoaded} />
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.15)',
          border: 'none', cursor: 'pointer',
        }}
      >
        {playing
          ? <Pause size={16} color={isMe ? '#fff' : '#7c3aed'} fill={isMe ? '#fff' : '#7c3aed'} />
          : <Play size={16} color={isMe ? '#fff' : '#7c3aed'} fill={isMe ? '#fff' : '#7c3aed'} style={{ marginLeft: 2 }} />}
      </motion.button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 24 }}>
          {bars.map((h, i) => {
            const filledFraction = progress * bars.length;
            const isFilled = i < filledFraction;
            return (
              <motion.div
                key={i}
                style={{
                  width: 3, borderRadius: 2, flexShrink: 0,
                  height: `${h * 100}%`,
                  background: isFilled ? barColor : barDimColor,
                  transition: 'background 0.15s ease',
                }}
                animate={playing && isFilled ? { scaleY: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4, delay: i * 0.02 }}
              />
            );
          })}
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 600, color: textColor }}>
          {playing ? fmt(audioRef.current?.currentTime || 0) : fmt(duration)}
        </span>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user, openAuthModal } = useAuth();
  const { profile } = useProfile();

  const [followedUsers, setFollowedUsers] = useState<ContactUser[]>([]);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeChat, setActiveChat] = useState<ContactUser | null>(null);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = user?.id || 'me';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const realUsers = await fetchRealProfiles(currentUserId);
      const postUsers = await fetchPostUsers(currentUserId);
      const seen = new Set<string>();
      const contactList: ContactUser[] = [];
      for (const u of [...realUsers, ...postUsers]) {
        if (!seen.has(u.id)) { seen.add(u.id); contactList.push(u); }
      }
      setFollowedUsers(contactList);
      const summaries = await fetchConversationSummaries(currentUserId);
      const convMap = new Map<string, ConversationInfo>();
      for (const fu of contactList) {
        convMap.set(fu.id, { user: fu, lastMessage: '', lastTime: '', unread: 0, online: Math.random() > 0.4 });
      }
      for (const summary of summaries) {
        const existing = convMap.get(summary.otherUserId);
        if (existing) {
          existing.lastMessage = summary.lastMessage;
          existing.lastTime = summary.lastTime;
          existing.unread = summary.unreadCount;
        }
      }
      const allConvos = Array.from(convMap.values()).sort((a, b) => {
        if (a.lastTime && b.lastTime) return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
        if (a.lastTime) return -1; if (b.lastTime) return 1; return 0;
      });
      setConversations(allConvos);
      setLoading(false);
      try {
        const openChat = sessionStorage.getItem('skipsee_open_chat');
        if (openChat) {
          sessionStorage.removeItem('skipsee_open_chat');
          const chatUser = JSON.parse(openChat) as ContactUser;
          if (chatUser.id) setActiveChat(chatUser);
        }
      } catch {}
    };
    loadData();
  }, [user, currentUserId]);

  useEffect(() => {
    if (!user) return;
    const channel = subscribeToMessages(user.id, (newMsg) => {
      setMessages(prev => {
        const isForActiveChat = activeChat && (newMsg.sender_id === activeChat.id || newMsg.receiver_id === activeChat.id);
        if (isForActiveChat) { if (prev.some(m => m.id === newMsg.id)) return prev; return [...prev, newMsg]; }
        return prev;
      });
      setConversations(prev =>
        prev.map(c => c.user.id === newMsg.sender_id ? { ...c, lastMessage: newMsg.text, lastTime: newMsg.created_at, unread: activeChat?.id === newMsg.sender_id ? c.unread : c.unread + 1 } : c)
          .sort((a, b) => { if (a.lastTime && b.lastTime) return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime(); if (a.lastTime) return -1; if (b.lastTime) return 1; return 0; })
      );
    });
    channelRef.current = channel;
    return () => { unsubscribeChannel(channelRef.current); };
  }, [user, activeChat]);

  useEffect(() => {
    if (!activeChat) return;
    const loadMessages = async () => {
      const msgs = await fetchMessages(currentUserId, activeChat.id);
      setMessages(msgs);
      await markMessagesAsRead(currentUserId, activeChat.id);
      setConversations(prev => prev.map(c => c.user.id === activeChat.id ? { ...c, unread: 0 } : c));
    };
    loadMessages();
  }, [activeChat, currentUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (activeChat) setTimeout(() => inputRef.current?.focus(), 100); }, [activeChat]);

  const handleSendMessage = async (overrideText?: string) => {
    const text = overrideText || messageInput.trim();
    if (!text || !activeChat || sendingMessage) return;
    if (!overrideText) setMessageInput('');
    setSendingMessage(true);
    const sentMsg = await sendMessageToDb(currentUserId, activeChat.id, text);
    if (sentMsg) {
      setMessages(prev => [...prev, sentMsg]);
      setConversations(prev =>
        prev.map(c => c.user.id === activeChat.id ? { ...c, lastMessage: text.startsWith('img::') ? '📷 Photo' : text.startsWith('audio::') ? '🎤 Voice message' : text.startsWith('reel::') ? '📹 Shared a reel' : text, lastTime: sentMsg.created_at } : c)
          .sort((a, b) => { if (a.lastTime && b.lastTime) return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime(); if (a.lastTime) return -1; if (b.lastTime) return 1; return 0; })
      );
    }
    setSendingMessage(false);
  };

  // ── Camera / Photo ──
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    // Convert to base64 data URL for simplicity (no storage bucket needed)
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      // Compress if too large
      const img = new window.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        await handleSendMessage(`img::${compressed}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [activeChat, currentUserId]);

  // ── Voice Recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          await handleSendMessage(`audio::${dataUrl}`);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Please allow microphone access to send voice messages');
    }
  }, [activeChat, currentUserId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const filteredConversations = searchQuery
    ? conversations.filter(c => c.user.username.toLowerCase().includes(searchQuery.toLowerCase()) || c.user.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  // ── NOT LOGGED IN ──
  if (!user) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--background)',
        gap: 16, padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <Lock size={32} color="#8b5cf6" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)' }}>Sign in to Message</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 300 }}>
          Log in to send messages to the people you follow
        </p>
        <motion.button
          onClick={openAuthModal}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '12px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 8px 30px rgba(139,92,246,0.3)',
          }}
        >
          Sign In
        </motion.button>
      </div>
    );
  }

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)',
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid rgba(139,92,246,0.25)',
          borderTop: '3px solid #8b5cf6', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── CHAT VIEW ──
  if (activeChat) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
        {/* Chat Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--surface)', borderBottom: '1px solid var(--glass-border)',
        }}>
          <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', display: 'flex' }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ position: 'relative' }}>
            <img src={activeChat.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{
              position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
              borderRadius: '50%', background: '#22c55e', border: '2px solid var(--background)',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{activeChat.display_name}</p>
            <p style={{ fontSize: '0.65rem', color: typing ? '#22c55e' : 'var(--text-secondary)' }}>
              {typing ? 'typing...' : 'Active now'}
            </p>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <Phone size={20} />
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <Video size={20} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {messages.length === 0 && !typing && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 12,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={28} color="#8b5cf6" />
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Start a conversation
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Send a message to {activeChat.display_name}
              </p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                style={{
                  display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                }}
              >
                {!isMe && (
                  <img src={activeChat.avatar_url} alt="" style={{
                    width: 24, height: 24, borderRadius: '50%', marginRight: 8,
                    alignSelf: 'flex-end', flexShrink: 0, objectFit: 'cover',
                  }} />
                )}
                <div style={{
                  maxWidth: '70%',
                  padding: msg.text.startsWith('img::') || msg.text.startsWith('reel::') ? '4px' : '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe
                    ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                    : 'var(--surface)',
                  border: isMe ? 'none' : '1px solid var(--glass-border)',
                  overflow: 'hidden',
                }}>
                  {msg.text.startsWith('img::') ? (
                    <img
                      src={msg.text.slice(5)}
                      alt="Photo"
                      style={{ width: '100%', maxWidth: 260, borderRadius: 12, display: 'block' }}
                    />
                  ) : msg.text.startsWith('reel::') ? (() => {
                    const parts = msg.text.split('::');
                    const videoId = parts[1] || '';
                    const thumbUrl = parts[2] || '';
                    return (
                      <a
                        href={`/video/${videoId}`}
                        style={{ display: 'block', textDecoration: 'none', position: 'relative', cursor: 'pointer' }}
                      >
                        <div style={{
                          width: 180, height: 260, borderRadius: 12, overflow: 'hidden',
                          background: thumbUrl ? `url(${thumbUrl}) center/cover` : 'linear-gradient(135deg, #1a1a2e, #16213e)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                        }}>
                          {/* Dark overlay */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.25)',
                          }} />
                          {/* Play button */}
                          <div style={{
                            position: 'relative', zIndex: 1,
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}>
                            <Play size={22} color="#7c3aed" fill="#7c3aed" style={{ marginLeft: 3 }} />
                          </div>
                          {/* Label */}
                          <div style={{
                            position: 'absolute', bottom: 8, left: 8, right: 8,
                            display: 'flex', alignItems: 'center', gap: 6, zIndex: 1,
                          }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 4,
                              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Play size={10} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                              Shared a Reel
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })() : msg.text.startsWith('audio::') ? (
                    <VoiceMessageBubble src={msg.text.slice(7)} isMe={isMe} />
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: isMe ? '#fff' : 'var(--foreground)', lineHeight: 1.5 }}>{msg.text}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4, padding: msg.text.startsWith('img::') ? '0 8px 4px' : 0 }}>
                    <span style={{
                      fontSize: '0.55rem',
                      color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)',
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck size={12} color={msg.read ? '#22c55e' : 'rgba(255,255,255,0.4)'} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {typing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <img src={activeChat.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)' }}>
                <motion.div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden file input for camera/photos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />

        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'var(--surface)', borderTop: '1px solid var(--glass-border)',
        }}>
          {isRecording ? (
            /* ── Recording UI ── */
            <>
              <motion.button
                onClick={cancelRecording}
                whileTap={{ scale: 0.9 }}
                style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={18} color="#ef4444" />
              </motion.button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 24, background: 'var(--background)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <motion.span
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>{formatRecTime(recordingTime)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recording...</span>
              </div>
              <motion.button
                onClick={stopRecording}
                whileTap={{ scale: 0.9 }}
                style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', cursor: 'pointer' }}
              >
                <Send size={18} color="#fff" />
              </motion.button>
            </>
          ) : (
            /* ── Normal Input UI ── */
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
              >
                <Camera size={22} />
              </button>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--background)', borderRadius: 24, padding: '8px 14px',
                border: '1px solid var(--glass-border)',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', fontSize: '0.85rem' }}
                />
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <Smile size={20} />
                </button>
              </div>
              {messageInput.trim() ? (
                <motion.button
                  onClick={() => handleSendMessage()}
                  whileTap={{ scale: 0.9 }}
                  disabled={sendingMessage}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    border: 'none', cursor: 'pointer',
                    opacity: sendingMessage ? 0.6 : 1,
                  }}
                >
                  <Send size={18} color="#fff" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={startRecording}
                  whileTap={{ scale: 0.9 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
                >
                  <Mic size={22} />
                </motion.button>
              )}
            </>
          )}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    );
  }

  // ── CONVERSATIONS LIST ──
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--background)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px', background: 'var(--surface)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)' }}>Messages</h1>
            {totalUnread > 0 && (
              <p style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600, marginTop: 2 }}>
                {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--glass)', border: '1px solid var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Search size={16} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: '0.8rem',
                  background: 'var(--background)', border: '1px solid var(--glass-border)',
                  color: 'var(--foreground)', outline: 'none', marginBottom: 8,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* People horizontal scroll */}
        {followedUsers.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <p style={{
              fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              People
            </p>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {followedUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setActiveChat(u)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}
                >
                  <div style={{ position: 'relative' }}>
                    <img src={u.avatar_url} alt="" style={{
                      width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
                      border: '2px solid rgba(139,92,246,0.3)',
                    }} />
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1, width: 10, height: 10,
                      borderRadius: '50%', background: '#22c55e',
                      border: '2px solid var(--background)',
                    }} />
                  </div>
                  <p style={{
                    fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 4,
                    maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {u.username}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((convo, i) => (
            <motion.button
              key={convo.user.id}
              onClick={() => setActiveChat(convo.user)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', width: '100%',
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={convo.user.avatar_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                {convo.online && (
                  <span style={{
                    position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
                    borderRadius: '50%', background: '#22c55e', border: '2px solid var(--background)',
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: convo.unread > 0 ? 700 : 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>
                    {convo.user.display_name}
                  </span>
                  {convo.lastTime && (
                    <span style={{
                      fontSize: '0.65rem',
                      color: convo.unread > 0 ? '#8b5cf6' : 'var(--text-secondary)',
                      fontWeight: convo.unread > 0 ? 600 : 400,
                    }}>
                      {timeAgo(convo.lastTime)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <p style={{
                    fontSize: '0.75rem',
                    color: convo.unread > 0 ? 'var(--foreground)' : 'var(--text-secondary)',
                    fontWeight: convo.unread > 0 ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                  }}>
                    {convo.lastMessage
                      ? convo.lastMessage.startsWith('reel::') ? '📹 Shared a reel'
                      : convo.lastMessage.startsWith('img::') ? '📷 Photo'
                      : convo.lastMessage.startsWith('audio::') ? '🎤 Voice message'
                      : convo.lastMessage
                      : 'Tap to start chatting 💬'}
                  </p>
                  {convo.unread > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10, background: '#8b5cf6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff', padding: '0 6px', flexShrink: 0,
                    }}>
                      {convo.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 24px', gap: 12,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={30} color="#8b5cf6" />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>No conversations yet</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280 }}>
              Follow users to start messaging them. Your followed users will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
