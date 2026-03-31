'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MOCK_VIDEOS } from '@/lib/constants';
import { Video } from '@/types';
import VideoCard from './VideoCard';
import CommentSheet from '../ui/CommentSheet';
import ShareSheet from '../ui/ShareSheet';
import GiftModal from '../ui/GiftModal';
import ReelsGrid from './ReelsGrid';
import { fetchUploadedVideos } from '@/lib/supabase/videos';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';

export default function VideoFeed() {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const { profile } = useProfile();

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

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    containerRef.current?.querySelectorAll('[data-index]').forEach((el) => {
      observerRef.current?.observe(el);
    });
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [setupObserver, videos]);

  return (
    <>
      {/* Desktop: Reels Grid Layout */}
      <div className="hidden lg:block">
        <ReelsGrid />
      </div>

      {/* Mobile: Existing vertical scroll feed (unchanged) */}
      <div className="lg:hidden">
        <div
          ref={containerRef}
          className="feed-container no-scrollbar"
        >
          {videos.map((video, index) => (
            <div
              key={video.id}
              data-index={index}
              className="feed-item"
            >
              <VideoCard
                video={video}
                isActive={index === activeIndex}
                onCommentClick={() => setShowComments(true)}
                onGiftClick={() => setShowGifts(true)}
                onShareClick={() => setShowShare(true)}
              />
            </div>
          ))}
        </div>

        <CommentSheet
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          commentsCount={videos[activeIndex]?.comments_count || 0}
          videoId={videos[activeIndex]?.id}
        />

        <ShareSheet
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          video={videos[activeIndex]}
        />

        <GiftModal
          isOpen={showGifts}
          onClose={() => setShowGifts(false)}
          onSendGift={(gift) => {
            console.log('Sent gift:', gift);
          }}
        />
      </div>
    </>
  );
}
