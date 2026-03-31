import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DBNotification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: 'follow' | 'like' | 'comment' | 'live' | 'mention';
  message: string;
  reference_id: string;
  read: boolean;
  created_at: string;
  // Joined profile fields
  from_username?: string;
  from_display_name?: string;
  from_avatar_url?: string;
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  fromUserId: string,
  type: DBNotification['type'],
  message: string,
  referenceId: string = ''
): Promise<boolean> {
  // Don't notify yourself
  if (userId === fromUserId) return false;

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        from_user_id: fromUserId,
        type,
        message,
        reference_id: referenceId,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    // Try browser notification
    sendBrowserNotification(message);

    return true;
  } catch {
    return false;
  }
}

/**
 * Notify all followers that a user went live
 */
export async function notifyFollowersLive(
  broadcasterId: string,
  broadcasterName: string
): Promise<void> {
  try {
    const supabase = createClient();

    // Get all follower IDs
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', broadcasterId);

    if (!followers || followers.length === 0) return;

    // Create notifications for each follower
    const notifications = followers.map(f => ({
      user_id: f.follower_id,
      from_user_id: broadcasterId,
      type: 'live' as const,
      message: `${broadcasterName} is now LIVE! 🔴`,
      reference_id: broadcasterId,
    }));

    await supabase.from('notifications').insert(notifications);

    // Send browser notification
    sendBrowserNotification(`${broadcasterName} is now LIVE! 🔴`);
  } catch (err) {
    console.error('Error notifying followers:', err);
  }
}

/**
 * Fetch notifications for a user (with profile info)
 */
export async function fetchNotifications(
  userId: string,
  limit: number = 50
): Promise<DBNotification[]> {
  try {
    const supabase = createClient();

    // Fetch notifications
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !notifs) return [];

    // Get unique from_user_ids to fetch profiles
    const fromUserIds = [...new Set(notifs.map(n => n.from_user_id))];

    let profileMap: Record<string, { username: string; display_name: string; avatar_url: string }> = {};
    if (fromUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', fromUserIds);

      if (profiles) {
        profiles.forEach(p => {
          profileMap[p.id] = {
            username: p.username || 'user',
            display_name: p.display_name || p.username || 'User',
            avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
          };
        });
      }
    }

    return notifs.map(n => ({
      ...n,
      from_username: profileMap[n.from_user_id]?.username || 'user',
      from_display_name: profileMap[n.from_user_id]?.display_name || 'User',
      from_avatar_url: profileMap[n.from_user_id]?.avatar_url || `https://i.pravatar.cc/150?u=${n.from_user_id}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  } catch {}
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notifId: string, userId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId)
      .eq('user_id', userId);
  } catch {}
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notif: DBNotification) => void
): RealtimeChannel | null {
  try {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notif = payload.new as any;

          // Fetch from_user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', notif.from_user_id)
            .single();

          onNewNotification({
            ...notif,
            from_username: profile?.username || 'user',
            from_display_name: profile?.display_name || 'User',
            from_avatar_url: profile?.avatar_url || `https://i.pravatar.cc/150?u=${notif.from_user_id}`,
          });

          // Browser notification
          sendBrowserNotification(notif.message);
        }
      )
      .subscribe();
    return channel;
  } catch {
    return null;
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Send a browser notification
 */
function sendBrowserNotification(message: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Voxo', {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  } catch {}
}
