'use client';

/**
 * Tracks real user interactions (views, likes, comments) per video.
 * Uses localStorage for persistence. In production, this would be Supabase.
 */

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  isLiked: boolean;
}

const STORAGE_KEY = 'skipsee_video_stats';

function getAllStats(): Record<string, VideoStats> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveAllStats(stats: Record<string, VideoStats>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function getVideoStats(videoId: string, defaults: { views: number; likes: number; comments: number }): VideoStats {
  const all = getAllStats();
  if (!all[videoId]) {
    // Initialize with mock defaults + small random addition for realism
    all[videoId] = {
      views: defaults.views + Math.floor(Math.random() * 50),
      likes: defaults.likes,
      comments: defaults.comments,
      isLiked: false,
    };
    saveAllStats(all);
  }
  return all[videoId];
}

export function recordView(videoId: string): number {
  const all = getAllStats();
  if (!all[videoId]) {
    all[videoId] = { views: 1, likes: 0, comments: 0, isLiked: false };
  } else {
    all[videoId].views += 1;
  }
  saveAllStats(all);
  return all[videoId].views;
}

export function toggleLike(videoId: string): { isLiked: boolean; likes: number } {
  const all = getAllStats();
  if (!all[videoId]) {
    all[videoId] = { views: 0, likes: 1, comments: 0, isLiked: true };
  } else {
    if (all[videoId].isLiked) {
      all[videoId].likes = Math.max(0, all[videoId].likes - 1);
      all[videoId].isLiked = false;
    } else {
      all[videoId].likes += 1;
      all[videoId].isLiked = true;
    }
  }
  saveAllStats(all);
  return { isLiked: all[videoId].isLiked, likes: all[videoId].likes };
}

export function addComment(videoId: string): number {
  const all = getAllStats();
  if (!all[videoId]) {
    all[videoId] = { views: 0, likes: 0, comments: 1, isLiked: false };
  } else {
    all[videoId].comments += 1;
  }
  saveAllStats(all);
  return all[videoId].comments;
}

// Get stored comments for a video
const COMMENTS_KEY = 'skipsee_comments';

export interface StoredComment {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  text: string;
  likes: number;
  created_at: string;
}

export function getVideoComments(videoId: string): StoredComment[] {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    return all[videoId] || [];
  } catch { return []; }
}

export function addVideoComment(videoId: string, comment: StoredComment): StoredComment[] {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    if (!all[videoId]) all[videoId] = [];
    all[videoId].unshift(comment);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    addComment(videoId); // increment counter
    return all[videoId];
  } catch { return []; }
}
