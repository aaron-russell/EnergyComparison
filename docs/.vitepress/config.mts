import { defineConfig } from 'vitepress';
import packageJson from '../../package.json';
import { buildJsonLd, canonicalUrl, jsonLdScript, SOCIAL_IMAGE_URL } from '../../src/seo';

const repository = 'https://github.com/aaron-russell/EnergyComparison';
const version = packageJson.version;
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
        jsonLdScript(buildJsonLd(metadata)),
      ],
    ];
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Energy Replay',
    nav: [
      { text: 'Open app', link: '/' },
      { text: 'Guide', link: '/guide/using-the-app' },
      { text: 'Extend', link: '/guide/adding-an-adapter' },
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
    },
    socialLinks: [{ icon: 'github', link: repository }],
    editLink: { pattern: `${repository}/edit/main/docs/:path` },
    search: { provider: 'local' },
    footer: { message: 'MIT licensed. Independent of the named energy and charging providers.' },
  },
});
