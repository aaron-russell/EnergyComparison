export const SITE_ORIGIN = 'https://energy.russell-tech.co.uk';
export const SOCIAL_IMAGE_PATH = '/og-image.png';
export const SOCIAL_IMAGE_URL = `${SITE_ORIGIN}${SOCIAL_IMAGE_PATH}`;

export type AppStep = 0 | 1 | 2 | 3 | 4 | 5;

export type SeoMetadata = {
  title: string;
  description: string;
  path: string;
  includeApplication?: boolean;
  breadcrumbs?: Array<{ name: string; path: string }>;
  article?: {
    headline: string;
    datePublished?: string;
    dateModified?: string;
    author?: string;
  };
};

export const appSeo: Record<AppStep, Omit<SeoMetadata, 'path'>> = {
  0: {
    title: 'Connect your energy data | Energy Replay',
    description:
      'Connect an energy provider or use synthetic data to begin a private, browser-based replay of your household usage.',
    includeApplication: true,
  },
  1: {
    title: 'Import energy history | Energy Replay',
    description:
      'Import half-hour electricity and gas history into Energy Replay while keeping credentials out of storage and progress in your browser tab.',
    includeApplication: true,
  },
  2: {
    title: 'Review energy coverage | Energy Replay',
    description:
      'Review observed energy coverage, missing intervals and clearly labelled estimates before comparing tariffs.',
    includeApplication: true,
  },
  3: {
    title: 'Review EV charging | Energy Replay',
    description:
      'Review optional EV charging sessions and approve only grid energy already represented in your household imports.',
    includeApplication: true,
  },
  4: {
    title: 'Enter energy tariffs | Energy Replay',
    description:
      'Enter, import and save tariff definitions to compare the cost of your own energy rates against historical usage.',
    includeApplication: true,
  },
  5: {
    title: 'Compare historical energy costs | Energy Replay',
    description:
      'Compare the same household usage across tariffs and inspect monthly, fuel and time-band costs with exact decimal arithmetic.',
    includeApplication: true,
  },
};

export function canonicalUrl(path: string): string {
  const normalized = path === '/docs' || path === '/docs/index.html' ? '/docs/' : path || '/';
  return new URL(normalized.startsWith('/') ? normalized : `/${normalized}`, SITE_ORIGIN).href;
}

export const absoluteUrl = canonicalUrl;

export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function buildJsonLd(metadata: SeoMetadata) {
  const pageUrl = canonicalUrl(metadata.path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      name: 'Energy Replay',
      url: SITE_ORIGIN,
      description: metadata.description,
      inLanguage: 'en-GB',
    },
  ];

  if (metadata.includeApplication) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${SITE_ORIGIN}/#software`,
      name: 'Energy Replay',
      url: `${SITE_ORIGIN}/app/`,
      description: metadata.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      image: SOCIAL_IMAGE_URL,
    });
  }

  if (metadata.breadcrumbs?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: metadata.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: canonicalUrl(item.path),
      })),
    });
  }

  if (metadata.article) {
    graph.push({
      '@type': 'Article',
      '@id': `${pageUrl}#article`,
      headline: metadata.article.headline,
      description: metadata.description,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      ...(metadata.article.datePublished && { datePublished: metadata.article.datePublished }),
      ...(metadata.article.dateModified && { dateModified: metadata.article.dateModified }),
      ...(metadata.article.author && {
        author: { '@type': 'Person', name: metadata.article.author },
      }),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
