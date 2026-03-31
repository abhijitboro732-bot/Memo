'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, UserPlus, Heart, MessageCircle, Radio, AtSign,
  Lock, Check, CheckCheck, Trash2, Settings
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  requestNotificationPermission,
  getUnreadNotificationCount,
  type DBNotification,
} from '@/lib/supabase/notifications';
import { unsubscribeChannel } from '@/lib/supabase/messaging';
import type { RealtimeChannel } from '@supabase/supabase-js';

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  follow: { icon: UserPlus, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  like: { icon: Heart, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  comment: { icon: MessageCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  live: { icon: Radio, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  mention: { icon: AtSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const { user, openAuthModal } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'follow' | 'like' | 'live'>('all');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load notifications
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    setLoading(true);
    fetchNotifications(user.id).then(notifs => {
      setNotifications(notifs);
      setLoading(false);
    });

    // Mark all as read when page opens
    markAllNotificationsRead(user.id);

    // Check notification permission
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
      setShowPermBanner(Notification.permission === 'default');
    }
  }, [user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = subscribeToNotifications(user.id, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
    });
    channelRef.current = channel;

    return () => {
      unsubscribeChannel(channelRef.current);
    };
  }, [user]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    setShowPermBanner(false);
  };

  const handleNotifClick = (notif: DBNotification) => {
    markNotificationRead(notif.id, user!.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));

    // Navigate based on type
    switch (notif.type) {
      case 'follow':
        router.push(`/profile/${notif.from_user_id}`);
        break;
      case 'live':
        router.push('/live');
        break;
      case 'like':
      case 'comment':
        if (notif.reference_id) router.push(`/video/${notif.reference_id}`);
        break;
    }
  };

  const filteredNotifs = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── NOT LOGGED IN ──
  if (!user) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--background)',
        gap: 16, padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <Lock size={32} color="#8b5cf6" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)' }}>Sign in for Notifications</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 300 }}>
          Stay updated when someone follows you, likes your content, or goes live
        </p>
        <motion.button
          onClick={openAuthModal}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '12px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 8px 30px rgba(139,92,246,0.3)',
          }}
        >
          Sign In
        </motion.button>
      </div>
    );
  }

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)',
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid rgba(139,92,246,0.25)',
          borderTop: '3px solid #8b5cf6', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--background)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px', background: 'var(--surface)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)' }}>Notifications</h1>
            {unreadCount > 0 && (
              <p style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600, marginTop: 2 }}>
                {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllNotificationsRead(user.id);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)',
                  background: 'var(--glass)', cursor: 'pointer', fontSize: '0.7rem',
                  fontWeight: 600, color: 'var(--text-secondary)', display: 'flex',
                  alignItems: 'center', gap: 4,
                }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {(['all', 'follow', 'like', 'live'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                background: filter === f
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                  : 'var(--glass)',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? 'All' : f === 'follow' ? '👥 Follows' : f === 'like' ? '❤️ Likes' : '🔴 Live'}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Banner */}
      <AnimatePresence>
        {showPermBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              margin: '12px 16px', padding: '14px 16px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))',
              border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>
                Enable Push Notifications
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Get notified when followers go live or someone follows you
              </p>
            </div>
            <motion.button
              onClick={handleEnableNotifications}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
              }}
            >
              Enable
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div>
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((notif, i) => {
            const config = NOTIF_ICONS[notif.type] || NOTIF_ICONS.follow;
            const IconComponent = config.icon;
            return (
              <motion.button
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', width: '100%',
                  background: notif.read ? 'transparent' : 'rgba(139,92,246,0.04)',
                  border: 'none', borderBottom: '1px solid var(--glass-border)',
                  cursor: 'pointer', textAlign: 'left', position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                onMouseLeave={e => (e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(139,92,246,0.04)')}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span style={{
                    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                    width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6',
                  }} />
                )}

                {/* Avatar with icon badge */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={notif.from_avatar_url}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 22, height: 22, borderRadius: '50%',
                    background: config.bg, border: '2px solid var(--background)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconComponent size={11} color={config.color} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.85rem', color: 'var(--foreground)',
                    fontWeight: notif.read ? 400 : 600, lineHeight: 1.4,
                  }}>
                    <span style={{ fontWeight: 700 }}>{notif.from_display_name}</span>
                    {' '}
                    {notif.type === 'follow' ? 'started following you' :
                     notif.type === 'like' ? 'liked your video' :
                     notif.type === 'comment' ? 'commented on your video' :
                     notif.type === 'live' ? 'is now LIVE! 🔴' :
                     notif.message}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                    {timeAgo(notif.created_at)}
                  </p>
                </div>

                {/* Action button for follows */}
                {notif.type === 'follow' && (
                  <div style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    View
                  </div>
                )}

                {/* Live badge */}
                {notif.type === 'live' && (
                  <div style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#fff',
                      animation: 'pulse 1.5s infinite',
                    }} />
                    Watch
                  </div>
                )}
              </motion.button>
            );
          })
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 24px', gap: 12,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={30} color="#8b5cf6" />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
              No notifications yet
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280 }}>
              When someone follows you, likes your videos, or goes live, you&apos;ll see it here
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
