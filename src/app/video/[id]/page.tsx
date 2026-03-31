import { Metadata } from 'next';
import { fetchVideoById } from '@/lib/supabase/videos';
import { MOCK_VIDEOS } from '@/lib/constants';
import VideoPlayerView from './VideoPlayerView';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const dbVideo = await fetchVideoById(params.id);
  const video = dbVideo || MOCK_VIDEOS.find(v => v.id === params.id);

  if (!video) {
    return { title: 'Video Not Found — Skipsee' };
  }

  return {
    title: `${video.caption ? video.caption.substring(0, 50) + '...' : `Watch ${video.user.display_name}'s Video`} — Skipsee`,
    description: video.caption || `Watch this viral video from @${video.user.username} on Skipsee.`,
    openGraph: {
      title: `${video.user.display_name} on Skipsee`,
      description: video.caption || 'Watch now on Skipsee!',
      type: 'video.other',
      images: [
        {
          url: video.user.avatar_url,
          width: 800,
          height: 600,
          alt: `${video.user.username}'s video`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default async function VideoPageServer({ params }: { params: { id: string } }) {
  const dbVideo = await fetchVideoById(params.id);
  const video = dbVideo || MOCK_VIDEOS.find(v => v.id === params.id) || null;

  // JSON-LD Structured Data Schema for search engines
  const jsonLd = video ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.caption || `Video by ${video.user.display_name}`,
    description: video.caption || `Discover ${video.user.username}'s amazing video on Skipsee.`,
    thumbnailUrl: [video.user.avatar_url],
    uploadDate: video.created_at || new Date().toISOString(),
    contentUrl: video.video_url,
    embedUrl: `https://skipsee.com/video/${video.id}`,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'WatchAction' },
        userInteractionCount: video.views_count
      },
      {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'LikeAction' },
        userInteractionCount: video.likes_count
      }
    ],
    author: {
      '@type': 'Person',
      name: video.user.display_name,
      url: `https://skipsee.com/profile/${video.user.id}`
    }
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <VideoPlayerView initialVideo={video} />
    </>
  );
}
