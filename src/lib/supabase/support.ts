import { createClient } from './client';

const supabase = createClient();

export interface SupportMessage {
  id: string;
  user_id: string;
  admin_id: string | null;
  text: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export interface SupportConversation {
  user_id: string;
  user: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  lastMessage: SupportMessage;
  unreadCount: number;
}

/** User sends a message to Support */
export async function sendUserSupportMessage(userId: string, text: string): Promise<boolean> {
  const { error } = await supabase.from('support_messages').insert({
    user_id: userId,
    text,
    is_from_admin: false,
    is_read: false,
  });
  return !error;
}

/** Admin replies to a user */
export async function sendAdminSupportMessage(adminId: string, targetUserId: string, text: string): Promise<boolean> {
  const { error } = await supabase.from('support_messages').insert({
    user_id: targetUserId,
    admin_id: adminId,
    text,
    is_from_admin: true,
    is_read: false,
  });
  return !error;
}

/** Normal User fetching their own support chat */
export async function fetchUserSupportMessages(userId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true }); // Earliest to latest for chat UI

  if (error || !data) return [];
  return data as SupportMessage[];
}

/** Admin Dashboard fetches all active conversations */
export async function fetchAdminSupportConversations(): Promise<SupportConversation[]> {
  // To get conversations, we pull all messages, then group by user.
  // In a massive app, you would use a dedicated conversation table or SQL View,
  // but for Omajanwba dashboard, we can group recent messages cleanly.
  const { data, error } = await supabase
    .from('support_messages')
    .select('*, profiles!support_messages_user_id_fkey(username, display_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const convos = new Map<string, SupportConversation>();
  for (const msg of data as any) {
    if (!convos.has(msg.user_id)) {
      convos.set(msg.user_id, {
        user_id: msg.user_id,
        user: msg.profiles,
        lastMessage: msg,
        unreadCount: (!msg.is_read && !msg.is_from_admin) ? 1 : 0
      });
    } else {
      const existing = convos.get(msg.user_id)!;
      if (!msg.is_read && !msg.is_from_admin) {
        existing.unreadCount += 1;
      }
    }
  }

  return Array.from(convos.values());
}

/** Admin fetches history for a specific conversation */
export async function fetchAdminConversationHistory(targetUserId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as SupportMessage[];
}

/** Admin marks messages as read */
export async function markSupportAsRead(targetUserId: string): Promise<void> {
  await supabase
    .from('support_messages')
    .update({ is_read: true })
    .eq('user_id', targetUserId)
    .eq('is_from_admin', false)
    .eq('is_read', false);
}
