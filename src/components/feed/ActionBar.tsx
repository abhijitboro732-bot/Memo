'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Gift, Share2, Music, Check } from 'lucide-react';
import { Video } from '@/types';
import { formatCount } from '@/lib/constants';
import Avatar from '../ui/Avatar';
import { useAuth } from '@/lib/AuthContext';
import { togglePostLike, checkPostLiked, getCommentCount } from '@/lib/supabase/interactions';

interface ActionBarProps {
  video: Video;
  onCommentClick: () => void;
  onGiftClick: () => void;
  onShareClick: () => void;
}

export default function ActionBar({ video, onCommentClick, onGiftClick, onShareClick }: ActionBarProps) {
  const { user, openAuthModal } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  const [isFollowing, setIsFollowing] = useState(video.is_following);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Check if user has liked this post and fetch accurate comment count on mount
  useEffect(() => {
    if (user && video.id) {
      checkPostLiked(video.id, user.id).then(({ liked, likesCount: count }) => {
        setIsLiked(liked);
        if (count > 0) setLikesCount(count);
      });
    }
    if (video.id) {
      getCommentCount(video.id).then(count => {
        if (count > 0) setCommentsCount(count);
      });
    }
  }, [user, video.id]);

  const handleLike = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (likeLoading) return;

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    if (!wasLiked) {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 500);
    }

    // Persist to Supabase
    setLikeLoading(true);
    const result = await togglePostLike(video.id, user.id);
    setIsLiked(result.liked);
    setLikesCount(result.likesCount);
    setLikeLoading(false);
  };

  const handleFollow = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setIsFollowing(!isFollowing);
    // Persist follow state
    try {
      const following = JSON.parse(localStorage.getItem('skipsee_following') || '[]');
      if (isFollowing) {
        localStorage.setItem('skipsee_following', JSON.stringify(following.filter((id: string) => id !== video.user.id)));
      } else {
        localStorage.setItem('skipsee_following', JSON.stringify([...following, video.user.id]));
      }
    } catch {}
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* User Avatar + Follow */}
      <div className="relative">
        <Avatar
          src={video.user.avatar_url}
          alt={video.user.username}
          size="lg"
          ring
        />
        {!isFollowing && (
          <motion.button
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
            onClick={handleFollow}
            whileTap={{ scale: 0.8 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <UserPlus size={12} strokeWidth={3} />
          </motion.button>
        )}
        {isFollowing && (
          <motion.div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-surface-light flex items-center justify-center border border-glass-border"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Check size={12} strokeWidth={3} className="text-success" />
          </motion.div>
        )}
      </div>

      {/* Like */}
      <button className="action-btn flex flex-col items-center gap-1" onClick={handleLike}>
        <div className="relative">
          <motion.div whileTap={{ scale: 0.7 }} transition={{ duration: 0.1 }}>
            <Heart
              size={28}
              className={`transition-all duration-200 ${
                isLiked ? 'fill-primary text-primary' : 'text-white'
              }`}
              strokeWidth={isLiked ? 0 : 2}
            />
          </motion.div>
          {showHeartBurst && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Heart size={28} className="fill-primary text-primary" strokeWidth={0} />
            </motion.div>
          )}
        </div>
        <span className={`text-xs font-semibold ${isLiked ? 'text-primary' : 'text-white'}`}>
          {formatCount(likesCount)}
        </span>
      </button>

      {/* Comment */}
      <button className="action-btn flex flex-col items-center gap-1" onClick={onCommentClick}>
        <motion.div whileTap={{ scale: 0.7 }} transition={{ duration: 0.1 }}>
          <MessageCircle size={28} className="text-white" strokeWidth={2} />
        </motion.div>
        <span className="text-xs font-semibold">{formatCount(commentsCount)}</span>
      </button>

      {/* Share */}
      <button className="action-btn flex flex-col items-center gap-1" onClick={onShareClick}>
        <motion.div whileTap={{ scale: 0.7, rotate: -15 }} transition={{ duration: 0.1 }}>
          <Share2 size={26} className="text-white" strokeWidth={2} />
        </motion.div>
        <span className="text-xs font-semibold">{formatCount(video.shares_count)}</span>
      </button>

      {/* Gift */}
      <button className="action-btn flex flex-col items-center gap-1" onClick={onGiftClick}>
        <motion.div
          whileTap={{ scale: 0.7 }}
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Gift size={26} className="text-warning" strokeWidth={2} />
        </motion.div>
        <span className="text-xs font-semibold text-warning">Gift</span>
      </button>

      {/* Music Disc */}
      <div className="mt-1">
        <div className="music-disc overflow-hidden">
          <img
            src={video.user.avatar_url}
            alt="Music"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
