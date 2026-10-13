import { site } from '@/lib/site';

/**
 * Emitted as out/sitemap.xml at build time. Add a route here whenever a new
 * page is added, and reference it from robots.js (which already does).
 */
// Static export needs these emitted at build time rather than per request.
export const dynamic = 'force-static';

export default function sitemap() {
  const now = new Date();

  return [
    {
      url: `${site.url}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${site.url}/privacy-policy/`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
