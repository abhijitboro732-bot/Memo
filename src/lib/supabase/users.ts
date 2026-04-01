import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

/**
 * Fetch real users — first from profiles table (all registered users),
 * then supplement with unique users from posts table.
 */
export async function fetchRealUsers(limit: number = 20): Promise<User[]> {
  const supabase = createClient();
  const seen = new Map<string, User>();

  // 1. Fetch from profiles table (includes ALL registered users)
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('is_omajanwba_admin', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profiles) {
      for (const p of profiles) {
        if (p.id && !seen.has(p.id)) {
          seen.set(p.id, {
            id: p.id,
            username: p.username || 'user',
            display_name: p.display_name || p.username || 'User',
            avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
            bio: '',
            followers_count: 0,
            following_count: 0,
            likes_count: 0,
            is_verified: false,
            is_live: false,
            created_at: '',
          });
        }
      }
    }
  } catch {}

  // 2. Also fetch from posts table to catch any users not in profiles
  if (seen.size < limit) {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('user_id, username, avatar_url')
        .limit(100);

      if (posts) {
        for (const post of posts) {
          if (post.user_id && !seen.has(post.user_id)) {
            seen.set(post.user_id, {
              id: post.user_id,
              username: post.username || 'user',
              display_name: post.username || 'User',
              avatar_url: post.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
              bio: '',
              followers_count: 0,
              following_count: 0,
              likes_count: 0,
              is_verified: false,
              is_live: false,
              created_at: '',
            });
          }
        }
      }
    } catch {}
  }

  return Array.from(seen.values()).slice(0, limit);
}

/**
 * Search users — searches both profiles AND posts tables.
 */
export async function searchRealUsers(query: string, limit: number = 5): Promise<User[]> {
  const supabase = createClient();
  const seen = new Map<string, User>();

  // 1. Search profiles table first
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('is_omajanwba_admin', true)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (profiles) {
      for (const p of profiles) {
        if (p.id && !seen.has(p.id)) {
          seen.set(p.id, {
            id: p.id,
            username: p.username || 'user',
            display_name: p.display_name || p.username || 'User',
            avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`,
            bio: '',
            followers_count: 0,
            following_count: 0,
            likes_count: 0,
            is_verified: false,
            is_live: false,
            created_at: '',
          });
        }
      }
    }
  } catch {}

  // 2. Also search posts table
  if (seen.size < limit) {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(50);

      if (posts) {
        for (const post of posts) {
          if (post.user_id && !seen.has(post.user_id)) {
            seen.set(post.user_id, {
              id: post.user_id,
              username: post.username || 'user',
              display_name: post.username || 'User',
              avatar_url: post.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
              bio: '',
              followers_count: 0,
              following_count: 0,
              likes_count: 0,
              is_verified: false,
              is_live: false,
              created_at: '',
            });
          }
        }
      }
    } catch {}
  }

  return Array.from(seen.values()).slice(0, limit);
}

/**
 * Look up a single user — checks profiles table first, then posts table.
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  const supabase = createClient();

  // 1. Try profiles table first (has ALL registered users)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('is_omajanwba_admin', true)
      .eq('id', userId)
      .limit(1)
      .single();

    if (profile) {
      return {
        id: profile.id,
        username: profile.username || 'user',
        display_name: profile.display_name || profile.username || 'User',
        avatar_url: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}`,
        bio: '',
        followers_count: 0,
        following_count: 0,
        likes_count: 0,
        is_verified: false,
        is_live: false,
        created_at: '',
      };
    }
  } catch {}

  // 2. Fallback: try posts table
  try {
    const { data: post } = await supabase
      .from('posts')
      .select('user_id, username, avatar_url')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (post) {
      return {
        id: post.user_id,
        username: post.username || 'user',
        display_name: post.username || 'User',
        avatar_url: post.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
        bio: '',
        followers_count: 0,
        following_count: 0,
        likes_count: 0,
        is_verified: false,
        is_live: false,
        created_at: '',
      };
    }
  } catch {}

  return null;
}
