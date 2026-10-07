---
title: Deploy to Cloudflare Pages | Energy Replay
description: Build, preview and release the Energy Replay application and handbook on Cloudflare Pages.
---

# Deploy to Cloudflare Pages

The existing GitHub Actions deployment builds the household landing page, React application, and
VitePress handbook together, then deploys `dist` to the `energy-replay` Pages project. The landing
page is at `/`, the application is at `/app/`, and the handbook is at `/docs/`.

## Local verification

```sh
npm ci
npm run build
npm run preview
```

Check `/`, `/app/`, `/docs/`, and a nested handbook page. The VitePress base path is `/docs/`, so do
not test the generated site only at its filesystem root.

## Routing and response policy

Pages serves matching files from `dist/`, so the landing page remains at `/`, the application keeps
its static SPA fallback at `/app/`, and the generated handbook remains under `/docs/`. The canonical
handbook entry point is `/docs/`; do not add
a broad redirect or `404.html`, because either can interfere with nested docs routes or application
fallback behavior.

Entrypoint HTML uses `public, max-age=0, must-revalidate` so deployments can change script references
and SEO metadata immediately. Vite and VitePress fingerprinted files under `/assets/` and
`/docs/assets/` use one-year immutable caching. Stable public docs files such as `logo.svg` and
`theme-sync.js` revalidate instead of receiving immutable caching.

Cloudflare Pages owns ETags and negotiated content encoding. The repository deliberately does not set
either header or `no-transform`. Pages’ default `Access-Control-Allow-Origin: *` is detached because
the site has no cross-origin static-asset requirement. `/api/*` is explicitly `no-store` as a
defensive rule for future server responses; the current deployment has no API or Pages Function.

The `/docs/*` rule detaches the application CSP before applying the VitePress CSP, so documentation
responses have exactly one effective policy. Preview `pages.dev` hostnames receive `X-Robots-Tag:
noindex`; the production custom domain does not.

## GitHub Actions requirements

The deploy workflow requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. CI runs formatting
and lint, coverage, build and site checks, dependency review, and Chromium E2E in parallel jobs. E2E
uses the build artifact. A hosted smoke check runs against each same-repository PR preview and after
production deployment. After production deployment, the workflow also runs the synthetic Chromium
browser workflows against the public domain and records both hosted results in its Actions summary.
A separate nightly workflow runs the E2E suite in Firefox and WebKit.

Dependency review requires GitHub's dependency graph and, for private repositories, a GitHub plan
that supports Dependency Review. It blocks newly introduced high or critical vulnerabilities. Hosted
smoke checks verify the primary HTML routes, CSP and security headers, fingerprinted assets, robots,
sitemap, and 404 behavior. The hosted browser workflows exercise the synthetic application journey.
Publishing still does not prove live provider compatibility, real-account CORS behavior, DNS
correctness, or production secrets; record those checks separately using the per-release evidence
table in the release checklist.

This repository uses the GitHub Actions deployment path. Disable Cloudflare Pages automatic Git
deployment for `energy-replay` before enabling it, or each push to `main` can create a competing
production deployment. Keep the production branch protected and require the quality-check workflow
before merging.
