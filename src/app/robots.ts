import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // If the app is officially hosted, replace this with the real production domain URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skipsee.online';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/omajanwba/',
        '/messages/',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
