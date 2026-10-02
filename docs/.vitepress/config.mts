import { defineConfig } from 'vitepress';
import packageJson from '../../package.json';

const repository = 'https://github.com/aaron-russell/EnergyComparison';
const site = 'https://energy.russell-tech.co.uk';
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
  lastUpdated: true,
  appearance: false,
  locales: {
    root: { label: 'English', lang: 'en' },
  },
  head: [['script', { src: '/docs/theme-sync.js' }]],
  transformPageData(pageData) {
    const reviewed = pageData.frontmatter.reviewed;
    const schemaType = pageData.frontmatter.schemaType ?? 'TechArticle';
    if (pageData.relativePath === 'index.md') return;

    const pageUrl = `${site}/docs/${pageData.relativePath.replace(/\.md$/, '.html')}`;
    const pageSchema = {
      '@type': schemaType,
      '@id': `${pageUrl}#${String(schemaType).toLowerCase()}`,
      url: pageUrl,
      name: pageData.title,
      description: pageData.description,
      isPartOf: { '@id': `${site}/docs/#website` },
      author: { '@id': authorId },
      publisher: { '@id': organizationId },
      ...(reviewed ? { dateModified: reviewed } : {}),
    };
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': authorId,
          name: 'Aaron Russell',
          url: authorId,
          sameAs: [repository],
        },
        {
          '@type': 'Organization',
          '@id': organizationId,
          name: 'Russell Tech',
          url: site,
        },
        {
          '@type': 'WebSite',
          '@id': `${site}/docs/#website`,
          url: `${site}/docs/`,
          name: 'Energy Replay documentation',
          publisher: { '@id': organizationId },
        },
        pageSchema,
      ],
    };

    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ['script', { type: 'application/ld+json' }, JSON.stringify(schema)],
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
