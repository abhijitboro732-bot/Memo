'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, Eye, UserPlus, Check, ChevronRight, Flame, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { MOCK_LIVE_STREAMS, MOCK_USERS, formatCount } from '@/lib/constants';
import { fetchRealUsers } from '@/lib/supabase/users';
import { User } from '@/types';

// Fallback mock suggestions
const FALLBACK_SUGGESTED: { user: User; reason: string }[] = MOCK_USERS.slice(0, 4).map(u => ({
  user: u,
  reason: u.is_verified ? 'Verified creator' : 'Popular on Voxo',
}));

const TRENDING_TAGS = [
  { tag: '#DanceChallenge', views: '12.4M', trending: true },
  { tag: '#CookingFails', views: '8.7M', trending: true },
  { tag: '#TravelVlog', views: '5.2M', trending: false },
  { tag: '#FitnessGoals', views: '3.8M', trending: false },
  { tag: '#ArtProcess', views: '2.1M', trending: true },
];

function SuggestedUserCard({ user, reason }: { user: User; reason: string }) {
  const [followed, setFollowed] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('skipsee_following') || '[]');
      return ids.includes(user.id);
    } catch { return false; }
  });

  const toggleFollow = () => {
    try {
      const ids = JSON.parse(localStorage.getItem('skipsee_following') || '[]');
      const next = followed ? ids.filter((id: string) => id !== user.id) : [...ids, user.id];
      localStorage.setItem('skipsee_following', JSON.stringify(next));
      setFollowed(!followed);
    } catch {}
  };

  return (
    <div className="flex items-center gap-3 py-2 group">
      <Link href={`/profile/${user.id}`}>
        <Avatar src={user.avatar_url} alt={user.username} size="md" live={user.is_live} ring={user.is_live} />
      </Link>
      <Link href={`/profile/${user.id}`} className="flex-1 min-w-0" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold truncate">{user.username}</p>
          {user.is_verified && (
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-[7px] font-bold shrink-0">✓</span>
          )}
        </div>
        <p className="text-[11px] text-text-secondary truncate">{reason}</p>
      </Link>
      <motion.button
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          followed
            ? 'bg-surface-light text-text-secondary border border-glass-border'
            : 'bg-primary/15 text-primary hover:bg-primary/25'
        }`}
        onClick={toggleFollow}
        whileTap={{ scale: 0.92 }}
      >
        {followed ? (
          <span className="flex items-center gap-1"><Check size={12} /> Following</span>
        ) : (
          <span className="flex items-center gap-1"><UserPlus size={12} /> Follow</span>
        )}
      </motion.button>
    </div>
  );
}

export default function RightSidebar() {
  const [suggestedUsers, setSuggestedUsers] = useState<{ user: User; reason: string }[]>(FALLBACK_SUGGESTED);

  // Fetch real users from posts table
  useEffect(() => {
    fetchRealUsers(6).then(users => {
      if (users.length > 0) {
        const reasons = ['New on Voxo', 'Popular creator', 'Followed by friends', 'Trending', 'Suggested for you', 'Active now'];
        setSuggestedUsers(users.map((u, i) => ({ user: u, reason: reasons[i % reasons.length] })));
      }
    });
  }, []);

  return (
    <aside className="hidden xl:block w-[300px] sticky top-[var(--navbar-height)] overflow-y-auto no-scrollbar py-6 px-5 bg-background border-l border-glass-border" style={{ height: 'calc(100vh - var(--navbar-height))' }}>
      {/* Live Now */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live Now
          </h3>
          <button className="text-xs text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
            See all <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-1">
          {MOCK_LIVE_STREAMS.slice(0, 3).map((stream) => (
            <motion.button
              key={stream.id}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-glass transition-colors text-left"
              whileHover={{ x: 2 }}
            >
              <div className="relative">
                <Avatar src={stream.user.avatar_url} alt={stream.user.username} size="md" live />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{stream.user.username}</p>
                <p className="text-[11px] text-text-secondary truncate">{stream.title}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                <Eye size={11} className="text-primary" />
                <span>{formatCount(stream.viewer_count)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-6" />

      {/* Suggested Accounts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-display flex items-center gap-2">
            <Sparkles size={14} className="text-accent-light" />
            Suggested Accounts
          </h3>
        </div>

        <div className="space-y-1">
          {suggestedUsers.map((item) => (
            <SuggestedUserCard key={item.user.id} user={item.user} reason={item.reason} />
          ))}
        </div>
      </div>

      <div className="mb-6" />

      {/* Trending */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-display flex items-center gap-2">
            <TrendingUp size={14} className="text-warning" />
            Trending Now
          </h3>
        </div>

        <div className="space-y-2">
          {TRENDING_TAGS.map((item, index) => (
            <motion.button
              key={item.tag}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-glass transition-colors text-left group"
              whileHover={{ x: 2 }}
            >
              <span className="text-xs font-bold text-text-secondary/50 w-4">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.tag}</p>
                  {item.trending && <Flame size={12} className="text-warning" />}
                </div>
                <p className="text-[11px] text-text-secondary">{item.views} views</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-secondary/50">
          <span>About</span>
          <span>Terms</span>
          <Link href="/privacy" className="hover:text-foreground hover:underline transition-colors">Privacy</Link>
          <span>Help</span>
          <span>Safety</span>
        </div>
        <p className="text-[10px] text-text-secondary/30 mt-2">© 2024 Voxo</p>
      </div>
    </aside>
  );
}
