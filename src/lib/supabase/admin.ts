import { createClient } from './client';

const supabase = createClient();

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
  is_banned: boolean;
  is_omajanwba_admin: boolean;
  ban_reason: string | null;
}

export interface AdminVideo {
  id: string;
  user_id: string;
  caption: string;
  video_url: string;
  thumbnail_url: string;
  views_count: number;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export interface Report {
  id: string;
  reporter_id: string;
  targeted_user_id: string;
  targeted_video_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter: { username: string; avatar_url: string };
  targeted_user: { username: string; avatar_url: string };
}

/** Check if current user is admin */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_omajanwba_admin')
    .eq('id', userId)
    .single();
  return !!data?.is_omajanwba_admin;
}

/** Get top-level dashboard metrics */
export async function getAdminMetrics() {
  const [users, videos, streams] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('videos').select('*', { count: 'exact', head: true }),
    supabase.from('live_streams').select('*', { count: 'exact', head: true }).eq('is_live', true),
  ]);

  return {
    totalUsers: users.count || 0,
    totalVideos: videos.count || 0,
    activeStreams: streams.count || 0,
  };
}

/** Users Management */
export async function fetchAdminUsers(limit = 50): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at, is_banned, is_omajanwba_admin, ban_reason')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('fetchAdminUsers error:', error);
    return [];
  }
  return data as AdminUser[];
}

export async function adminBanUser(targetUserId: string, banStatus: boolean, reason?: string): Promise<boolean> {
  const { error } = await supabase.rpc('admin_ban_user', {
    target_user_id: targetUserId,
    ban_status: banStatus,
    reason: reason || null
  });
  return !error;
}

/** Video Management */
export async function fetchAdminVideos(limit = 50): Promise<AdminVideo[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, user_id, caption, video_url, thumbnail_url, views_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const userIds = Array.from(new Set(data.map(v => v.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const profileMap = profiles?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {}) || {};

  return data.map((v: any) => ({
    ...v,
    user: profileMap[v.user_id] || { username: 'Unknown', avatar_url: '' },
  }));
}

export async function adminDeleteVideo(videoId: string): Promise<boolean> {
  const { error } = await supabase.rpc('admin_delete_video', {
    target_video_id: videoId,
  });
  return !error;
}

/** Reports Management */
export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(username, avatar_url), targeted_user:profiles!reports_targeted_user_id_fkey(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as Report[];
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId);
  return !error;
}

/** Support/Warning Communication */
export async function sendAdminWarning(adminId: string, targetUserId: string, messageText: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .insert({
      sender_id: adminId,
      receiver_id: targetUserId,
      text: `[OFFICIAL WARNING] ${messageText}`,
      read: false,
    });
  
  if (!error) {
    // Optionally trigger a notification
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'mention',
      message: 'You received an official warning from Omajanwba Admin.',
      reference_id: adminId,
    });
  }

  return !error;
}

export async function submitReport(reporterId: string, targetedUserId: string, reason: string, targetedVideoId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      targeted_user_id: targetedUserId,
      targeted_video_id: targetedVideoId || null,
      reason,
      status: 'pending'
    });
  return !error;
}
