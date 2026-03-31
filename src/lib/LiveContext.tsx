'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MOCK_LIVE_STREAMS } from './constants';

export interface ActiveLive {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  title: string;
  viewer_count: number;
  started_at: string;
  is_self?: boolean;
}

interface LiveContextType {
  activeLives: ActiveLive[];
  addLive: (live: ActiveLive) => void;
  removeLive: (id: string) => void;
  isUserLive: boolean;
  setIsUserLive: (val: boolean) => void;
}

const LiveContext = createContext<LiveContextType>({
  activeLives: [],
  addLive: () => {},
  removeLive: () => {},
  isUserLive: false,
  setIsUserLive: () => {},
});

export function LiveProvider({ children }: { children: ReactNode }) {
  const [activeLives, setActiveLives] = useState<ActiveLive[]>([]);
  const [isUserLive, setIsUserLive] = useState(false);

  // Fetch and subscribe to real live streams from Supabase
  useEffect(() => {
    import('./supabase/client').then(({ createClient }) => {
      const supabase = createClient();

      // 1. Initial fetch of active live streams
      const fetchStreams = async () => {
        const { data, error } = await supabase
          .from('live_streams')
          .select('id, user_id, username, avatar_url, title, viewer_count, started_at')
          .eq('is_live', true)
          .order('viewer_count', { ascending: false });

        if (!error && data) {
          setActiveLives(data.map(s => ({
            id: s.id,
            username: s.username || 'user',
            display_name: s.username || 'User', // Use username as display_name for now
            avatar_url: s.avatar_url || '',
            title: s.title || 'Live Video',
            viewer_count: s.viewer_count || 0,
            started_at: s.started_at,
          })));
        }
      };

      fetchStreams();

      // 2. Subscribe to changes
      const channel = supabase.channel('public:live_streams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            if (newRecord.is_live) {
              // Add or update
              setActiveLives(prev => {
                const exists = prev.find(l => l.id === newRecord.id);
                if (exists) {
                  return prev.map(l => l.id === newRecord.id ? { ...l, viewer_count: newRecord.viewer_count } : l);
                }
                return [{
                  id: newRecord.id,
                  username: newRecord.username || 'user',
                  display_name: newRecord.username || 'User',
                  avatar_url: newRecord.avatar_url || '',
                  title: newRecord.title || 'Live Video',
                  viewer_count: newRecord.viewer_count || 0,
                  started_at: newRecord.started_at || new Date().toISOString(),
                }, ...prev];
              });
            } else {
              // Went offline
              setActiveLives(prev => prev.filter(l => l.id !== newRecord.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as any;
            setActiveLives(prev => prev.filter(l => l.id !== oldRecord.id));
          }
        })
        .subscribe();

      // Refresh viewer counts every 15s to catch up if not pushed real-time efficiently
      const interval = setInterval(fetchStreams, 15000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    });
  }, []);

  const addLive = useCallback((live: ActiveLive) => {
    setActiveLives(prev => {
      if (prev.find(l => l.id === live.id)) return prev;
      return [live, ...prev];
    });
  }, []);

  const removeLive = useCallback((id: string) => {
    setActiveLives(prev => prev.filter(l => l.id !== id));
  }, []);

  return (
    <LiveContext.Provider value={{ activeLives, addLive, removeLive, isUserLive, setIsUserLive }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  return useContext(LiveContext);
}
