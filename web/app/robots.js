import { site } from '@/lib/site';

/**
 * Emitted as out/robots.txt at build time. Everything on this site is meant to
 * be indexed, and the sitemap line is what tells a crawler where the route
 * list lives.
 */
// Static export needs these emitted at build time rather than per request.
export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
