'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { fetchRealUsers } from '@/lib/supabase/users';
import { toggleFollow as apiToggleFollow, getFollowingIds } from '@/lib/supabase/follows';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import type { User } from '@/types';

// Mock data as fallback
const FALLBACK_USERS: Partial<User>[] = [
  { id: '101', username: 'tech.guru', display_name: 'Tech Insights', avatar_url: 'https://i.pravatar.cc/150?u=101' },
  { id: '102', username: 'design_inspo', display_name: 'UI Patterns', avatar_url: 'https://i.pravatar.cc/150?u=102' },
  { id: '103', username: 'dev_humor', display_name: 'Coder Jokes', avatar_url: 'https://i.pravatar.cc/150?u=103' },
  { id: '104', username: 'ai.daily', display_name: 'AI News', avatar_url: 'https://i.pravatar.cc/150?u=104' },
  { id: '105', username: 'startup.journey', display_name: 'Founder Life', avatar_url: 'https://i.pravatar.cc/150?u=105' },
  { id: '106', username: 'react_tips', display_name: 'React Mastery', avatar_url: 'https://i.pravatar.cc/150?u=106' },
  { id: '107', username: 'css_tricks', display_name: 'CSS Magic', avatar_url: 'https://i.pravatar.cc/150?u=107' },
];

export default function SuggestedStoriesRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Partial<User>[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      getFollowingIds(user.id).then(ids => setFollowedIds(ids));
    } else {
      setFollowedIds([]);
    }
  }, [user]);

  useEffect(() => {
    fetchRealUsers(20).then(users => {
      let validUsers = users;
      if (user) {
        validUsers = users.filter((u: any) => u.id !== user.id);
      }
      if (validUsers && validUsers.length > 0) {
        setSuggestedUsers(validUsers.slice(0, 10));
      } else {
        setSuggestedUsers(FALLBACK_USERS);
      }
    }).catch(() => setSuggestedUsers(FALLBACK_USERS));
  }, [user]);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [suggestedUsers]);

  const handleToggleFollow = async (id: string) => {
    if (!user) return;
    
    // Optimistic update
    setFollowedIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

    // Backend update
    await apiToggleFollow(user.id, id);
  };

  if (suggestedUsers.length === 0) return null;

  return (
    <div className="w-full max-w-[900px] mx-auto mb-8 rounded-2xl bg-black/30 border border-white/5 p-5 relative shrink-0">
      
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-white/90 font-semibold text-sm">Suggested for you</h3>
        <button className="text-[12px] text-blue-400 font-medium hover:text-blue-300">See all</button>
      </div>

      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-[55%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all shadow-xl"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-nowrap gap-3 overflow-x-hidden"
      >
        {suggestedUsers.map((creator, i) => {
          const uId = creator.id || String(i);
          const isFollowed = followedIds.includes(uId);
          return (
            <div 
              key={uId} 
              className="flex flex-col items-center justify-center gap-2 shrink-0 w-[140px] h-[180px] bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
            >
              <Link href={`/profile/${uId}`} className="flex flex-col items-center w-full group">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 mb-1 shrink-0 group-hover:border-blue-400 transition-colors">
                  <img src={creator.avatar_url} alt={creator.username} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[13px] text-white font-semibold truncate w-full text-center group-hover:text-blue-400 transition-colors">
                    {creator.username}
                  </span>
                  <span className="text-[11px] text-white/50 truncate w-full text-center mb-2">
                    {creator.display_name}
                  </span>
                </div>
              </Link>
              <button 
                onClick={() => handleToggleFollow(uId)}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  isFollowed 
                    ? 'bg-white/10 text-white/70 hover:bg-white/20' 
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/20'
                }`}
              >
                {isFollowed ? 'Following' : <><UserPlus size={12} /> Follow</>}
              </button>
            </div>
          );
        })}
      </div>

      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-[55%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all shadow-xl"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
