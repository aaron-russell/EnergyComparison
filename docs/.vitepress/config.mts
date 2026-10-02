import { defineConfig } from 'vitepress';
import packageJson from '../../package.json';
import { buildJsonLd, canonicalUrl, jsonLdScript, SOCIAL_IMAGE_URL } from '../../src/seo';

const repository = 'https://github.com/aaron-russell/EnergyComparison';
const site = 'https://energy.russell-tech.co.uk';
const authorWebsite = 'https://aaron-russell.co.uk';
const organizationWebsite = 'https://russell-tech.co.uk';
const version = packageJson.version;
const authorId = `${site}/docs/about.html#aaron-russell`;
const organizationId = `${site}/docs/about.html#russell-tech`;
const referenceSidebar = [
  {
    text: 'Reference',
    items: [
      { text: 'Adapter contracts', link: '/reference/contracts' },
      { text: 'Normalized data model', link: '/reference/data-model' },
      { text: 'Calculations', link: '/calculations' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Tariff JSON schema', link: '/reference/tariff-schema' },
    ],
  },
];

export default defineConfig({
  title: 'Energy Replay',
  description: 'Documentation for the Energy Replay historical tariff comparison tool.',
  base: '/docs/',
  cleanUrls: false,
  titleTemplate: false,
  lastUpdated: true,
  appearance: false,
  locales: {
    root: { label: 'English', lang: 'en' },
  },
  head: [['script', { src: '/docs/theme-sync.js' }]],
  transformHead({ pageData }) {
    const frontmatter = pageData.frontmatter as {
      canonical?: string;
      description?: string;
      article?: boolean;
      datePublished?: string;
      dateModified?: string;
      author?: string;
      reviewed?: string;
      schemaType?: string;
    };
    const relativePath =
      pageData.relativePath === 'index.md'
        ? '/docs/'
        : `/docs/${pageData.relativePath.replace(/\.md$/, '.html')}`;
    const path = frontmatter.canonical ?? relativePath;
    const title = pageData.title;
    const description = frontmatter.description ?? 'Energy Replay documentation.';
    const breadcrumbs = [
      { name: 'Energy Replay', path: '/' },
      { name: 'Documentation', path: '/docs/' },
      ...(relativePath === '/docs/' ? [] : [{ name: title, path }]),
    ];
    const metadata = {
      title,
      description,
      path,
      breadcrumbs,
      ...(frontmatter.article && {
        article: {
          headline: title,
          datePublished: frontmatter.datePublished,
          dateModified: frontmatter.dateModified,
          author: frontmatter.author,
        },
      }),
    };
    const jsonLd = buildJsonLd(metadata) as {
      '@context': string;
      '@graph': Record<string, unknown>[];
    };
    if (relativePath !== '/docs/') {
      jsonLd['@graph'].push(
        {
          '@type': 'Person',
          '@id': authorId,
          name: 'Aaron Russell',
          url: authorId,
          sameAs: [repository, authorWebsite],
        },
        {
          '@type': 'Organization',
          '@id': organizationId,
          name: 'Russell Tech',
          url: organizationWebsite,
        },
        {
          '@type': frontmatter.schemaType ?? 'TechArticle',
          '@id': `${canonicalUrl(path)}#${String(frontmatter.schemaType ?? 'TechArticle').toLowerCase()}`,
          url: canonicalUrl(path),
          name: title,
          description,
          isPartOf: { '@id': `${site}/docs/#website` },
          author: { '@id': authorId },
          publisher: { '@id': organizationId },
          ...(frontmatter.reviewed
            ? { dateModified: frontmatter.reviewed }
            : frontmatter.dateModified
              ? { dateModified: frontmatter.dateModified }
              : {}),
        },
      );
    }
    return [
      ['meta', { name: 'description', content: description }],
      ['link', { rel: 'canonical', href: canonicalUrl(path) }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalUrl(path) }],
      ['meta', { property: 'og:image', content: SOCIAL_IMAGE_URL }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:url', content: canonicalUrl(path) }],
      ['meta', { name: 'twitter:image', content: SOCIAL_IMAGE_URL }],
      [
        'script',
        { type: 'application/ld+json', 'data-energy-replay-seo': 'jsonld' },
        jsonLdScript(jsonLd),
      ],
    ];
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Energy Replay',
    nav: [
      { text: 'Guide', link: '/guide/using-the-app' },
      { text: 'Extend', link: '/guide/adding-an-adapter' },
      { text: 'About', link: '/about' },
      { text: 'Projects', link: '/projects/energy-replay' },
      { text: 'Policies', link: '/editorial-policy' },
      { text: 'Operations', link: '/operations/cloudflare-pages' },
      { text: 'Reference', link: '/reference/contracts' },
      { text: `v${version}`, link: '/versions' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Use the app',
          items: [
            { text: 'Overview', link: '/guide/using-the-app' },
            { text: 'Connect and import history', link: '/guide/connection-and-import' },
            { text: 'Coverage and estimates', link: '/guide/coverage-and-estimates' },
            { text: 'EV charging', link: '/guide/ev-charging' },
            { text: 'Tariffs and comparison', link: '/guide/tariffs-and-comparison' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
        {
          text: 'Build and extend',
          items: [
            { text: 'Development workflow', link: '/guide/development' },
            { text: 'Add an energy adapter', link: '/guide/adding-an-adapter' },
            { text: 'Add an EV charger', link: '/guide/adding-an-ev-charger' },
          ],
        },
      ],
      '/reference/': referenceSidebar,
      '/calculations': referenceSidebar,
      '/architecture': referenceSidebar,
      '/operations/': [
        {
          text: 'Operations',
          items: [
            { text: 'Deploy to Pages', link: '/operations/cloudflare-pages' },
            { text: 'Workers alternative', link: '/operations/cloudflare-workers' },
            { text: 'Privacy and security', link: '/operations/privacy-and-security' },
            { text: 'Release checks', link: '/operations/release-checks' },
          ],
        },
      ],
      '/projects/': [
        { text: 'Projects', items: [{ text: 'Energy Replay', link: '/projects/energy-replay' }] },
      ],
    },
    socialLinks: [{ icon: 'github', link: repository }],
    editLink: { pattern: `${repository}/edit/main/docs/:path` },
    search: { provider: 'local' },
    footer: { message: 'MIT licensed. Independent of the named energy and charging providers.' },
  },
});
