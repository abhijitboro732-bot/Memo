'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MOCK_VIDEOS } from '@/lib/constants';
import { Video } from '@/types';
import VideoCard from './VideoCard';
import CommentSheet from '../ui/CommentSheet';
import ShareSheet from '../ui/ShareSheet';
import GiftModal from '../ui/GiftModal';
import ReelsGrid from './ReelsGrid';
import { fetchRecommendedVideos } from '@/lib/supabase/videos';
import { trackUserBehavior } from '@/lib/supabase/interactions';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Mobile Search State
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically when search bar is opened
  useEffect(() => {
    if (isMobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Fetch recommended videos from AI system and merge with mock data
  useEffect(() => {
    // user is either a User or null once auth initializes
    fetchRecommendedVideos(user?.id).then(uploaded => {
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

  // Watch time behavior tracking
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const prevIndexRef = useRef(0);

  useEffect(() => {
    // When activeIndex changes, track the PREVIOUS video's watch time
    if (prevIndexRef.current !== activeIndex) {
      const watchTimeSeconds = (Date.now() - sessionStartTime) / 1000;
      const prevVideo = videos[prevIndexRef.current];
      
      if (prevVideo && user && prevVideo.id) {
        let weight = 0;
        let type = '';
        if (watchTimeSeconds < 2) {
          type = 'skip';
          weight = -1; // Negative signal
        } else {
          type = 'view';
          weight = Math.min(5, watchTimeSeconds / 5); // Positive signal, capped at 5
        }
        trackUserBehavior(user.id, prevVideo.id, type, weight);
      }

      // Reset for the new video
      setSessionStartTime(Date.now());
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex, videos, sessionStartTime, user]);


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
      <div className="lg:hidden relative w-full h-full">

        {/* ── MOBILE SEARCH OVERLAY ── */}
        <div className="absolute top-4 left-4 right-4 z-[60] pointer-events-none">
          <AnimatePresence mode="wait">
            {!isMobileSearchOpen ? (
              <motion.div
                key="search-btn-collapsed"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-end pointer-events-auto"
              >
                <button
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg"
                >
                  <Search size={20} strokeWidth={2.5} />
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="search-bar-expanded"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                onSubmit={(e) => e.preventDefault()}
                className="flex items-center gap-2 bg-black/60 backdrop-blur-xl p-2 rounded-full border border-white/20 shadow-2xl pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white shrink-0"
                >
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search reels..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-[15px] font-medium placeholder:text-white/60"
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                />
                <button type="submit" className="w-8 h-8 flex items-center justify-center text-white/50 pr-2">
                  <Search size={18} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div
          ref={containerRef}
          className="feed-container no-scrollbar relative z-0"
        >
          {videos
            .filter(v => mobileSearchQuery ? v.caption.toLowerCase().includes(mobileSearchQuery.toLowerCase()) || v.user.username.toLowerCase().includes(mobileSearchQuery.toLowerCase()) : true)
            .map((video, index) => (
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

          {/* Empty State when search returns no results */}
          {mobileSearchQuery && videos.filter(v => v.caption.toLowerCase().includes(mobileSearchQuery.toLowerCase()) || v.user.username.toLowerCase().includes(mobileSearchQuery.toLowerCase())).length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', zIndex: 10 }}>
               <Search size={48} opacity={0.3} style={{ marginBottom: 16 }} />
               <p style={{ fontWeight: 700, fontSize: '1.2rem', margin: '0 0 8px' }}>No reels found</p>
               <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Try searching for a different creator or caption!</p>
            </div>
          )}
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
