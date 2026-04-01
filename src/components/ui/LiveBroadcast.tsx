'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mic, MicOff, Camera, CameraOff, RotateCcw,
  Eye, Heart, Send, Gift, Share2, Radio, Settings,
  MessageCircle, Sparkles, Zap
} from 'lucide-react';
import { MOCK_COMMENTS, formatCount } from '@/lib/constants';
import { useProfile } from '@/lib/ProfileContext';
import Avatar from '@/components/ui/Avatar';
import GiftModal from '@/components/ui/GiftModal';
import { ChatMessage } from '@/types';

/** Floating heart animation */
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

interface LiveBroadcastProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveBroadcast({ isOpen, onClose }: LiveBroadcastProps) {
  const { profile } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hearts, setHearts] = useState<number[]>([]);
  const [showGifts, setShowGifts] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const [cameraError, setCameraError] = useState('');

  const heartIdRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera preview
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(err.message || 'Could not access camera');
    }
  }, [facingMode]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera]);

  // Simulate viewers and chat when live
  useEffect(() => {
    if (!isLive) return;

    // Simulated initial viewers
    setViewerCount(Math.floor(Math.random() * 20) + 5);

    const messageTexts = [
      '🔥🔥🔥', 'Hi!', 'Nice stream!', 'Hello from India! 🇮🇳',
      'Keep going!', 'First time here!', 'Love this! ❤️', 'You look great!',
      'What camera do you use?', '👏👏', 'Following!', 'So cool!',
      'Amazing quality 🔥', 'Can you hear me?', 'Greetings! 👋',
    ];

    // Incoming messages simulation
    const msgInterval = setInterval(() => {
      const rUser = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)].user;
      const rText = messageTexts[Math.floor(Math.random() * messageTexts.length)];
      const msg: ChatMessage = {
        id: `auto-${Date.now()}-${Math.random()}`,
        user: rUser,
        text: rText,
        type: 'message',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(-40), msg]);
    }, 2500 + Math.random() * 4000);

    // Viewer count fluctuation
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 10) - 3));
    }, 3000);

    // Random hearts
    const heartInterval = setInterval(() => {
      heartIdRef.current += 1;
      setHearts(prev => [...prev, heartIdRef.current]);
    }, 1800 + Math.random() * 2500);

    // Duration timer
    durationRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(viewerInterval);
      clearInterval(heartInterval);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [isLive]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h !== id));
  }, []);

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
      setIsCameraOff(!isCameraOff);
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
  };

  const goLive = () => {
    setShowSetup(false);
    setIsLive(true);
    setDuration(0);
    setMessages([]);
    setViewerCount(0);
  };

  const endStream = () => {
    setIsLive(false);
    setDuration(0);
    if (durationRef.current) clearInterval(durationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onClose();
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: `host-${Date.now()}`,
      user: {
        id: '100',
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: '',
        followers_count: 0,
        following_count: 0,
        likes_count: 0,
        is_verified: false,
        is_live: false,
        created_at: '',
      },
      text: newMessage,
      type: 'message',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const addHeart = () => {
    heartIdRef.current += 1;
    setHearts(prev => [...prev, heartIdRef.current]);
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="live-broadcast-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="live-broadcast-container"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Camera feed */}
            <div className="live-video-area">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`live-video-feed ${isCameraOff ? 'hidden' : ''}`}
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              {isCameraOff && (
                <div className="live-cam-off">
                  <CameraOff size={48} />
                  <p>Camera is off</p>
                </div>
              )}
              {cameraError && (
                <div className="live-cam-off">
                  <CameraOff size={48} />
                  <p>{cameraError}</p>
                  <button className="live-retry-btn" onClick={startCamera}>
                    <RotateCcw size={14} /> Retry
                  </button>
                </div>
              )}

              {/* Setup screen overlay */}
              <AnimatePresence>
                {showSetup && (
                  <motion.div
                    className="live-setup-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="live-setup-content">
                      <div className="live-setup-icon">
                        <Radio size={32} />
                      </div>
                      <h2 className="live-setup-title">Go Live</h2>
                      <p className="live-setup-subtitle">Start a live broadcast for your followers</p>
                      <input
                        type="text"
                        className="live-setup-input"
                        placeholder="Add a title for your stream..."
                        value={streamTitle}
                        onChange={e => setStreamTitle(e.target.value)}
                        maxLength={60}
                      />
                      <motion.button
                        className="live-start-btn"
                        onClick={goLive}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Zap size={18} />
                        Go Live Now
                      </motion.button>
                      <button className="live-cancel-btn" onClick={endStream}>
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live HUD */}
              {isLive && (
                <>
                  {/* Top bar */}
                  <div className="live-hud-top">
                    <div className="live-hud-left">
                      <div className="live-badge-pill">
                        <span className="live-dot" />
                        LIVE
                      </div>
                      <div className="live-duration-pill">
                        {formatDuration(duration)}
                      </div>
                    </div>
                    <div className="live-hud-right">
                      <div className="live-viewers-pill">
                        <Eye size={13} />
                        {formatCount(viewerCount)}
                      </div>
                      <button className="live-end-btn" onClick={endStream}>
                        End
                      </button>
                    </div>
                  </div>

                  {/* Host info */}
                  <div className="live-host-info">
                    <Avatar src={profile.avatar_url} alt={profile.username} size="sm" live />
                    <div>
                      <p className="live-host-name">{profile.display_name}</p>
                      <p className="live-host-title">{streamTitle || 'Untitled Stream'}</p>
                    </div>
                  </div>

                  {/* Floating hearts */}
                  <div className="live-hearts-area">
                    <AnimatePresence>
                      {hearts.map(id => (
                        <FloatingHeart key={id} id={id} onRemove={removeHeart} />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Chat */}
                  <div className="live-chat-area">
                    <div ref={chatRef} className="live-chat-scroll">
                      {messages.map(msg => (
                        <div key={msg.id} className="live-chat-msg">
                          <span className="live-chat-user">{msg.user.username}</span>
                          <span className="live-chat-text">{msg.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom controls */}
                  <div className="live-controls-bottom">
                    <div className="live-chat-input-wrap">
                      <input
                        type="text"
                        placeholder="Say something..."
                        className="live-chat-input"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        className={`live-send-btn ${newMessage.trim() ? 'active' : ''}`}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                    <div className="live-action-btns">
                      <button className="live-ctrl-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                      <button className="live-ctrl-btn" onClick={toggleCamera} title={isCameraOff ? 'Camera On' : 'Camera Off'}>
                        {isCameraOff ? <CameraOff size={18} /> : <Camera size={18} />}
                      </button>
                      <button className="live-ctrl-btn" onClick={flipCamera} title="Flip Camera">
                        <RotateCcw size={18} />
                      </button>
                      <button className="live-ctrl-btn heart" onClick={addHeart}>
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Close button (only visible in setup) */}
            {showSetup && (
              <button className="live-close-btn" onClick={endStream}>
                <X size={20} />
              </button>
            )}
          </motion.div>

          <GiftModal
            isOpen={showGifts}
            onClose={() => setShowGifts(false)}
            onSendGift={(gift) => {
              const msg: ChatMessage = {
                id: `gift-${Date.now()}`,
                user: {
                  id: '100',
                  username: profile.username,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                  bio: '',
                  followers_count: 0,
                  following_count: 0,
                  likes_count: 0,
                  is_verified: false,
                  is_live: false,
                  created_at: '',
                },
                text: `sent ${gift.icon} ${gift.name}`,
                type: 'gift',
                gift,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, msg]);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
