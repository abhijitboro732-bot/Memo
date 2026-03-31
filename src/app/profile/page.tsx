'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Share2, Grid3x3, Bookmark, Heart,
  Play, Radio, Edit3, ChevronDown, MoreHorizontal,
  UserPlus, UserCheck, ExternalLink, Trash2, Video, Upload, LogOut, Moon, Bell, Shield, HelpCircle
} from 'lucide-react';
import { CURRENT_USER, MOCK_USERS, MOCK_VIDEOS, formatCount } from '@/lib/constants';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import EditProfileModal from '@/components/ui/EditProfileModal';
import FollowersModal from '@/components/ui/FollowersModal';
import SupportChatModal from '@/components/ui/SupportChatModal';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { fetchUserVideos, deleteVideo, getSavedVideoIds, fetchUploadedVideos } from '@/lib/supabase/videos';
import type { Video as VideoType } from '@/types';

export default function ProfilePage() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'saved'>('videos');
  const [showFullBio, setShowFullBio] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { profile, updateProfile } = useProfile();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [myVideos, setMyVideos] = useState<VideoType[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoType[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Follow state
  const [followersModal, setFollowersModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);

  const isOwnProfile = true;

  // Load follow data from localStorage
  useEffect(() => {
    try {
      const storedFollowing = localStorage.getItem('skipsee_following');
      const storedFollowers = localStorage.getItem('skipsee_followers');
      if (storedFollowing) setFollowingIds(JSON.parse(storedFollowing));
      else {
        // Initialize with some mock following
        const initial = MOCK_USERS.slice(0, 3).map(u => u.id);
        setFollowingIds(initial);
        localStorage.setItem('skipsee_following', JSON.stringify(initial));
      }
      if (storedFollowers) setFollowerIds(JSON.parse(storedFollowers));
      else {
        // Initialize with some mock followers
        const initial = MOCK_USERS.slice(1, 5).map(u => u.id);
        setFollowerIds(initial);
        localStorage.setItem('skipsee_followers', JSON.stringify(initial));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) { setLoadingVideos(false); return; }
    setLoadingVideos(true);
    fetchUserVideos(user.id).then(videos => {
      setMyVideos(videos);
      setLoadingVideos(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const savedIds = getSavedVideoIds(user.id);
    if (savedIds.length > 0) {
      fetchUploadedVideos().then(allVideos => {
        const merged = [...allVideos, ...MOCK_VIDEOS];
        const saved = merged.filter(v => savedIds.includes(v.id));
        setSavedVideos(saved);
      });
    }
  }, [user, activeTab]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSaveProfile = (data: { display_name: string; bio: string; avatar_url: string; website_url?: string }) => {
    updateProfile(data);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;
    if (!confirm('Delete this video? This cannot be undone.')) return;
    setDeletingId(videoId);
    const result = await deleteVideo(videoId, user.id);
    if (result.success) {
      setMyVideos(prev => prev.filter(v => v.id !== videoId));
    } else {
      alert(`Failed to delete: ${result.error}`);
    }
    setDeletingId(null);
    setMenuOpenId(null);
  };

  const toggleFollow = (userId: string) => {
    setFollowingIds(prev => {
      const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      localStorage.setItem('skipsee_following', JSON.stringify(next));
      return next;
    });
  };

  const followers = MOCK_USERS.filter(u => followerIds.includes(u.id));
  const followingUsers = MOCK_USERS.filter(u => followingIds.includes(u.id));

  const openFollowers = () => { setFollowModalTab('followers'); setFollowersModal(true); };
  const openFollowing = () => { setFollowModalTab('following'); setFollowersModal(true); };

  const displayVideos = activeTab === 'videos' ? myVideos : savedVideos;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="relative h-28 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5">
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div style={{ position: 'relative' }}>
            <button
              className="w-8 h-8 rounded-full glass flex items-center justify-center"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={16} />
            </button>
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  style={{
                    position: 'absolute', top: 44, right: 0, width: 220, zIndex: 100,
                    background: 'var(--background)', backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)', borderRadius: 14,
                    padding: '6px 0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  }}
                >
                  {[
                    { icon: Bell, label: 'Notifications', action: () => {} },
                    { icon: Moon, label: 'Dark Mode', action: () => {} },
                    { icon: Shield, label: 'Privacy', action: () => {} },
                    { icon: HelpCircle, label: 'Help & Support', action: () => setShowSupportChat(true) },
                  ].map((item, i) => (
                    <button
                      key={item.label}
                      onClick={() => { item.action(); setShowSettings(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: '10px 16px', background: 'transparent', border: 'none',
                        color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <item.icon size={16} style={{ color: 'var(--text-secondary)' }} />
                      {item.label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
                  <button
                    onClick={async () => {
                      try {
                        await signOut();
                        localStorage.removeItem('skipsee_following');
                        localStorage.removeItem('skipsee_followers');
                        localStorage.removeItem('skipsee_messages');
                        localStorage.removeItem('skipsee_profile');
                        localStorage.removeItem('skipsee_video_stats');
                        setShowSettings(false);
                        router.push('/');
                        setTimeout(() => window.location.reload(), 100);
                      } catch (err) {
                        console.error('Logout failed:', err);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 16px', background: 'transparent', border: 'none',
                      color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6" style={{ marginTop: -36 }}>
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar src={profile.avatar_url} alt={profile.username} size="xl" ring />
          </div>
          <div className="flex-1 flex items-center justify-around">
            <div className="text-center">
              <p className="text-lg font-bold">{myVideos.length}</p>
              <p className="text-xs text-text-secondary">Videos</p>
            </div>
            <button className="text-center" onClick={openFollowers}>
              <p className="text-lg font-bold">{followers.length}</p>
              <p className="text-xs text-text-secondary">Followers</p>
            </button>
            <button className="text-center" onClick={openFollowing}>
              <p className="text-lg font-bold">{followingUsers.length}</p>
              <p className="text-xs text-text-secondary">Following</p>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base">{profile.display_name}</h2>
            {CURRENT_USER.is_verified && (
              <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold">✓</span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-0.5">@{profile.username}</p>
          <p
            className={`text-sm text-text-secondary mt-1 ${showFullBio ? '' : 'line-clamp-2'}`}
            onClick={() => setShowFullBio(!showFullBio)}
          >
            {profile.bio}
          </p>
          {profile.website_url && (
            <div className="mt-2 text-sm">
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                {profile.website_url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-5">
          {isOwnProfile ? (
            <>
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setIsEditOpen(true)}>
                <Edit3 size={16} /> Edit Profile
              </Button>
              <motion.button
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-light text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/live/broadcast')}
              >
                <Radio size={16} /> Go Live
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-surface-light text-foreground border border-glass-border'
                    : 'bg-gradient-to-r from-primary to-accent-light text-white shadow-lg shadow-primary/25'
                }`}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsFollowing(!isFollowing)}
              >
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {isFollowing ? 'Following' : 'Follow'}
              </motion.button>
              <button className="w-10 h-10 rounded-xl bg-surface-light border border-glass-border flex items-center justify-center">
                <ExternalLink size={16} />
              </button>
            </>
          )}
          <button className="w-10 h-10 rounded-xl bg-surface-light border border-glass-border flex items-center justify-center">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-glass-border sticky top-[68px] z-30 bg-background">
        <button
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors relative ${activeTab === 'videos' ? 'text-foreground' : 'text-text-secondary'}`}
          onClick={() => setActiveTab('videos')}
        >
          <Grid3x3 size={18} /> Videos
          {activeTab === 'videos' && <motion.div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" layoutId="profile-tab" />}
        </button>
        <button
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors relative ${activeTab === 'saved' ? 'text-foreground' : 'text-text-secondary'}`}
          onClick={() => setActiveTab('saved')}
        >
          <Bookmark size={18} /> Saved
          {activeTab === 'saved' && <motion.div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" layoutId="profile-tab" />}
        </button>
      </div>

      {/* Grid */}
      {loadingVideos && activeTab === 'videos' ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayVideos.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5 pb-24">
          {displayVideos.map((video, index) => (
            <motion.div
              key={video.id}
              className="relative aspect-[9/16] bg-surface overflow-hidden group"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              {video.thumbnail_url && video.thumbnail_url !== video.video_url ? (
                <img src={video.thumbnail_url} alt={video.caption} className="w-full h-full object-cover" />
              ) : (
                <video src={video.video_url} className="w-full h-full object-cover" muted preload="metadata" />
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white drop-shadow-lg">
                <Play size={10} fill="white" />
                <span className="text-[10px] font-semibold">{formatCount(video.views_count)}</span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Heart size={14} fill="white" />
                    <span className="text-xs font-bold">{formatCount(video.likes_count)}</span>
                  </div>
                </div>
              </div>

              {/* Three-dot menu */}
              {activeTab === 'videos' && (
                <div className="absolute top-1 right-1 z-10">
                  <button
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === video.id ? null : video.id); }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  <AnimatePresence>
                    {menuOpenId === video.id && (
                      <motion.div
                        ref={menuRef}
                        className="absolute top-8 right-0 w-36 rounded-xl bg-surface-light border border-glass-border shadow-xl overflow-hidden z-50"
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          onClick={() => handleDeleteVideo(video.id)}
                          disabled={deletingId === video.id}
                        >
                          {deletingId === video.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          {deletingId === video.id ? 'Deleting...' : 'Delete Video'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {deletingId === video.id && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          {activeTab === 'videos' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center">
                <Video size={28} className="text-text-secondary" />
              </div>
              <p className="text-sm font-semibold">No videos yet</p>
              <p className="text-xs text-text-secondary">Upload your first video to share with the world</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center">
                <Bookmark size={28} className="text-text-secondary" />
              </div>
              <p className="text-sm font-semibold">No saved videos</p>
              <p className="text-xs text-text-secondary">Videos you save will appear here</p>
            </>
          )}
        </div>
      )}

      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentUser={{
          display_name: profile.display_name,
          username: profile.username,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        }}
        onSave={handleSaveProfile}
      />

      <FollowersModal
        isOpen={followersModal}
        onClose={() => setFollowersModal(false)}
        initialTab={followModalTab}
        followers={followers}
        following={followingUsers}
        onToggleFollow={toggleFollow}
        followingIds={followingIds}
      />

      <SupportChatModal
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
      />
    </div>
  );
}
