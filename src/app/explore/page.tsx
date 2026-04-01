'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Compass, Play, Video as VideoIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchUploadedVideos } from '@/lib/supabase/videos';
import type { Video } from '@/types';
import { formatCount } from '@/lib/constants';

export default function ExplorePage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we might fetch a randomized/trending set. 
    // Here we use fetchUploadedVideos and shuffle it for discovery.
    fetchUploadedVideos().then((fetched) => {
      // Simple shuffle to simulate an "explore" randomized feed
      const shuffled = [...fetched].sort(() => 0.5 - Math.random());
      setVideos(shuffled);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--background)',
      paddingBottom: '80px',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={24} color="#8b5cf6" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
            Explore
          </h1>
        </div>

        {/* Discovery Categories (Visual only for now) */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['For You', 'Trending', 'Gaming', 'Music', 'Comedy', 'Dance'].map((cat, i) => (
            <button
              key={cat}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid var(--glass-border)',
                background: i === 0 ? 'var(--primary)' : 'var(--glass)',
                color: i === 0 ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{
          height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--background)',
        }}>
          <div style={{
            width: 36, height: 36, border: '3px solid rgba(139,92,246,0.25)',
            borderTop: '3px solid #8b5cf6', borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ padding: '2px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '2px', // Instagram style tight grid
          }}>
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                onClick={() => router.push(`/video/${video.id}`)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 + 0.1 }}
                style={{
                  position: 'relative',
                  aspectRatio: '9/16',
                  backgroundColor: '#111',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
                className="group explore-card"
              >
                {/* Thumbnail */}
                <img
                  src={video.thumbnail_url}
                  alt={video.caption}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease'
                  }}
                  className="group-hover:scale-105"
                />

                {/* Overlays */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)',
                  pointerEvents: 'none'
                }} />

                {/* Bottom Left: Views */}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#fff'
                }}>
                  <Play size={12} fill="white" />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {formatCount(video.views_count)}
                  </span>
                </div>

                {/* Bottom Right: Creator Avatar */}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.8)',
                  overflow: 'hidden'
                }}>
                  <img
                    src={video.user.avatar_url}
                    alt={video.user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {!loading && videos.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 24px', gap: '12px',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Search size={30} color="#8b5cf6" />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
                No videos found
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280 }}>
                Check back later when creators upload more content.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
