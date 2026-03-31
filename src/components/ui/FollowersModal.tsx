'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserCheck, UserPlus } from 'lucide-react';
import { MOCK_USERS } from '@/lib/constants';
import type { User } from '@/types';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: 'followers' | 'following';
  followers: User[];
  following: User[];
  onToggleFollow: (userId: string) => void;
  followingIds: string[];
}

export default function FollowersModal({
  isOpen, onClose, initialTab, followers, following, onToggleFollow, followingIds,
}: FollowersModalProps) {
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [search, setSearch] = useState('');

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const list = tab === 'followers' ? followers : following;
  const filtered = search
    ? list.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.display_name.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[101] bg-surface-light rounded-2xl shadow-2xl overflow-hidden border border-glass-border"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(400px, 92vw)', maxHeight: '70vh',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-glass-border">
              <h3 className="text-base font-bold">{tab === 'followers' ? 'Followers' : 'Following'}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-glass flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-glass-border">
              <button
                className={`flex-1 py-2.5 text-sm font-semibold text-center relative ${tab === 'followers' ? 'text-foreground' : 'text-text-secondary'}`}
                onClick={() => setTab('followers')}
              >
                Followers ({followers.length})
                {tab === 'followers' && (
                  <motion.div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" layoutId="follow-tab" />
                )}
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-semibold text-center relative ${tab === 'following' ? 'text-foreground' : 'text-text-secondary'}`}
                onClick={() => setTab('following')}
              >
                Following ({following.length})
                {tab === 'following' && (
                  <motion.div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" layoutId="follow-tab" />
                )}
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-glass border border-glass-border">
                <Search size={14} className="text-text-secondary shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* User list */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 170px)' }}>
              {filtered.length > 0 ? (
                filtered.map(user => {
                  const isFollowing = followingIds.includes(user.id);
                  return (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-glass/50 transition-colors">
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-glass-border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold truncate">{user.display_name}</p>
                          {user.is_verified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-[7px] font-bold shrink-0">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary truncate">@{user.username}</p>
                      </div>
                      <motion.button
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          isFollowing
                            ? 'bg-surface border border-glass-border text-text-secondary hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onToggleFollow(user.id)}
                      >
                        {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                        {isFollowing ? 'Following' : 'Follow'}
                      </motion.button>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-sm text-text-secondary">
                    {search ? 'No users found' : tab === 'followers' ? 'No followers yet' : 'Not following anyone'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
