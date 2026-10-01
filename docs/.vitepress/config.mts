import { defineConfig } from 'vitepress';
import packageJson from '../../package.json';

const repository = 'https://github.com/aaron-russell/EnergyComparison';
const version = packageJson.version;

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
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Energy Replay',
    nav: [
      { text: 'Guide', link: '/guide/using-the-app' },
      { text: 'Extend', link: '/guide/adding-an-adapter' },
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
      '/reference/': [
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
      ],
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
