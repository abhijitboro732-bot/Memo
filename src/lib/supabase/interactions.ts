import { createClient } from '@/lib/supabase/client';

/**
 * Toggle like on a video. The videos table has a `likes` UUID[] column.
 * Falls back to localStorage for mock videos not in the database.
 */
export async function togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  const supabase = createClient();

  // Get current likes array
  const { data: post, error: fetchError } = await supabase
    .from('videos')
    .select('likes')
    .eq('id', postId)
    .single();

  // If video not found in DB (mock video), use localStorage fallback
  if (fetchError || !post) {
    return toggleLocalLike(postId, userId);
  }

  const currentLikes: string[] = post.likes || [];
  const isLiked = currentLikes.includes(userId);
  const newLikes = isLiked
    ? currentLikes.filter(id => id !== userId)
    : [...currentLikes, userId];

  const { error: updateError } = await supabase
    .from('videos')
    .update({ likes: newLikes, likes_count: newLikes.length })
    .eq('id', postId);

  if (updateError) {
    console.error('Error updating likes:', updateError);
    return { liked: isLiked, likesCount: currentLikes.length };
  }

  // AI telemetry tracing
  trackUserBehavior(userId, postId, 'like', isLiked ? -5 : 5);

  return { liked: !isLiked, likesCount: newLikes.length };
}

/**
 * Check if a user has liked a video
 */
export async function checkPostLiked(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('videos')
    .select('likes')
    .eq('id', postId)
    .single();

  // Fallback for mock videos
  if (error || !data) return checkLocalLike(postId, userId);
  const likes: string[] = data.likes || [];
  return { liked: likes.includes(userId), likesCount: likes.length };
}

// ── localStorage fallback for mock videos ──
function getLocalLikes(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem('skipsee_local_likes') || '{}'); } catch { return {}; }
}
function saveLocalLikes(data: Record<string, string[]>) {
  try { localStorage.setItem('skipsee_local_likes', JSON.stringify(data)); } catch {}
}
function toggleLocalLike(postId: string, userId: string): { liked: boolean; likesCount: number } {
  const all = getLocalLikes();
  const current = all[postId] || [];
  const isLiked = current.includes(userId);
  all[postId] = isLiked ? current.filter(id => id !== userId) : [...current, userId];
  saveLocalLikes(all);
  return { liked: !isLiked, likesCount: all[postId].length };
}
function checkLocalLike(postId: string, userId: string): { liked: boolean; likesCount: number } {
  const all = getLocalLikes();
  const current = all[postId] || [];
  return { liked: current.includes(userId), likesCount: current.length };
}

/**
 * Fetch comments for a post from Supabase
 */
export async function fetchComments(postId: string): Promise<{
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  text: string;
  likes: string[];
  parent_id: string | null;
  created_at: string;
}[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data || [];
}

/**
 * Add a comment to a post
 */
export async function addComment(postId: string, userId: string, username: string, avatarUrl: string, text: string, parentId: string | null = null) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      username,
      avatar_url: avatarUrl,
      text,
      parent_id: parentId,
    })
    .select()
    .single();

  if (!error) {
    // Fire-and-forget update to the videos table's comments_count
    getCommentCount(postId).then(async (count) => {
      await supabase.from('videos').update({ comments_count: count }).eq('id', postId);
    });
    // AI telemetry tracing
    trackUserBehavior(userId, postId, 'comment', 8);
  }

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }
  return data;
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  const supabase = createClient();

  const { data, error: fetchError } = await supabase
    .from('comments')
    .select('likes')
    .eq('id', commentId)
    .single();

  if (fetchError || !data) return { liked: false, likesCount: 0 };

  const currentLikes: string[] = data.likes || [];
  const isLiked = currentLikes.includes(userId);
  const newLikes = isLiked
    ? currentLikes.filter(id => id !== userId)
    : [...currentLikes, userId];

  await supabase
    .from('comments')
    .update({ likes: newLikes })
    .eq('id', commentId);

  return { liked: !isLiked, likesCount: newLikes.length };
}

/**
 * Get comment count for a post
 */
export async function getCommentCount(postId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) return 0;
  return count || 0;
}

/**
 * Edit a user's own comment text
 */
export async function editComment(commentId: string, userId: string, newText: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('comments')
    .update({ text: newText })
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error editing comment:', error.message);
    return false;
  }
  return true;
}

/**
 * Delete a user's own comment (and naturally its cascading replies)
 */
export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  
  // To update counts efficiently, we can decrement or trigger re-count via the caller, 
  // but here we just delete it from DB.
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting comment:', error.message);
    return false;
  }
  return true;
}

/**
 * Track user interactions for the AI Recommendation Algorithm
 * @param userId the authenticated user's ID
 * @param videoId the video being watched
 * @param interactionType 'view', 'like', 'comment', 'share', 'save', 'skip'
 * @param weight Numerical value of the interaction (e.g. view=1, like=5, skip=-2)
 */
export async function trackUserBehavior(userId: string, videoId: string, interactionType: string, weight: number): Promise<void> {
  const supabase = createClient();
  
  // Call the Supabase RPC function (fire and forget to not block UI)
  supabase.rpc('log_video_interaction', {
    p_user_id: userId,
    p_video_id: videoId,
    p_interaction_type: interactionType,
    p_weight: weight
  }).then(({ error }) => {
    if (error) {
      console.debug('Telemetry logging skipped or failed:', error.message);
    }
  });
}

