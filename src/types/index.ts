export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  is_verified: boolean;
  is_live: boolean;
  created_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  user: User;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  music_name: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_liked: boolean;
  is_following: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  replies_count: number;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  cost: number;
  animation_type: 'float' | 'burst' | 'fullscreen';
}

export interface LiveStream {
  id: string;
  user: User;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  is_live: boolean;
  started_at: string;
}

export interface ChatMessage {
  id: string;
  user: User;
  text: string;
  type: 'message' | 'gift' | 'join' | 'system';
  gift?: Gift;
  created_at: string;
}

export interface MatchState {
  status: 'idle' | 'searching' | 'connecting' | 'connected' | 'ended';
  remote_user?: User;
  duration: number;
}

export type NavTab = 'home' | 'random' | 'live' | 'profile';
