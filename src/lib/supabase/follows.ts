import { createClient } from '@/lib/supabase/client';
import { createNotification } from './notifications';

/**
 * Follow a user
 */
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    // Ignore duplicate follow errors (unique constraint)
    if (error.code === '23505') return true;
    console.error('Error following user:', error);
    return false;
  }

  // Create a follow notification for the followed user
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', followerId)
      .single();

    const username = profile?.username || 'Someone';
    createNotification(
      followingId,
      followerId,
      'follow',
      `${username} started following you`,
      followerId
    );
  } catch {}

  return true;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
  return true;
}

/**
 * Get the list of user IDs that a user is following
 */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) {
    console.error('Error getting following:', error);
    return [];
  }
  return (data || []).map(row => row.following_id);
}

/**
 * Get followers IDs for a user
 */
export async function getFollowerIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);

  if (error) {
    console.error('Error getting followers:', error);
    return [];
  }
  return (data || []).map(row => row.follower_id);
}

/**
 * Check if a user follows another
 */
export async function checkIsFollowing(userId: string, targetId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', targetId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * Toggle follow: if following → unfollow, if not → follow
 */
export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  const isCurrentlyFollowing = await checkIsFollowing(followerId, followingId);
  if (isCurrentlyFollowing) {
    return await unfollowUser(followerId, followingId);
  } else {
    return await followUser(followerId, followingId);
  }
}

/**
 * Get following users with their profile info
 */
export async function getFollowingWithProfiles(userId: string): Promise<{
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}[]> {
  const supabase = createClient();

  // Get follow relationships
  const { data: followData, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followError || !followData || followData.length === 0) {
    return [];
  }

  const followingIds = followData.map(f => f.following_id);

  // Get profiles for those users
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', followingIds);

  if (profileError || !profiles) {
    return [];
  }

  return profiles.map(p => ({
    id: p.id,
    username: p.username || 'user',
    display_name: p.display_name || p.username || 'User',
    avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
  }));
}
