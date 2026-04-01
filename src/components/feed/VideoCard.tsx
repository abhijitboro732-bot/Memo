'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX, Music, Eye } from 'lucide-react';
import { Video } from '@/types';
import ActionBar from './ActionBar';
import { getVideoStats, recordView } from '@/lib/videoStats';
import { formatCount } from '@/lib/constants';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onCommentClick: () => void;
  onGiftClick: () => void;
  onShareClick: () => void;
}

export default function VideoCard({ video, isActive, onCommentClick, onGiftClick, onShareClick }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastTapRef = useRef(0);
  const hasCountedView = useRef(false);

  // Initialize stats
  const stats = getVideoStats(video.id, { views: video.views_count, likes: video.likes_count, comments: video.comments_count });
  const [viewsCount, setViewsCount] = useState(stats.views);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActive) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
      
      // Count view after 2 seconds
      if (!hasCountedView.current) {
        const timer = setTimeout(() => {
          const newViews = recordView(video.id);
          setViewsCount(newViews);
          hasCountedView.current = true;
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, video.id]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      if (vid.duration) {
        setProgress((vid.currentTime / vid.duration) * 100);
      }
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 800);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;

    if (now - lastTapRef.current < 300) {
      setDoubleTapHeart({ x: clientX - rect.left, y: clientY - rect.top });
      setTimeout(() => setDoubleTapHeart(null), 1000);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, 300);
    }
  }, [togglePlay]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  return (
    <div
      className="video-card bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video.video_url}
        className="absolute inset-0 w-full h-full object-cover lg:rounded-2xl"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        poster={video.thumbnail_url}
      />

      {/* Tap area */}
      <div className="absolute inset-0 z-10" onClick={handleTap} />

      {/* Double-tap heart */}
      {doubleTapHeart && (
        <motion.div
          className="absolute z-20 pointer-events-none"
          style={{ left: doubleTapHeart.x - 40, top: doubleTapHeart.y - 40 }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-7xl">❤️</span>
        </motion.div>
      )}

      {/* Play/Pause indicator */}
      {showPlayIcon && (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play
              size={32}
              className={`text-white ${isPlaying ? 'hidden' : ''}`}
              fill="white"
            />
            {isPlaying && (
              <div className="flex gap-1">
                <div className="w-1 h-5 bg-white rounded-full" />
                <div className="w-1 h-5 bg-white rounded-full" />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 video-gradient-top z-10 pointer-events-none lg:rounded-t-2xl" />

      {/* Mute button — always visible on hover for desktop */}
      <button
        className={`absolute top-20 lg:top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'lg:opacity-0'
        }`}
        onClick={toggleMute}
      >
        {isMuted ? <VolumeX size={14} className="text-white" /> : <Volume2 size={14} className="text-white" />}
      </button>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-72 video-gradient-bottom z-10 pointer-events-none lg:rounded-b-2xl" />

      {/* Bottom content */}
      <div className="absolute bottom-20 lg:bottom-6 left-0 right-16 z-20 px-4">
        {/* Username */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-white drop-shadow-lg">
            @{video.user.username}
          </span>
          {video.user.is_verified && (
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold">✓</span>
          )}
        </div>
        
        {/* View Count */}
        <div className="flex items-center gap-1.5 text-white/90 drop-shadow-md mt-1 mb-1">
          <Eye size={14} className="opacity-80" />
          <span className="text-xs font-semibold">{formatCount(viewsCount)} views</span>
        </div>

        {/* Caption */}
        <p className="text-sm text-white/90 leading-relaxed drop-shadow-md line-clamp-2 mt-2">
          {video.caption}
        </p>

        {/* Music */}
        <div className="flex items-center gap-2 text-white/80 mt-2">
          <Music size={12} />
          <div className="overflow-hidden max-w-[200px]">
            <motion.p
              className="text-xs whitespace-nowrap"
              animate={{ x: [-200, 200] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              {video.music_name} — {video.user.display_name}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right action bar */}
      <div className={`absolute right-3 bottom-32 lg:bottom-16 z-20 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'lg:opacity-80'
      }`}>
        <ActionBar
          video={video}
          onCommentClick={onCommentClick}
          onGiftClick={onGiftClick}
          onShareClick={onShareClick}
        />
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-16 lg:bottom-0 left-0 right-0 z-30 lg:px-0">
        <div className="progress-bar lg:rounded-b-2xl">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
