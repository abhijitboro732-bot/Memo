'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Bell, MessageCircle, PlusSquare, Play, User, Video, TrendingUp, Clock, Hash } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { CURRENT_USER, MOCK_USERS, MOCK_VIDEOS, formatCount } from '@/lib/constants';
import { useUpload } from '@/lib/UploadContext';
import { useProfile } from '@/lib/ProfileContext';
import { fetchUploadedVideos } from '@/lib/supabase/videos';
import { fetchRealUsers, searchRealUsers } from '@/lib/supabase/users';
import type { User as UserType, Video as VideoType } from '@/types';
import SkipseeLogo from '../ui/SkipseeLogo';

// Recent searches stored in localStorage
function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem('skipsee_recent_searches') || '[]'); } catch { return []; }
}
function addRecentSearch(q: string) {
  try {
    const recent = getRecentSearches().filter(s => s !== q);
    recent.unshift(q);
    localStorage.setItem('skipsee_recent_searches', JSON.stringify(recent.slice(0, 8)));
  } catch {}
}
function clearRecentSearches() {
  try { localStorage.removeItem('skipsee_recent_searches'); } catch {}
}

export default function TopNavbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { openUpload } = useUpload();
  const { profile } = useProfile();
  const router = useRouter();

  // Search results
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [videoResults, setVideoResults] = useState<VideoType[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<VideoType[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'users' | 'videos'>('all');

  // Trending tags
  const trendingTags = ['#trending', '#viral', '#fyp', '#dance', '#cooking', '#travel', '#fitness', '#art'];

  // Suggested users from Supabase
  const [suggestedUsers, setSuggestedUsers] = useState<UserType[]>([]);

  // Load uploaded videos once
  useEffect(() => {
    fetchUploadedVideos().then(setUploadedVideos);
    // Fetch suggested users from posts table
    fetchRealUsers(5).then(users => {
      if (users.length > 0) {
        setSuggestedUsers(users);
      } else {
        setSuggestedUsers(MOCK_USERS.slice(0, 3));
      }
    });
  }, []);

  // Search logic
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setUserResults([]);
      setVideoResults([]);
      return;
    }

    // Search mock users
    const mockResults = MOCK_USERS.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q) ||
      u.bio.toLowerCase().includes(q)
    );

    // Also search real users from posts table
    searchRealUsers(q, 5).then(dbUsers => {
      // Merge and deduplicate
      const seen = new Set<string>();
      const merged: UserType[] = [];
      for (const u of [...dbUsers, ...mockResults]) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          merged.push(u);
        }
      }
      setUserResults(merged);
    });

    // Search videos (mock + uploaded)
    const allVideos = [...uploadedVideos, ...MOCK_VIDEOS];
    const videos = allVideos.filter(v =>
      v.caption.toLowerCase().includes(q) ||
      v.music_name.toLowerCase().includes(q) ||
      v.user.username.toLowerCase().includes(q) ||
      v.user.display_name.toLowerCase().includes(q)
    );
    setVideoResults(videos.slice(0, 8));
  }, [searchQuery, uploadedVideos]);

  // Show dropdown on focus or when typing
  useEffect(() => {
    if (isSearchFocused) {
      setShowDropdown(true);
      setRecentSearches(getRecentSearches());
    }
  }, [isSearchFocused]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.closest('.top-navbar-search')?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchRef.current?.focus();
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    addRecentSearch(query.trim());
    setShowDropdown(false);
    // Could navigate to a search results page
  };

  const handleSelectRecent = (q: string) => {
    setSearchQuery(q);
    handleSearch(q);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(searchQuery);
    if (e.key === 'Escape') { setShowDropdown(false); searchRef.current?.blur(); }
  };

  const query = searchQuery.trim();
  const hasResults = userResults.length > 0 || videoResults.length > 0;
  const showUsers = activeCategory === 'all' || activeCategory === 'users';
  const showVideos = activeCategory === 'all' || activeCategory === 'videos';

  return (
    <header className="top-navbar">
      <div className="top-navbar-inner">
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <SkipseeLogo size={32} withText={true} />
        </Link>

        {/* Search Bar */}
        <div className="relative" style={{ flex: '0 1 480px' }}>
          <div className={`top-navbar-search ${isSearchFocused ? 'focused' : ''}`}>
            <Search size={16} className="top-navbar-search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search videos, creators, sounds..."
              className="top-navbar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={handleKeyDown}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  className="top-navbar-search-clear"
                  onClick={handleClearSearch}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  background: 'var(--surface-light)',
                  borderRadius: 16,
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  zIndex: 100,
                }}
              >
                {/* No query: show recent + trending */}
                {!query && (
                  <div style={{ padding: '12px 0' }}>
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 8px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent</span>
                          <button onClick={handleClearRecent} style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
                        </div>
                        {recentSearches.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectRecent(q)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left', fontSize: '0.8rem' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <Clock size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            {q}
                          </button>
                        ))}
                        <div style={{ height: 1, background: 'var(--glass-border)', margin: '8px 16px' }} />
                      </div>
                    )}

                    {/* Trending */}
                    <div>
                      <div style={{ padding: '4px 16px 8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trending</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 12px' }}>
                        {trendingTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => { 
                              setSearchQuery(tag);
                              // Keep the dropdown open to show results instantly
                              searchRef.current?.focus(); 
                            }}
                            style={{ padding: '5px 12px', borderRadius: 20, background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <TrendingUp size={11} style={{ color: 'var(--primary)' }} />
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Suggested profiles */}
                    <div>
                      <div style={{ padding: '4px 16px 8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suggested</span>
                      </div>
                      {suggestedUsers.map(u => (
                        <Link
                          key={u.id}
                          href={`/profile/${u.id}`}
                          onClick={() => setShowDropdown(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', textDecoration: 'none', color: 'inherit' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.display_name}</span>
                              {u.is_verified && <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#fff' }}>✓</span>}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>@{u.username}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* With query: show filtered results */}
                {query && (
                  <div>
                    {/* Category tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '0 12px' }}>
                      {(['all', 'users', 'videos'] as const).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          style={{
                            padding: '10px 14px',
                            fontSize: '0.75rem',
                            fontWeight: activeCategory === cat ? 700 : 500,
                            color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeCategory === cat ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {cat === 'all' ? 'All' : cat === 'users' ? `Users (${userResults.length})` : `Videos (${videoResults.length})`}
                        </button>
                      ))}
                    </div>

                    {/* Users */}
                    {showUsers && userResults.length > 0 && (
                      <div style={{ padding: '8px 0' }}>
                        {activeCategory === 'all' && (
                          <div style={{ padding: '4px 16px 6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Users</span>
                          </div>
                        )}
                        {userResults.slice(0, activeCategory === 'all' ? 3 : 10).map(user => (
                          <Link
                            key={user.id}
                            href={`/profile/${user.id}`}
                            onClick={() => { addRecentSearch(user.username); setShowDropdown(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', textDecoration: 'none', color: 'inherit' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <img src={user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user.display_name}</span>
                                {user.is_verified && <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#fff' }}>✓</span>}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>@{user.username} · {formatCount(user.followers_count)} followers</span>
                            </div>
                            <User size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Divider */}
                    {showUsers && showVideos && userResults.length > 0 && videoResults.length > 0 && activeCategory === 'all' && (
                      <div style={{ height: 1, background: 'var(--glass-border)', margin: '0 16px' }} />
                    )}

                    {/* Videos */}
                    {showVideos && videoResults.length > 0 && (
                      <div style={{ padding: '8px 0' }}>
                        {activeCategory === 'all' && (
                          <div style={{ padding: '4px 16px 6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Videos</span>
                          </div>
                        )}
                        {videoResults.slice(0, activeCategory === 'all' ? 4 : 10).map(video => (
                          <Link
                            key={video.id}
                            href={`/video/${video.id}`}
                            onClick={() => { addRecentSearch(searchQuery); setShowDropdown(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', textDecoration: 'none', color: 'inherit' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ width: 40, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#222', position: 'relative' }}>
                              <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', bottom: 2, left: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Play size={7} fill="white" color="white" />
                                <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 600 }}>{formatCount(video.views_count)}</span>
                              </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{video.caption}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <img src={video.user.avatar_url} alt="" style={{ width: 14, height: 14, borderRadius: '50%' }} />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{video.user.username}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>· {formatCount(video.likes_count)} likes</span>
                              </div>
                            </div>
                            <Video size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* No results */}
                    {!hasResults && (
                      <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                        <Search size={28} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 4px' }}>No results for "{query}"</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Try searching for users, videos, or tags</p>
                      </div>
                    )}

                    {/* Search for query prompt */}
                    {query && (
                      <button
                        onClick={() => handleSearch(searchQuery)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                          background: 'none', border: 'none', borderTop: '1px solid var(--glass-border)',
                          cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <Search size={14} />
                        Search for "{query}"
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions */}
        <div className="top-navbar-actions">
          <motion.button
            className="top-navbar-upload-btn"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openUpload}
          >
            <PlusSquare size={16} />
            <span>Upload</span>
          </motion.button>

          <button className="top-navbar-icon-btn" title="Notifications">
            <Bell size={20} strokeWidth={1.8} />
            <span className="top-navbar-badge">3</span>
          </button>

          <Link href="/messages" className="top-navbar-icon-btn" title="Messages">
            <MessageCircle size={20} strokeWidth={1.8} />
          </Link>

          <Link href="/profile" className="top-navbar-avatar">
            <Avatar src={profile.avatar_url} alt={profile.username} size="sm" ring />
          </Link>
        </div>
      </div>
    </header>
  );
}
