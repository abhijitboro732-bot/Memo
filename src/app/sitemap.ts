import { MetadataRoute } from 'next';
import { fetchRealUsers } from '@/lib/supabase/users';
import { fetchUploadedVideos } from '@/lib/supabase/videos';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skipsee.com';

  // 1. Core static routes mapping
  const routes = ['', '/explore', '/live', '/random'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Dynamic User Profiles
  let profiles: MetadataRoute.Sitemap = [];
  try {
    const users = await fetchRealUsers(100); // Fetch top 100 users for indexing
    profiles = users.map((user) => ({
      url: `${baseUrl}/profile/${user.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching users for sitemap:', error);
  }

  // 3. Dynamic Video Routes
  let videoRoutes: MetadataRoute.Sitemap = [];
  try {
    const videos = await fetchUploadedVideos(); // Expose default fetch limit instead of 100
    videoRoutes = videos.map((video) => ({
      url: `${baseUrl}/video/${video.id}`,
      lastModified: video.created_at || new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error fetching videos for sitemap:', error);
  }

  return [...routes, ...profiles, ...videoRoutes];
}
