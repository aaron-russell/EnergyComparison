import { useEffect } from 'react';
import {
  appSeo,
  buildJsonLd,
  canonicalUrl,
  jsonLdScript,
  SOCIAL_IMAGE_URL,
  type AppStep,
} from '../seo';

const marker = 'energy-replay-seo';

function setMeta(name: string, content: string, property = false) {
  const selector = `meta[data-${marker}="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(`data-${marker}`, name);
    document.head.append(element);
  }
  element.setAttribute(property ? 'property' : 'name', name);
  element.content = content;
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[data-${marker}="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute(`data-${marker}`, rel);
    element.rel = rel;
    document.head.append(element);
  }
  element.href = href;
}

export function SeoMetadata({ step }: { step: AppStep }) {
  useEffect(() => {
    const metadata = { ...appSeo[step], path: '/' };
    const url = canonicalUrl(metadata.path);
    document.title = metadata.title;
    setMeta('description', metadata.description);
    setLink('canonical', url);
    setMeta('og:title', metadata.title, true);
    setMeta('og:description', metadata.description, true);
    setMeta('og:url', url, true);
    setMeta('og:image', SOCIAL_IMAGE_URL, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', metadata.title);
    setMeta('twitter:description', metadata.description);
    setMeta('twitter:url', url);
    setMeta('twitter:image', SOCIAL_IMAGE_URL);

    let script = document.head.querySelector<HTMLScriptElement>(`script[data-${marker}="jsonld"]`);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(`data-${marker}`, 'jsonld');
      document.head.append(script);
    }
    script.textContent = jsonLdScript(buildJsonLd(metadata));
  }, [step]);

  return null;
}
