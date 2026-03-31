'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Shuffle, Radio, User, Compass,
  Bell, MessageCircle, PlusSquare, Settings, LogOut,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { CURRENT_USER } from '@/lib/constants';
import { useUpload } from '@/lib/UploadContext';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/lib/ProfileContext';
import { useLive } from '@/lib/LiveContext';
import { getUnreadNotificationCount } from '@/lib/supabase/notifications';

const mainNav = [
  { id: 'home', label: 'For You', icon: Home, href: '/' },
  { id: 'random', label: 'Random Chat', icon: Shuffle, href: '/random' },
  { id: 'live', label: 'LIVE', icon: Radio, href: '/live', badge: true },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];

const secondaryNav = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/notifications', count: 0 },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages', count: 0 },
];

export default function LeftSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const getActiveId = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/random')) return 'random';
    if (pathname.startsWith('/live')) return 'live';
    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/explore')) return 'explore';
    if (pathname.startsWith('/notifications')) return 'notifications';
    if (pathname.startsWith('/messages')) return 'messages';
    return 'home';
  };

  const activeId = getActiveId();
  const { openUpload } = useUpload();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { activeLives } = useLive();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { user } = useAuth();
  const [notifCount, setNotifCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    if (user?.id) {
      getUnreadNotificationCount(user.id).then(c => setNotifCount(c));
      // Refresh every 30 seconds
      const timer = setInterval(() => {
        getUnreadNotificationCount(user.id).then(c => setNotifCount(c));
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Detect mouse near left edge to trigger expand
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20 && !expanded) {
        setExpanded(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [expanded]);

  const handleMouseLeave = () => {
    setExpanded(false);
  };

  return (
    <aside
      ref={sidebarRef}
      className="hidden lg:flex flex-col sticky top-0 bg-background border-r border-glass-border z-40 overflow-hidden"
      style={{
        width: expanded ? 240 : 64,
        height: 'calc(100vh - var(--navbar-height) - var(--storybar-height))',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setExpanded(true)}
    >
      {/* Spacer */}
      <div className="h-4" />

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-1" style={{ padding: expanded ? '0 8px' : '0' }}>
        {mainNav.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={`group relative flex items-center rounded-xl transition-all duration-200 ${
                expanded ? 'gap-3.5 px-4 py-3 w-full' : 'w-12 h-12 justify-center'
              } ${
                isActive
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-foreground hover:bg-glass'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <div className={`relative z-10 flex items-center ${expanded ? 'gap-3.5' : 'gap-0'}`}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`shrink-0 ${isActive ? 'text-primary' : ''}`}
                />
                <span
                  className={`text-[15px] whitespace-nowrap overflow-hidden ${isActive ? 'font-bold' : 'font-medium'}`}
                  style={{
                    opacity: expanded ? 1 : 0,
                    width: expanded ? 'auto' : 0,
                    transition: 'opacity 0.25s ease, width 0.25s ease',
                  }}
                >
                  {item.label}
                </span>
              </div>
              {item.badge && expanded && (
                <span className="relative z-10 ml-auto live-badge text-[9px] py-0.5 px-1.5">LIVE</span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-glass-border my-3" style={{ margin: expanded ? '12px 8px' : '12px 10px' }} />

        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          const displayCount = item.id === 'notifications' ? notifCount : (item.count || 0);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={`group relative flex items-center rounded-xl transition-all duration-200 ${
                expanded ? 'gap-3.5 px-4 py-2.5 w-full' : 'w-12 h-12 justify-center'
              } ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-foreground hover:bg-glass'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className={`shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {/* Badge dot when collapsed */}
                {!expanded && displayCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-primary text-[8px] font-bold flex items-center justify-center px-0.5 text-white">
                    {displayCount > 9 ? '9+' : displayCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[14px] whitespace-nowrap overflow-hidden ${isActive ? 'font-bold' : 'font-medium'}`}
                style={{
                  opacity: expanded ? 1 : 0,
                  width: expanded ? 'auto' : 0,
                  transition: 'opacity 0.25s ease, width 0.25s ease',
                }}
              >
                {item.label}
              </span>
              {displayCount > 0 && expanded && (
                <span className="ml-auto min-w-[20px] h-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center px-1.5 text-white">
                  {displayCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-glass-border" style={{ margin: expanded ? '12px 8px' : '12px 10px' }} />

        {/* Live Now Section */}
        {activeLives.length > 0 && (
          <div className="px-2 mb-2">
            {expanded && (
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </p>
            )}
            <div className={`flex ${expanded ? 'flex-col gap-1' : 'flex-col items-center gap-2'}`}>
              {activeLives.slice(0, expanded ? 5 : 3).map(live => (
                <Link
                  key={live.id}
                  href={`/live?stream=${live.id}`}
                  className={`group flex items-center gap-2.5 rounded-xl transition-all duration-200 ${expanded ? 'px-3 py-2 hover:bg-glass' : 'p-0 justify-center'}`}
                  title={!expanded ? `${live.display_name} is live` : undefined}
                >
                  <div className="relative shrink-0">
                    <img
                      src={live.avatar_url}
                      alt={live.username}
                      className="w-8 h-8 rounded-full object-cover"
                      style={{ border: '2px solid #ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.3)' }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-background" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </div>
                  {expanded && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{live.display_name}</p>
                      <p className="text-[10px] text-text-secondary truncate flex items-center gap-1">
                        <span className="text-red-400 font-bold">LIVE</span>
                        · {live.viewer_count.toLocaleString()} watching
                      </p>
                    </div>
                  )}
                </Link>
              ))}
              {activeLives.length > (expanded ? 5 : 3) && expanded && (
                <Link href="/live" className="text-[11px] text-primary font-medium px-3 py-1 hover:underline">
                  See all ({activeLives.length})
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="h-px bg-glass-border" style={{ margin: expanded ? '12px 8px' : '12px 10px' }} />

        {/* Upload Button */}
        <motion.button
          className={`flex items-center rounded-xl bg-gradient-to-r from-primary to-accent-light text-white font-semibold text-sm shadow-lg shadow-primary/20 ${
            expanded ? 'gap-3.5 px-4 py-3 w-full' : 'w-12 h-12 justify-center'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openUpload}
        >
          <PlusSquare size={20} className="shrink-0" />
          <span
            className="whitespace-nowrap overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              transition: 'opacity 0.25s ease, width 0.25s ease',
            }}
          >
            Upload Video
          </span>
        </motion.button>
      </nav>

      {/* User Section */}
      <div className="px-2 pb-4 relative">
        <div
          className={`flex items-center gap-3 py-2.5 rounded-xl hover:bg-glass transition-colors ${
            expanded ? 'px-3 w-full' : 'justify-center'
          }`}
        >
          <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar src={profile.avatar_url} alt={profile.username} size="sm" ring />
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.display_name}</p>
                <p className="text-xs text-text-secondary truncate">@{profile.username}</p>
              </div>
            )}
          </Link>
          {expanded && (
            <button
              className="text-text-secondary hover:text-foreground transition-colors shrink-0 p-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSettingsMenu(!showSettingsMenu);
              }}
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* Settings popup menu */}
        <AnimatePresence>
          {showSettingsMenu && expanded && (
            <motion.div
              className="sidebar-settings-menu"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                href="/profile"
                className="sidebar-settings-item"
                onClick={() => setShowSettingsMenu(false)}
              >
                <User size={15} />
                <span>My Profile</span>
              </Link>
              <Link
                href="/profile"
                className="sidebar-settings-item"
                onClick={() => setShowSettingsMenu(false)}
              >
                <Settings size={15} />
                <span>Settings</span>
              </Link>
              <div className="sidebar-settings-divider" />
              <button
                className="sidebar-settings-item sidebar-settings-logout"
                onClick={async () => {
                  setShowSettingsMenu(false);
                  await signOut();
                }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
