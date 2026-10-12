import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/site-url';

// Regenerate hourly rather than on every crawler hit.
export const revalidate = 3600;

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/vehicles`, changeFrequency: 'daily', priority: 0.8 },
  ];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await api.catalog.search(
        { page, limit: PAGE_SIZE },
        { next: { revalidate: 3600 } },
      );
      for (const v of res.items) {
        routes.push({
          url: `${SITE_URL}/vehicles/${v.id}`,
          lastModified: new Date(v.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
      if (page * PAGE_SIZE >= res.total) break;
    }
  } catch {
    // API down at build or revalidate time: ship the static routes rather than failing.
    return routes.slice(0, 2);
  }
  return routes;
}
