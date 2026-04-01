'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, Eye, Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Video } from '@/types';

interface VideoPlayerViewProps {
  initialVideo: Video | null;
}

export default function VideoPlayerView({ initialVideo }: VideoPlayerViewProps) {
  const router = useRouter();
  const [video] = useState<Video | null>(initialVideo);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video) return;

    // Auto-play on load
    v.play().then(() => setIsPlaying(true)).catch(() => {});

    progressTimer.current = setInterval(() => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    }, 200);

    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [video]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  // ── Not Found ──
  if (!video) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#000', gap: 16, padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={32} color="#8b5cf6" />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Video Not Found</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 280 }}>
          This video may have been removed or is no longer available.
        </p>
        <motion.button
          onClick={() => router.push('/')}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '12px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 8px 30px rgba(139,92,246,0.3)',
          }}
        >
          Back to Feed
        </motion.button>
      </div>
    );
  }

  // ── Video View ──
  return (
    <div style={{ height: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
      }}>
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.9 }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="#fff" />
        </motion.button>

        <motion.button
          onClick={toggleMute}
          whileTap={{ scale: 0.9 }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
        </motion.button>
      </div>

      {/* Video Player */}
      <video
        ref={videoRef}
        src={video.video_url}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer',
        }}
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Play size={32} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
        </motion.div>
      )}

      {/* Bottom Info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '24px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
      }}>
        {/* Creator Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <img
            src={video.user.avatar_url}
            alt={video.user.username}
            style={{
              width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          />
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              {video.user.display_name}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
              @{video.user.username}
            </p>
          </div>
        </div>

        {/* Caption */}
        {video.caption && (
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginBottom: 10, lineHeight: 1.5 }}>
            {video.caption}
          </p>
        )}

        {/* Music */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Music size={12} color="rgba(255,255,255,0.6)" />
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
            {video.music_name} — {video.user.display_name}
          </p>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={18} color="#fff" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{video.likes_count}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={18} color="#fff" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{video.comments_count}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={18} color="#fff" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{video.shares_count}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={18} color="#fff" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{video.views_count}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          marginTop: 12, height: 3, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${progress}%`,
            background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
            transition: 'width 0.2s ease',
          }} />
        </div>
      </div>
    </div>
  );
}
