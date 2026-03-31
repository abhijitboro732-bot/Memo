'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar_url: string;
  text: string;
  type: 'message' | 'join' | 'gift' | 'system';
  timestamp: string;
}

interface UseLiveChannelOptions {
  roomId: string;
  userId: string;
  username: string;
  avatar_url: string;
  role: 'broadcaster' | 'viewer';
}

interface UseLiveChannelReturn {
  messages: LiveChatMessage[];
  viewerCount: number;
  viewers: { userId: string; username: string; avatar_url: string }[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

export function useLiveChannel({
  roomId,
  userId,
  username,
  avatar_url,
  role,
}: UseLiveChannelOptions): UseLiveChannelReturn {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState<{ userId: string; username: string; avatar_url: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const supabase = createClient();
    const channelName = `live-stream:${roomId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    // Listen for chat messages via broadcast
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (payload) {
        setMessages(prev => [...prev.slice(-80), payload as LiveChatMessage]);
      }
    });

    // Listen for system events (e.g., gifts, joins)
    channel.on('broadcast', { event: 'system' }, ({ payload }) => {
      if (payload) {
        setMessages(prev => [...prev.slice(-80), payload as LiveChatMessage]);
      }
    });

    // Presence: track viewers
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const allViewers: { userId: string; username: string; avatar_url: string }[] = [];
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p: any) => {
          allViewers.push({
            userId: p.userId || '',
            username: p.username || 'viewer',
            avatar_url: p.avatar_url || '',
          });
        });
      });
      setViewers(allViewers);
      setViewerCount(allViewers.length);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      // Send a join notification
      if (newPresences && newPresences[0]) {
        const joiner = newPresences[0] as any;
        if (joiner.userId !== userId) {
          setMessages(prev => [...prev.slice(-80), {
            id: `join-${Date.now()}-${Math.random()}`,
            userId: joiner.userId,
            username: joiner.username || 'Someone',
            avatar_url: joiner.avatar_url || '',
            text: 'joined the stream',
            type: 'join',
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track({
          userId,
          username,
          avatar_url,
          role,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, userId, username, avatar_url, role]);

  const sendMessage = useCallback((text: string) => {
    if (!channelRef.current || !text.trim()) return;

    const message: LiveChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      username,
      avatar_url,
      text: text.trim(),
      type: 'message',
      timestamp: new Date().toISOString(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: message,
    });
  }, [userId, username, avatar_url]);

  return { messages, viewerCount, viewers, sendMessage, isConnected };
}
