# Cloudflare Pages

The application is entirely static. No Pages Functions, server secrets or runtime bindings are
needed. Browser credentials are entered by each user at runtime and must never become build vars.

## Git-based deployment

Create a Pages project connected to this repository. Use Node.js 24, build command `npm run build`
and output directory `dist`. Leave the root directory as the project root. Configure deployment
branch protection and CI checks as appropriate. Do not enable Web Analytics or Zaraz.

## Direct upload

```sh
npm ci
npm run check
npm run test:e2e
npx wrangler login
npx wrangler pages project create energy-replay --production-branch main
npx wrangler pages deploy dist --project-name energy-replay
```

Use an existing intended project name instead of creating a duplicate if already provisioned.
For CI, provide a narrowly scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through the
CI secret store. These are deployment credentials, never browser build variables.

The default `wrangler.jsonc` is Pages configuration. Static security headers are copied from
`public/_headers`. The app has a single URL and in-memory step navigation. Cloudflare's SPA
fallback serves the same entry document. No third-party font or image origin is required.

After deployment, inspect the response CSP and verify the worker, tariff validator, downloads,
provider CORS and mobile layouts using synthetic data first. Then run the live release checklist.
Attach custom domains through Pages and verify HTTPS. Keep the previous successful deployment
available for rollback; do not replace it until checks pass.

Sources: [Cloudflare Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/),
[Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).
