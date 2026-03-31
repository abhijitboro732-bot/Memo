import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DBMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

// Map DB row to our app's DBMessage interface
function rowToMessage(row: Record<string, unknown>): DBMessage {
  return {
    id: row.id as string,
    sender_id: row.sender_id as string,
    receiver_id: row.receiver_id as string,
    text: (row.content as string) || '',
    read: (row.is_read as boolean) ?? false,
    created_at: row.created_at as string,
  };
}

/**
 * Send a message — saves to Supabase
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string
): Promise<DBMessage | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: text,
      })
      .select()
      .single();

    if (!error && data) {
      return rowToMessage(data as Record<string, unknown>);
    }
    console.error('Send message error:', error?.message);
  } catch (err) {
    console.error('Send message exception:', err);
  }

  // Fallback: return a local-only message so the UI doesn't break
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sender_id: senderId,
    receiver_id: receiverId,
    text,
    read: false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Fetch messages between two users
 */
export async function fetchMessages(
  userId: string,
  otherUserId: string,
  limit = 50
): Promise<DBMessage[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!error && data) {
      return (data as Record<string, unknown>[]).map(rowToMessage);
    }
    console.error('Fetch messages error:', error?.message);
  } catch (err) {
    console.error('Fetch messages exception:', err);
  }
  return [];
}

/**
 * Get conversation summaries
 */
export async function fetchConversationSummaries(userId: string): Promise<{
  otherUserId: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  lastSenderId: string;
}[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = (data as Record<string, unknown>[]).map(rowToMessage);
      const convMap = new Map<string, {
        otherUserId: string; lastMessage: string; lastTime: string;
        unreadCount: number; lastSenderId: string;
      }>();

      for (const msg of rows) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            otherUserId, lastMessage: msg.text, lastTime: msg.created_at,
            unreadCount: 0, lastSenderId: msg.sender_id,
          });
        }
        if (msg.receiver_id === userId && !msg.read) {
          convMap.get(otherUserId)!.unreadCount++;
        }
      }

      return Array.from(convMap.values()).sort(
        (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      );
    }
  } catch (err) {
    console.error('Fetch summaries exception:', err);
  }
  return [];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  currentUserId: string,
  senderId: string
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);
  } catch (err) {
    console.error('Mark read exception:', err);
  }
}

/**
 * Get total unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (!error) return count || 0;
  } catch {}
  return 0;
}

/**
 * Subscribe to new messages via Supabase Realtime
 */
export function subscribeToMessages(
  userId: string,
  onNewMessage: (message: DBMessage) => void
): RealtimeChannel | null {
  try {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          onNewMessage(rowToMessage(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();
    return channel;
  } catch {
    return null;
  }
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  try {
    const supabase = createClient();
    supabase.removeChannel(channel);
  } catch {}
}
