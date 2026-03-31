'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Eye, X, Heart, MessageCircle, Share2, Gift, Music, Volume2, VolumeX, UserPlus, Check, Bookmark, BookmarkCheck } from 'lucide-react';
import { Video } from '@/types';
import { MOCK_VIDEOS, formatCount } from '@/lib/constants';
import { fetchUploadedVideos, saveVideo, unsaveVideo, getSavedVideoIds } from '@/lib/supabase/videos';
import Avatar from '../ui/Avatar';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
import CommentSheet from '../ui/CommentSheet';
import ShareSheet from '../ui/ShareSheet';
import GiftModal from '../ui/GiftModal';
import type { Gift as GiftType } from '@/types';
import { getVideoStats, recordView, toggleLike as toggleLikeStat, addComment as addCommentStat } from '@/lib/videoStats';

// Persistent follow helpers
function getFollowingIds(): string[] {
  try { return JSON.parse(localStorage.getItem('skipsee_following') || '[]'); } catch { return []; }
}
function toggleFollowPersist(userId: string): string[] {
  const ids = getFollowingIds();
  const next = ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId];
  localStorage.setItem('skipsee_following', JSON.stringify(next));
  return next;
}

/* ── Thumbnail Card (Grid) ─────────────────────────────────── */
function ReelCard({ video, onClick }: { video: Video; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      const vid = videoRef.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
  };

  return (
    <motion.div
      className="reel-card-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.03, y: -4 }}
    >
      <div className="reel-card">
        <img
          src={video.thumbnail_url}
          alt={video.caption}
          className="reel-card-thumbnail"
          loading="lazy"
        />
        <video
          ref={videoRef}
          src={video.video_url}
          className={`reel-card-preview ${isHovered ? 'active' : ''}`}
          loop
          muted
          playsInline
          preload="none"
        />
        <div className="reel-card-gradient-top" />
        <div className="reel-card-gradient-bottom" />
        <div className={`reel-card-play-icon ${isHovered ? 'hidden' : ''}`}>
          <div className="reel-play-btn">
            <Play size={20} fill="white" className="text-white ml-0.5" />
          </div>
        </div>
        <div className="reel-card-views">
          <Eye size={13} />
          <span>{formatCount(video.views_count)}</span>
        </div>
        <div className="reel-card-username">
          <span className="reel-card-username-text">@{video.user.username}</span>
          {video.user.is_verified && (
            <span className="reel-verified-badge">✓</span>
          )}
        </div>
        {isHovered && <div className="reel-card-shimmer" />}
      </div>
    </motion.div>
  );
}

/* ── Single Reel Slide (inside fullscreen viewer) ────────── */
function ReelSlide({ video, isActive }: { video: Video; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const { user, openAuthModal } = useAuth();
  const isOwnVideo = user?.id === video.user_id;

  // Supabase-backed stats
  const [viewsCount, setViewsCount] = useState(video.views_count);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => getFollowingIds().includes(video.user.id));
  const [isSaved, setIsSaved] = useState(false);

  // Fetch real counts from Supabase on mount
  useEffect(() => {
    const supabase = (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      return createClient();
    })();

    supabase.then(async (sb) => {
      const { data } = await sb
        .from('videos')
        .select('views_count, likes_count, comments_count, likes')
        .eq('id', video.id)
        .single();

      if (data) {
        setViewsCount(data.views_count || 0);
        setLikesCount(data.likes_count || 0);
        setCommentsCount(data.comments_count || 0);
        if (user && data.likes && Array.isArray(data.likes)) {
          setIsLiked(data.likes.includes(user.id));
        }
      }
    }).catch(() => {});
  }, [video.id, user]);

  // Modal states
  const [showComments, setShowComments] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showGiftToast, setShowGiftToast] = useState<string | null>(null);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [sharesCount, setSharesCount] = useState(video.shares_count);
  const lastTapRef = useRef(0);
  const hasCountedView = useRef(false);

  // Play/pause and track view
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActive) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
      // Count view after 2 seconds of watching — sync to Supabase
      if (!hasCountedView.current) {
        const timer = setTimeout(async () => {
          hasCountedView.current = true;
          setViewsCount(prev => prev + 1);
          try {
            const { createClient } = await import('@/lib/supabase/client');
            const sb = createClient();
            // Fetch current count and increment
            const { data: vid } = await sb.from('videos').select('views_count').eq('id', video.id).single();
            if (vid) {
              await sb.from('videos').update({ views_count: (vid.views_count || 0) + 1 }).eq('id', video.id);
            }
          } catch {}
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, video.id]);

  // Progress tracking
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
    };
    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const togglePlay = () => {
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
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { openAuthModal(); return; }

    // Optimistic UI update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    // Sync to Supabase
    try {
      const { togglePostLike } = await import('@/lib/supabase/interactions');
      const result = await togglePostLike(video.id, user.id);
      setIsLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {}
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        // Use same Supabase-backed like logic
        handleLike({ stopPropagation: () => {} } as React.MouseEvent);
      }
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 1000);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShare(true);
    setSharesCount(prev => prev + 1);
  };

  const handleSendGift = (gift: GiftType) => {
    setShowGiftToast(`Sent ${gift.icon} ${gift.name} to @${video.user.username}!`);
    setTimeout(() => setShowGiftToast(null), 2500);
  };

  return (
    <div className="fv-slide">
      <div className="fv-video-container">
        {/* The video */}
        <video
          ref={videoRef}
          src={video.video_url}
          className="fv-video"
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          poster={video.thumbnail_url}
        />

        {/* Tap to play/pause + double tap like */}
        <div className="fv-tap-area" onClick={handleDoubleTap} />

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              className="fv-play-indicator"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              style={{ pointerEvents: 'none' }}
            >
              <Heart size={80} fill="#ff2d55" color="#ff2d55" style={{ filter: 'drop-shadow(0 4px 20px rgba(255,45,85,0.5))' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause indicator */}
        <AnimatePresence>
          {showPlayIcon && (
            <motion.div
              className="fv-play-indicator"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="fv-play-indicator-btn">
                {isPlaying ? (
                  <div className="flex gap-1">
                    <div className="w-1 h-5 bg-white rounded-full" />
                    <div className="w-1 h-5 bg-white rounded-full" />
                  </div>
                ) : (
                  <Play size={32} fill="white" className="text-white ml-0.5" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top gradient */}
        <div className="fv-gradient-top" />

        {/* Mute button */}
        <button className="fv-mute-btn" onClick={toggleMute}>
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Bottom gradient */}
        <div className="fv-gradient-bottom" />

        {/* Bottom Info */}
        <div className="fv-bottom-info">
          <div className="flex items-center gap-2 mb-2">
            <Avatar src={video.user.avatar_url} alt={video.user.username} size="sm" ring />
            <span className="font-bold text-sm text-white drop-shadow-lg">@{video.user.username}</span>
            {video.user.is_verified && (
              <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold">✓</span>
            )}
            {!isOwnVideo && (
              <button
                className={`ml-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isFollowing
                    ? 'bg-white/10 text-white/70 border border-white/20'
                    : 'bg-primary/90 text-white hover:bg-primary'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollowPersist(video.user.id);
                  setIsFollowing(!isFollowing);
                }}
              >
                {isFollowing ? (
                  <span className="flex items-center gap-1"><Check size={10} /> Following</span>
                ) : (
                  <span className="flex items-center gap-1"><UserPlus size={10} /> Follow</span>
                )}
              </button>
            )}
            {isOwnVideo && (
              <span className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/15 text-white/80">You</span>
            )}
          </div>
          <p className="text-sm text-white/90 leading-relaxed drop-shadow-md line-clamp-2">{video.caption}</p>
          <div className="flex items-center gap-2 text-white/70 mt-1.5">
            <Music size={11} />
            <p className="text-xs truncate max-w-[200px]">{video.music_name} — {video.user.display_name}</p>
          </div>
        </div>

        {/* Right action bar */}
        <div className="fv-action-bar">
          {/* Like */}
          <button className="fv-action-item" onClick={handleLike}>
            <Heart
              size={26}
              className={`transition-all ${isLiked ? 'fill-primary text-primary' : 'text-white'}`}
              strokeWidth={isLiked ? 0 : 2}
            />
            <span className={`text-[11px] font-semibold ${isLiked ? 'text-primary' : 'text-white/80'}`}>
              {formatCount(likesCount)}
            </span>
          </button>

          {/* Comment */}
          <button className="fv-action-item" onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
            <MessageCircle size={26} className="text-white" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white/80">{formatCount(commentsCount)}</span>
          </button>

          {/* Share */}
          <button className="fv-action-item" onClick={handleShare}>
            <Share2 size={24} className="text-white" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white/80">{formatCount(sharesCount)}</span>
          </button>

          {/* Gift */}
          <button className="fv-action-item" onClick={(e) => { e.stopPropagation(); setShowGifts(true); }}>
            <Gift size={24} className="text-warning" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-warning/80">Gift</span>
          </button>

          {/* Music disc */}
          <div className="mt-2">
            <div className="music-disc overflow-hidden">
              <img src={video.user.avatar_url} alt="Music" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="fv-progress">
          <div className="fv-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Comment Sheet */}
      <CommentSheet
        isOpen={showComments}
        onClose={() => {
          setShowComments(false);
          // Refresh comment count from stats
          const updated = getVideoStats(video.id, { views: video.views_count, likes: video.likes_count, comments: video.comments_count });
          setCommentsCount(updated.comments);
        }}
        commentsCount={commentsCount}
        videoId={video.id}
      />

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGifts}
        onClose={() => setShowGifts(false)}
        onSendGift={handleSendGift}
      />

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        video={video}
      />

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 20px', borderRadius: 12, background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)', color: '#fff', fontSize: '0.8rem',
              fontWeight: 600, zIndex: 200, whiteSpace: 'nowrap',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            ✓ Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Sent Toast */}
      <AnimatePresence>
        {showGiftToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            style={{
              position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)',
              padding: '14px 24px', borderRadius: 16, background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(15px)', color: '#fff', fontSize: '0.85rem',
              fontWeight: 600, zIndex: 200, textAlign: 'center',
              border: '1px solid rgba(255,200,0,0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            🎁 {showGiftToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Fullscreen Vertical Viewer ───────────────────────────── */
function FullscreenViewer({
  videos,
  startIndex,
  onClose,
}: {
  videos: Video[];
  startIndex: number;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Lock body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Scroll to the clicked reel on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Delay to ensure DOM is ready
    requestAnimationFrame(() => {
      const targetSlide = container.children[startIndex] as HTMLElement;
      if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: 'instant' });
      }
    });
  }, [startIndex]);

  // IntersectionObserver to track active slide
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = Number(entry.target.getAttribute('data-slide-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    Array.from(container.children).forEach((child) => {
      observerRef.current?.observe(child);
    });

    return () => observerRef.current?.disconnect();
  }, [videos]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <motion.div
      className="fv-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Close button */}
      <button className="fv-close-btn" onClick={onClose}>
        <X size={22} />
      </button>

      {/* Scrollable container */}
      <div ref={containerRef} className="fv-scroll-container no-scrollbar">
        {videos.map((video, index) => (
          <div key={`${video.id}-${index}`} data-slide-index={index}>
            <ReelSlide video={video} isActive={index === activeIndex} />
          </div>
        ))}
      </div>

      {/* Slide counter */}
      <div className="fv-counter">
        {activeIndex + 1} / {videos.length}
      </div>
    </motion.div>
  );
}

/* ── Main Grid Component ──────────────────────────────────── */
export default function ReelsGrid() {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; startIndex: number }>({
    isOpen: false,
    startIndex: 0,
  });
  const { profile } = useProfile();
  const { user } = useAuth();

  // Fetch uploaded videos from Supabase and merge with mock data
  useEffect(() => {
    fetchUploadedVideos().then(uploaded => {
      if (uploaded.length > 0) {
        // Enrich uploaded videos with real profile data for current user
        const enriched = uploaded.map(v => {
          if (user && v.user_id === user.id) {
            return {
              ...v,
              user: {
                ...v.user,
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
              },
            };
          }
          return v;
        });
        setVideos([...enriched, ...MOCK_VIDEOS]);
      }
    });
  }, [user, profile]);

  // Duplicate videos for a fuller grid
  const gridVideos = [...videos, ...videos];

  const openViewer = (index: number) => {
    setViewerState({ isOpen: true, startIndex: index });
  };

  const closeViewer = () => {
    setViewerState({ isOpen: false, startIndex: 0 });
  };

  return (
    <>
      <div className="reels-grid-wrapper">
        {/* Header */}
        <div className="reels-grid-header">
          <h1 className="reels-grid-title">
            <span className="gradient-text font-display">For You</span>
          </h1>
          <p className="reels-grid-subtitle">Trending reels curated just for you</p>
        </div>

        {/* Grid */}
        <div className="reels-grid">
          {gridVideos.map((video, index) => (
            <ReelCard
              key={`${video.id}-${index}`}
              video={video}
              onClick={() => openViewer(index)}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen Vertical Viewer */}
      <AnimatePresence>
        {viewerState.isOpen && (
          <FullscreenViewer
            videos={gridVideos}
            startIndex={viewerState.startIndex}
            onClose={closeViewer}
          />
        )}
      </AnimatePresence>
    </>
  );
}
