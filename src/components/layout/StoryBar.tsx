'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MOCK_LIVE_STREAMS, formatCount } from '@/lib/constants';
import { fetchActiveLiveStreams, LiveStreamRow } from '@/lib/supabase/live_streams';

const TRENDING_TAGS = [
  { tag: '#DanceChallenge', views: '12.4M', icon: '💃', trending: true },
  { tag: '#CookingFails', views: '8.7M', icon: '👩‍🍳', trending: true },
  { tag: '#TravelVlog', views: '5.2M', icon: '✈️', trending: false },
  { tag: '#FitnessGoals', views: '3.8M', icon: '💪', trending: false },
  { tag: '#ArtProcess', views: '2.1M', icon: '🎨', trending: true },
  { tag: '#GamePlay', views: '6.3M', icon: '🎮', trending: true },
  { tag: '#Music', views: '4.1M', icon: '🎵', trending: false },
  { tag: '#Comedy', views: '9.5M', icon: '😂', trending: true },
];

/* ── Horizontal scroll helper ─────────────────────────────── */
function ScrollableRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`sb-scroll-row ${className}`}>
      <button className="sb-scroll-btn sb-scroll-left" onClick={() => scroll('left')}>
        <ChevronLeft size={14} />
      </button>
      <div ref={scrollRef} className="sb-scroll-inner no-scrollbar">
        {children}
      </div>
      <button className="sb-scroll-btn sb-scroll-right" onClick={() => scroll('right')}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Main StoryBar ────────────────────────────────────────── */
export default function StoryBar() {
  const [activeLives, setActiveLives] = useState<LiveStreamRow[]>([]);

  // Fetch real live streams natively from database
  useEffect(() => {
    fetchActiveLiveStreams(10).then(streams => {
      setActiveLives(streams);
    });
  }, []);

  return (
    <div className="story-bar">
      {/* Live Now */}
      <div className="sb-section">
        <div className="sb-section-label">
          <span className="sb-live-dot" />
          <span>Live</span>
        </div>
        <ScrollableRow>
          {activeLives.length === 0 ? (
            <div style={{ padding: '0 8px', color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap', alignSelf: 'center' }}>
              No active streams right now.
            </div>
          ) : (
            activeLives.map((stream) => (
              <Link
                key={stream.id}
                href={`/live/${stream.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <motion.div
                  className="sb-avatar-item"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="sb-avatar-ring-live">
                    <img
                      src={stream.avatar_url || 'https://via.placeholder.com/60'}
                      alt={stream.username}
                      className="sb-avatar-img"
                    />
                  </div>
                  <span className="sb-avatar-name">{stream.username.length > 8 ? stream.username.slice(0, 8) + '...' : stream.username}</span>
                  <span className="sb-live-badge">LIVE</span>
                </motion.div>
              </Link>
            ))
          )}
        </ScrollableRow>
      </div>

      {/* Divider */}
      <div className="sb-divider" />

      {/* Trending */}
      <div className="sb-section">
        <div className="sb-section-label">
          <Flame size={12} className="text-warning" />
          <span>Trending</span>
        </div>
        <ScrollableRow>
          {TRENDING_TAGS.map((item) => (
            <Link 
              key={item.tag} 
              href={`/explore?q=${encodeURIComponent(item.tag)}`}
              style={{ textDecoration: 'none' }}
            >
              <motion.button
                className="sb-tag-item"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="sb-tag-icon">{item.icon}</div>
                <span className="sb-tag-name">{item.tag}</span>
                <span className="sb-tag-views">{item.views}</span>
              </motion.button>
            </Link>
          ))}
        </ScrollableRow>
      </div>
    </div>
  );
}
