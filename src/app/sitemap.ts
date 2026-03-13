import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://freeonlinetools.example.com';
  
  const routes = [
    '',
    '/image/compressor',
    '/image/resizer',
    '/image/jpg-to-png',
    '/text/word-counter',
    '/text/case-converter',
    '/text/password-generator',
    '/calculator/age',
    '/calculator/percentage',
    '/calculator/bmi',
    '/developer/json-formatter',
    '/developer/base64-encoder',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
