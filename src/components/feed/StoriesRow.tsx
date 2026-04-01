'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Mock data for stories
const STORIES = [
  { id: 1, username: 'alex.dev', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, username: 'sarah_codes', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, username: 'mike_design', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, username: 'jess.tech', avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: 5, username: 'david_builds', avatar: 'https://i.pravatar.cc/150?u=5' },
  { id: 6, username: 'emma.ui', avatar: 'https://i.pravatar.cc/150?u=6' },
  { id: 7, username: 'chris_ux', avatar: 'https://i.pravatar.cc/150?u=7' },
  { id: 8, username: 'lisa.web', avatar: 'https://i.pravatar.cc/150?u=8' },
  { id: 9, username: 'tom_stack', avatar: 'https://i.pravatar.cc/150?u=9' },
  { id: 10, username: 'anna.sys', avatar: 'https://i.pravatar.cc/150?u=10' },
  { id: 11, username: 'ben_coder', avatar: 'https://i.pravatar.cc/150?u=11' },
  { id: 12, username: 'claire_sql', avatar: 'https://i.pravatar.cc/150?u=12' },
  { id: 13, username: 'dan_react', avatar: 'https://i.pravatar.cc/150?u=13' },
  { id: 14, username: 'eva_node', avatar: 'https://i.pravatar.cc/150?u=14' },
];

export default function StoriesRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
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
  }, []);

  return (
    <div className="w-full max-w-[900px] mx-auto relative mb-8 rounded-2xl bg-black/40 border border-white/10 p-4 shrink-0">
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all shadow-xl"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* 
        overflow-x-hidden precisely prevents native user scrolling and scrollbar 
        while preserving Javascript's scrollBy behavior
      */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-nowrap gap-4 overflow-x-hidden min-h-[90px]"
      >
        {/* Your Story */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer w-[72px]">
          <div className="w-[66px] h-[66px] rounded-full border-2 border-dashed border-white/30 flex items-center justify-center relative bg-white/5 hover:bg-white/10 transition-colors">
            <span className="text-xl text-white/70">+</span>
          </div>
          <span className="text-[11px] text-white/70 font-medium truncate w-full text-center">Your Story</span>
        </div>

        {/* Mapped Stories */}
        {STORIES.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer w-[72px] hover:opacity-90 transition-opacity">
            <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
              <div className="w-full h-full rounded-full border-[2px] border-black overflow-hidden relative">
                <img src={story.avatar} alt={story.username} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[11px] text-white/90 font-medium truncate w-full text-center">
              {story.username}
            </span>
          </div>
        ))}
      </div>

      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all shadow-xl"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
