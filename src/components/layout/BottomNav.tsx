'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Shuffle, Radio, User, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'random', label: 'Random', icon: Shuffle, href: '/random' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
  { id: 'live', label: 'Live', icon: Radio, href: '/live' },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/random')) return 'random';
    if (pathname.startsWith('/messages')) return 'messages';
    if (pathname.startsWith('/live')) return 'live';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong" id="bottom-nav">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="relative flex flex-col items-center justify-center w-16 h-full gap-0.5"
              id={`nav-${tab.id}`}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,45,85,0.15), rgba(168,85,247,0.15))',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-text-secondary'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {tab.label}
              </span>
              {tab.id === 'live' && (
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
