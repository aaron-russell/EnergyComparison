<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

const { page } = useData();
const path = computed(() => `/${page.value.relativePath.replace(/\.md$/, '')}`);
const segments = computed(() => path.value.split('/').filter(Boolean));
const labels: Record<string, string> = {
  guide: 'Guide',
  reference: 'Reference',
  operations: 'Operations',
};
const docHref = (href: string) => `/docs${href}.html`;
const related: Record<string, { text: string; href: string }[]> = {
  '/guide/using-the-app': [
    { text: 'Tariffs and comparison', href: '/guide/tariffs-and-comparison' },
    { text: 'Coverage and estimates', href: '/guide/coverage-and-estimates' },
  ],
  '/guide/connection-and-import': [
    { text: 'Coverage and estimates', href: '/guide/coverage-and-estimates' },
    { text: 'Troubleshooting', href: '/guide/troubleshooting' },
  ],
  '/guide/coverage-and-estimates': [
    { text: 'Use the app', href: '/guide/using-the-app' },
    { text: 'Calculations', href: '/calculations' },
  ],
  '/guide/ev-charging': [
    { text: 'Add an EV charger', href: '/guide/adding-an-ev-charger' },
    { text: 'Normalized data model', href: '/reference/data-model' },
  ],
  '/guide/tariffs-and-comparison': [
    { text: 'Tariff JSON schema', href: '/reference/tariff-schema' },
    { text: 'Calculation assumptions', href: '/calculations' },
  ],
  '/guide/troubleshooting': [
    { text: 'Connect and import history', href: '/guide/connection-and-import' },
    { text: 'Use the app', href: '/guide/using-the-app' },
  ],
  '/guide/development': [
    { text: 'Add an energy adapter', href: '/guide/adding-an-adapter' },
    { text: 'Release checks', href: '/operations/release-checks' },
  ],
  '/guide/adding-an-adapter': [
    { text: 'Adapter contracts', href: '/reference/contracts' },
    { text: 'Development workflow', href: '/guide/development' },
  ],
  '/guide/adding-an-ev-charger': [
    { text: 'EV charging', href: '/guide/ev-charging' },
    { text: 'Normalized data model', href: '/reference/data-model' },
  ],
  '/reference/contracts': [
    { text: 'Normalized data model', href: '/reference/data-model' },
    { text: 'Add an energy adapter', href: '/guide/adding-an-adapter' },
  ],
  '/reference/data-model': [
    { text: 'Adapter contracts', href: '/reference/contracts' },
    { text: 'Calculation assumptions', href: '/calculations' },
  ],
  '/reference/tariff-schema': [
    { text: 'Tariffs and comparison', href: '/guide/tariffs-and-comparison' },
    { text: 'Calculations', href: '/calculations' },
  ],
  '/calculations': [
    { text: 'Coverage and estimates', href: '/guide/coverage-and-estimates' },
    { text: 'Tariffs and comparison', href: '/guide/tariffs-and-comparison' },
  ],
  '/architecture': [
    { text: 'Development workflow', href: '/guide/development' },
    { text: 'Adapter contracts', href: '/reference/contracts' },
  ],
  '/operations/cloudflare-pages': [
    { text: 'Workers alternative', href: '/operations/cloudflare-workers' },
    { text: 'Release checks', href: '/operations/release-checks' },
  ],
  '/operations/cloudflare-workers': [
    { text: 'Deploy to Pages', href: '/operations/cloudflare-pages' },
    { text: 'Release checks', href: '/operations/release-checks' },
  ],
  '/operations/privacy-and-security': [
    { text: 'Release checks', href: '/operations/release-checks' },
    { text: 'Architecture', href: '/architecture' },
  ],
  '/operations/release-checks': [
    { text: 'Deploy to Pages', href: '/operations/cloudflare-pages' },
    { text: 'Privacy and security', href: '/operations/privacy-and-security' },
  ],
  '/versions': [
    { text: 'Development workflow', href: '/guide/development' },
    { text: 'Release checks', href: '/operations/release-checks' },
  ],
};
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-top>
      <nav v-if="path !== '/index'" class="site-breadcrumbs" aria-label="Breadcrumb">
        <a href="/docs/">Documentation</a><span aria-hidden="true">/</span>
        <template v-for="(segment, index) in segments" :key="segment">
          <span v-if="index < segments.length - 1">{{ labels[segment] ?? segment }}</span>
          <span v-else aria-current="page">{{ page.title }}</span>
          <span v-if="index < segments.length - 1" aria-hidden="true">/</span>
        </template>
      </nav>
    </template>
    <template #doc-bottom>
      <section v-if="related[path]" class="related-content" aria-label="Related reading">
        <h2>Related reading</h2>
        <ul>
          <li v-for="item in related[path]" :key="item.href">
            <a :href="docHref(item.href)">{{ item.text }}</a>
          </li>
        </ul>
      </section>
    </template>
  </DefaultTheme.Layout>
</template>
