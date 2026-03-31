'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, Share2, Grid3x3, Heart, ArrowLeft, Play, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/AuthContext';
import { fetchUserVideos } from '@/lib/supabase/videos';
import { formatCount } from '@/lib/constants';
import type { Video as VideoType } from '@/types';

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  website_url?: string;
}

export default function UserProfileView({ 
  initialProfile, 
  initialVideos 
}: { 
  initialProfile: ProfileData | null; 
  initialVideos: VideoType[];
}) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [isFollowing, setIsFollowing] = useState(false);
  const [userVideos, setUserVideos] = useState<VideoType[]>(initialVideos);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  // Basic mock counters for demo purposes
  const followersCount = 1205;
  const followingCount = 340;

  useEffect(() => {
    if (currentUser && initialProfile?.id === currentUser.id) {
      router.replace('/profile');
    }
  }, [currentUser, initialProfile, router]);

  useEffect(() => {
    if (!initialProfile) return;
    if (initialVideos.length === 0) {
      setLoadingVideos(true);
      fetchUserVideos(initialProfile.id).then(vids => {
        setUserVideos(vids);
        setLoadingVideos(false);
      });
    }
  }, [initialProfile, initialVideos]);

  if (!initialProfile) {
    return (
      <div style={{ height: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <h2>User Not Found</h2>
      </div>
    );
  }

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${initialProfile.display_name} on Skipsee`,
          text: `Check out ${initialProfile.display_name}'s profile!`,
          url,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleFollow = () => setIsFollowing(!isFollowing);

  return (
    <div style={{ minHeight: '100dvh', background: '#000', color: '#fff', paddingBottom: 80 }}>
      {/* Top Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={24} />
          </button>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{initialProfile.username}</span>
        </div>
      </div>

      {/* Main Info */}
      <div style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar src={initialProfile.avatar_url} size="xl" alt={initialProfile.username} />
          <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCount(userVideos.length)}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Posts</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCount(followersCount)}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCount(followingCount)}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Following</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{initialProfile.display_name}</h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
            {initialProfile.bio}
          </p>
          {initialProfile.website_url && (
            <div style={{ marginTop: 8 }}>
              <a 
                href={initialProfile.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.9rem', color: '#8b5cf6', textDecoration: 'none', fontWeight: 500
                }}
              >
                🔗 {initialProfile.website_url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {currentUser ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFollow}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 600, fontSize: '0.95rem',
                border: isFollowing ? '1px solid rgba(255,255,255,0.2)' : 'none',
                background: isFollowing ? 'transparent' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff',
              }}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={18} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Follow
                </>
              )}
            </motion.button>
          ) : (
            <button
              onClick={() => {}}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'not-allowed', opacity: 0.5,
                background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, border: 'none'
              }}
            >
              Log in to follow
            </button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            style={{
              width: 44, height: 44, borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Share2 size={20} color="#fff" />
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginTop: 8
      }}>
        <div style={{
          flex: 1, padding: '12px 0', display: 'flex', justifyContent: 'center',
          borderBottom: '2px solid #fff',
        }}>
          <Grid3x3 size={24} color="#fff" />
        </div>
        <div style={{
          flex: 1, padding: '12px 0', display: 'flex', justifyContent: 'center',
          opacity: 0.5,
        }}>
          <Heart size={24} color="#fff" />
        </div>
      </div>

      {/* Grid */}
      {loadingVideos ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Settings size={24} color="rgba(255,255,255,0.5)" />
          </motion.div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {userVideos.map(video => (
            <div
              key={video.id}
              onClick={() => router.push(`/video/${video.id}`)}
              style={{ aspectRatio: '3/4', background: '#222', position: 'relative', cursor: 'pointer' }}
            >
              <img
                src={video.video_url}
                alt={video.caption}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 4, left: 4, display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4,
              }}>
                <Play size={10} color="#fff" fill="#fff" />
                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>{formatCount(video.views_count)}</span>
              </div>
            </div>
          ))}
          {userVideos.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
              No videos yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
