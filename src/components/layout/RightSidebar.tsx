'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, Eye, ChevronRight, Flame } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { MOCK_LIVE_STREAMS, formatCount } from '@/lib/constants';

const TRENDING_TAGS = [
  { tag: '#DanceChallenge', views: '12.4M', trending: true },
  { tag: '#CookingFails', views: '8.7M', trending: true },
  { tag: '#TravelVlog', views: '5.2M', trending: false },
  { tag: '#FitnessGoals', views: '3.8M', trending: false },
  { tag: '#ArtProcess', views: '2.1M', trending: true },
];



export default function RightSidebar() {

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
