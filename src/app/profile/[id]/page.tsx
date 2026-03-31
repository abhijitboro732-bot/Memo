import { Metadata } from 'next';
import { fetchUserById } from '@/lib/supabase/users';
import { fetchUserVideos } from '@/lib/supabase/videos';
import UserProfileView from './UserProfileView';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const user = await fetchUserById(params.id);

  if (!user) {
    return { title: 'User Not Found — Skipsee' };
  }

  const bioSnippet = user.bio ? ` - ${user.bio.substring(0, 60)}` : '';

  return {
    title: `${user.display_name} (@${user.username}) — Skipsee`,
    description: `Watch ${user.display_name}'s latest videos on Skipsee!${bioSnippet}`,
    openGraph: {
      title: `${user.display_name} on Skipsee`,
      description: `Follow @${user.username} to see their short videos and live streams.`,
      type: 'profile',
      images: [
        {
          url: user.avatar_url,
          width: 400,
          height: 400,
          alt: `${user.username}'s profile picture`,
        },
      ],
    },
    twitter: {
      card: 'summary',
    },
  };
}

export default async function UserProfilePageServer({ params }: { params: { id: string } }) {
  const user = await fetchUserById(params.id);
  
  if (!user) {
    return <UserProfileView initialProfile={null} initialVideos={[]} />;
  }

  // Pre-fetch videos on the server for immediate HTML rendering and SEO
  const videos = await fetchUserVideos(user.id);

  // Extend User object with Website URL since our component expects ProfileData
  const profileData = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio: user.bio || '',
    website_url: (user as any).website_url,
  };

  // JSON-LD Structured Data Schema for search engines (Person & ProfilePage logic)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: user.display_name,
      alternateName: user.username,
      description: user.bio,
      url: `https://skipsee.com/profile/${user.id}`,
      image: user.avatar_url,
      sameAs: (user as any).website_url ? [(user as any).website_url] : [],
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: { '@type': 'FollowAction' },
          userInteractionCount: user.followers_count || 1205
        }
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UserProfileView initialProfile={profileData} initialVideos={videos} />
    </>
  );
}
