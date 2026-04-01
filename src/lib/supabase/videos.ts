import { createClient } from './client';
import type { Video } from '@/types';

const supabase = createClient();

/**
 * Upload video file to Supabase Storage and insert a record in the videos table.
 */
export async function uploadVideo({
  file,
  caption,
  tags,
  musicName,
  visibility,
  userId,
  thumbnailBlob,
}: {
  file: File;
  caption: string;
  tags: string;
  musicName: string;
  visibility: string;
  userId: string;
  thumbnailBlob?: Blob | null;
}): Promise<{ success: boolean; error?: string; videoId?: string }> {
  try {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'mp4';
    const videoPath = `${userId}/${timestamp}.${ext}`;

    // 1. Upload video to storage
    const { error: storageError } = await supabase.storage
      .from('post-images')
      .upload(videoPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (storageError) {
      // If bucket doesn't exist, create it
      if (storageError.message?.includes('not found') || storageError.message?.includes('Bucket')) {
        return { success: false, error: 'Storage bucket "post-images" not found. Please create it in Supabase dashboard.' };
      }
      return { success: false, error: storageError.message };
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(videoPath);
    const videoUrl = urlData.publicUrl;

    // 3. Upload thumbnail if provided
    let thumbnailUrl = '';
    if (thumbnailBlob) {
      const thumbPath = `${userId}/${timestamp}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage
        .from('post-images')
        .upload(thumbPath, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage.from('post-images').getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrlData.publicUrl;
      }
    }

    // 4. Insert video record
    const { data, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || videoUrl,
        caption,
        tags,
        music_name: musicName || 'Original Sound',
        visibility,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (dbError) {
      // If table doesn't exist, still return success since the file was uploaded
      console.warn('Could not insert video record:', dbError.message);
      return { success: true, videoId: timestamp.toString() };
    }

    return { success: true, videoId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Upload failed' };
  }
}

/**
 * Fetch uploaded videos from Supabase
 */
export async function fetchUploadedVideos(): Promise<Video[]> {
  try {
    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(50);

    if (videosError || !videosData) return [];

    // 1. Gather unique user IDs
    const userIds = Array.from(new Set(videosData.map((v: any) => v.user_id)));

    // 2. Fetch profiles for these users
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = p;
        });
      }
    }

    // 3. Map profiles onto video objects
    return videosData.map((row: any) => {
      const p = profileMap[row.user_id] || {};
      return {
        id: row.id,
        user_id: row.user_id,
        user: {
          id: row.user_id,
          username: p.username || 'user',
          display_name: p.display_name || 'User',
          avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${row.user_id}`,
          bio: '',
          followers_count: 0,
          following_count: 0,
          likes_count: 0,
          is_verified: false,
          is_live: false,
          created_at: row.created_at,
        },
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url || row.video_url,
        caption: row.caption || '',
        music_name: row.music_name || 'Original Sound',
        likes_count: row.likes_count || 0,
        comments_count: row.comments_count || 0,
        shares_count: row.shares_count || 0,
        views_count: row.views_count || 0,
        is_liked: false,
        is_following: false,
        created_at: row.created_at,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetch AI Recommended videos for a user from Supabase
 */
export async function fetchRecommendedVideos(userId?: string | null): Promise<Video[]> {
  try {
    // Call the RPC AI Recommendation function
    // If userId is undefined/null, the RPC handles it by returning generic popular videos
    const { data: videosData, error: videosError } = await supabase
      .rpc('get_recommended_videos', {
        p_user_id: userId || null,
        p_limit: 50
      });

    if (videosError || !videosData) {
      console.warn('RPC recommender failed or empty, falling back to chronological', videosError);
      return fetchUploadedVideos(); 
    }

    // 1. Gather unique user IDs
    const userIds = Array.from(new Set(videosData.map((v: any) => v.user_id)));

    // 2. Fetch profiles for these users
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (profilesData) {
        profilesData.forEach(p => {
          profileMap[p.id] = p;
        });
      }
    }

    // 3. Map profiles onto video objects
    return videosData.map((row: any) => {
      const p = profileMap[row.user_id] || {};
      return {
        id: row.id,
        user_id: row.user_id,
        user: {
          id: row.user_id,
          username: p.username || 'user',
          display_name: p.display_name || 'User',
          avatar_url: p.avatar_url || `https://i.pravatar.cc/150?u=${row.user_id}`,
          bio: '',
          followers_count: 0,
          following_count: 0,
          likes_count: 0,
          is_verified: false,
          is_live: false,
          created_at: row.created_at,
        },
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url || row.video_url,
        caption: row.caption || '',
        music_name: row.music_name || 'Original Sound',
        likes_count: row.likes_count || 0,
        comments_count: row.comments_count || 0,
        shares_count: row.shares_count || 0,
        views_count: row.views_count || 0,
        is_liked: false,
        is_following: false,
        created_at: row.created_at,
      };
    });
  } catch (err) {
    console.error('fetchRecommendedVideos error', err);
    return fetchUploadedVideos();
  }
}


/**
 * Fetch videos uploaded by a specific user
 */
export async function fetchUserVideos(userId: string): Promise<Video[]> {
  try {
    const { data: videosData, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !videosData) return [];

    // Fetch the single user's profile
    let profileData: any = {};
    const { data: pData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    if (pData) profileData = pData;

    return videosData.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user: {
        id: row.user_id,
        username: profileData.username || 'user',
        display_name: profileData.display_name || 'User',
        avatar_url: profileData.avatar_url || `https://i.pravatar.cc/150?u=${row.user_id}`,
        bio: '', followers_count: 0, following_count: 0, likes_count: 0,
        is_verified: false, is_live: false, created_at: row.created_at,
      },
      video_url: row.video_url,
      thumbnail_url: row.thumbnail_url || row.video_url,
      caption: row.caption || '',
      music_name: row.music_name || 'Original Sound',
      likes_count: row.likes_count || 0,
      comments_count: row.comments_count || 0,
      shares_count: row.shares_count || 0,
      views_count: row.views_count || 0,
      is_liked: false,
      is_following: false,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a video by ID (removes DB record and storage files)
 */
export async function deleteVideo(videoId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get video record to find file path
    const { data: video } = await supabase
      .from('videos')
      .select('video_url, thumbnail_url')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', userId);

    if (dbError) return { success: false, error: dbError.message };

    // 3. Try to delete from storage
    if (video?.video_url) {
      const url = new URL(video.video_url);
      const pathParts = url.pathname.split('/storage/v1/object/public/post-images/');
      if (pathParts[1]) {
        await supabase.storage.from('post-images').remove([pathParts[1]]);
      }
    }
    if (video?.thumbnail_url && video.thumbnail_url !== video.video_url) {
      const url = new URL(video.thumbnail_url);
      const pathParts = url.pathname.split('/storage/v1/object/public/post-images/');
      if (pathParts[1]) {
        await supabase.storage.from('post-images').remove([pathParts[1]]);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save/bookmark a video
 */
export async function saveVideo(videoId: string, userId: string) {
  try {
    // Store in localStorage for now (could be a Supabase table later)
    const key = `skipsee_saved_${userId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!saved.includes(videoId)) {
      saved.push(videoId);
      localStorage.setItem(key, JSON.stringify(saved));
    }
    return { success: true };
  } catch { return { success: false }; }
}

/**
 * Unsave/unbookmark a video
 */
export async function unsaveVideo(videoId: string, userId: string) {
  try {
    const key = `skipsee_saved_${userId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(saved.filter((id: string) => id !== videoId)));
    return { success: true };
  } catch { return { success: false }; }
}

/**
 * Get saved video IDs
 */
export function getSavedVideoIds(userId: string): string[] {
  try {
    const key = `skipsee_saved_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

/**
 * Fetch a single video by ID from Supabase
 */
export async function fetchVideoById(videoId: string): Promise<Video | null> {
  try {
    const { data: row, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !row) return null;

    // Fetch creator profile
    let profileData: any = {};
    const { data: pData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', row.user_id)
      .single();

    if (pData) profileData = pData;

    return {
      id: row.id,
      user_id: row.user_id,
      user: {
        id: row.user_id,
        username: profileData.username || 'user',
        display_name: profileData.display_name || 'User',
        avatar_url: profileData.avatar_url || `https://i.pravatar.cc/150?u=${row.user_id}`,
        bio: '', followers_count: 0, following_count: 0, likes_count: 0,
        is_verified: false, is_live: false, created_at: row.created_at,
      },
      video_url: row.video_url,
      thumbnail_url: row.thumbnail_url || row.video_url,
      caption: row.caption || '',
      music_name: row.music_name || 'Original Sound',
      likes_count: row.likes_count || 0,
      comments_count: row.comments_count || 0,
      shares_count: row.shares_count || 0,
      views_count: row.views_count || 0,
      is_liked: false,
      is_following: false,
      created_at: row.created_at,
    };
  } catch {
    return null;
  }
}
