import { Gift, User, Video, LiveStream, Comment } from '@/types';

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const GIFTS: Gift[] = [
  { id: '1', name: 'Rose', icon: '🌹', cost: 1, animation_type: 'float' },
  { id: '2', name: 'Heart', icon: '❤️', cost: 5, animation_type: 'float' },
  { id: '3', name: 'Star', icon: '⭐', cost: 10, animation_type: 'burst' },
  { id: '4', name: 'Diamond', icon: '💎', cost: 50, animation_type: 'burst' },
  { id: '5', name: 'Crown', icon: '👑', cost: 100, animation_type: 'fullscreen' },
  { id: '6', name: 'Rocket', icon: '🚀', cost: 200, animation_type: 'fullscreen' },
  { id: '7', name: 'Fire', icon: '🔥', cost: 20, animation_type: 'burst' },
  { id: '8', name: 'Rainbow', icon: '🌈', cost: 150, animation_type: 'fullscreen' },
  { id: '9', name: 'Lightning', icon: '⚡', cost: 30, animation_type: 'burst' },
  { id: '10', name: 'Party', icon: '🎉', cost: 75, animation_type: 'fullscreen' },
  { id: '11', name: 'Kiss', icon: '💋', cost: 15, animation_type: 'float' },
  { id: '12', name: 'Teddy', icon: '🧸', cost: 60, animation_type: 'burst' },
];

// Mock users for demo
export const MOCK_USERS: User[] = [
  {
    id: '1', username: 'sarah_dance', display_name: 'Sarah Johnson',
    avatar_url: 'https://i.pravatar.cc/150?img=1', bio: '💃 Dancer | 🎵 Music lover',
    followers_count: 125400, following_count: 342, likes_count: 2340000,
    is_verified: true, is_live: false, created_at: '2024-01-01',
  },
  {
    id: '2', username: 'mike_travels', display_name: 'Mike Chen',
    avatar_url: 'https://i.pravatar.cc/150?img=3', bio: '✈️ Travel | 📸 Photography',
    followers_count: 89200, following_count: 521, likes_count: 1560000,
    is_verified: true, is_live: true, created_at: '2024-02-15',
  },
  {
    id: '3', username: 'emma_cooks', display_name: 'Emma Williams',
    avatar_url: 'https://i.pravatar.cc/150?img=5', bio: '👩‍🍳 Chef | 🍕 Food content',
    followers_count: 234100, following_count: 178, likes_count: 4520000,
    is_verified: true, is_live: false, created_at: '2024-01-20',
  },
  {
    id: '4', username: 'alex_fit', display_name: 'Alex Rivera',
    avatar_url: 'https://i.pravatar.cc/150?img=8', bio: '💪 Fitness | 🏋️ Personal Trainer',
    followers_count: 67800, following_count: 445, likes_count: 890000,
    is_verified: false, is_live: false, created_at: '2024-03-01',
  },
  {
    id: '5', username: 'luna_art', display_name: 'Luna Park',
    avatar_url: 'https://i.pravatar.cc/150?img=9', bio: '🎨 Digital Artist | ✨ Creator',
    followers_count: 312500, following_count: 256, likes_count: 5670000,
    is_verified: true, is_live: true, created_at: '2024-01-10',
  },
  {
    id: '6', username: 'jake_comedy', display_name: 'Jake Thomas',
    avatar_url: 'https://i.pravatar.cc/150?img=11', bio: '😂 Comedian | 🎬 Actor',
    followers_count: 456000, following_count: 134, likes_count: 8900000,
    is_verified: true, is_live: false, created_at: '2024-02-01',
  },
];

// Sample video URLs (royalty-free short videos)
const SAMPLE_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://media.w3.org/2010/05/bunny/trailer.mp4',
  'https://media.w3.org/2010/05/bunny/movie.mp4',
];

export const MOCK_VIDEOS: Video[] = SAMPLE_VIDEOS.map((url, i) => ({
  id: String(i + 1),
  user_id: MOCK_USERS[i % MOCK_USERS.length].id,
  user: MOCK_USERS[i % MOCK_USERS.length],
  video_url: url,
  thumbnail_url: `https://picsum.photos/seed/${i + 1}/400/700`,
  caption: [
    'This is absolutely incredible! 🔥 #trending #viral',
    'Wait for it... 😱 #amazing #fyp',
    'Living my best life ✨ #vibes #mood',
    'You won\'t believe what happened next 😂 #funny',
    'POV: When everything just clicks 💫 #relatable',
    'Adventure awaits! 🌍 #travel #explore',
  ][i % 6],
  music_name: ['Original Sound', 'Trending Beat 🎵', 'Viral Music 🎶', 'Summer Vibes ☀️', 'Chill Lo-fi 🎧', 'Epic Drop 🔊'][i % 6],
  likes_count: [124500, 89300, 312000, 45600, 198700, 67200][i % 6],
  comments_count: [3420, 1280, 8900, 567, 4510, 2340][i % 6],
  shares_count: [1200, 890, 3400, 234, 1780, 560][i % 6],
  views_count: [1250000, 670000, 1890000, 234000, 980000, 450000][i % 6],
  is_liked: false,
  is_following: i % 3 === 0,
  created_at: '2024-03-20T10:00:00.000Z',
}));

export const MOCK_LIVE_STREAMS: LiveStream[] = [
  {
    id: '1', user: MOCK_USERS[1], title: '🌍 Live from Tokyo!',
    viewer_count: 3420, thumbnail_url: 'https://picsum.photos/seed/live1/400/600',
    is_live: true, started_at: '2024-03-20T09:15:00.000Z',
  },
  {
    id: '2', user: MOCK_USERS[4], title: '🎨 Painting Session',
    viewer_count: 1250, thumbnail_url: 'https://picsum.photos/seed/live2/400/600',
    is_live: true, started_at: '2024-03-20T08:00:00.000Z',
  },
  {
    id: '3', user: MOCK_USERS[2], title: '👩‍🍳 Cooking Italian Tonight',
    viewer_count: 8900, thumbnail_url: 'https://picsum.photos/seed/live3/400/600',
    is_live: true, started_at: '2024-03-20T09:30:00.000Z',
  },
  {
    id: '4', user: MOCK_USERS[5], title: '😂 Late Night Comedy',
    viewer_count: 15600, thumbnail_url: 'https://picsum.photos/seed/live4/400/600',
    is_live: true, started_at: '2024-03-20T09:00:00.000Z',
  },
  {
    id: '5', user: MOCK_USERS[3], title: '💪 Morning Workout',
    viewer_count: 2100, thumbnail_url: 'https://picsum.photos/seed/live5/400/600',
    is_live: true, started_at: '2024-03-20T09:45:00.000Z',
  },
  {
    id: '6', user: MOCK_USERS[0], title: '💃 Dance Practice',
    viewer_count: 4300, thumbnail_url: 'https://picsum.photos/seed/live6/400/600',
    is_live: true, started_at: '2024-03-20T08:30:00.000Z',
  },
];

export const MOCK_COMMENTS: Comment[] = [
  { id: '1', user: MOCK_USERS[0], text: 'This is amazing! 🔥', likes_count: 234, is_liked: false, created_at: '2024-01-01', replies_count: 3 },
  { id: '2', user: MOCK_USERS[1], text: 'Can\'t stop watching 😍', likes_count: 189, is_liked: true, created_at: '2024-01-01', replies_count: 1 },
  { id: '3', user: MOCK_USERS[2], text: 'How did you do that?? 🤯', likes_count: 567, is_liked: false, created_at: '2024-01-01', replies_count: 12 },
  { id: '4', user: MOCK_USERS[3], text: 'Love this content! Keep it up 💪', likes_count: 89, is_liked: false, created_at: '2024-01-01', replies_count: 0 },
  { id: '5', user: MOCK_USERS[4], text: 'Literally the best thing I\'ve seen today ✨', likes_count: 1200, is_liked: true, created_at: '2024-01-01', replies_count: 5 },
  { id: '6', user: MOCK_USERS[5], text: 'Haha 😂😂😂', likes_count: 345, is_liked: false, created_at: '2024-01-01', replies_count: 2 },
];

export const CURRENT_USER: User = {
  id: '100',
  username: 'you',
  display_name: 'Your Name',
  avatar_url: 'https://i.pravatar.cc/150?img=20',
  bio: '🚀 Building cool stuff',
  followers_count: 1520,
  following_count: 890,
  likes_count: 45000,
  is_verified: false,
  is_live: false,
  created_at: '2024-01-01',
};

export function formatCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}
