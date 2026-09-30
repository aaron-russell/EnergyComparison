# Alternative: Workers Static Assets

The separate `wrangler.workers.jsonc` uploads the same `dist` directory with single-page-application
fallback. It does not add an API proxy or a Worker request handler. There are no data bindings.

```sh
npm ci
npm run check
npm run test:e2e
npx wrangler login
npx wrangler deploy --config wrangler.workers.jsonc --dry-run
npx wrangler deploy --config wrangler.workers.jsonc
```

Set a unique deployment name if `energy-replay` already refers to another application in the
account. This is an alternative to Pages; it is not required for a Pages deployment.
Observability is disabled because this is static hosting and the app must not introduce sensitive
telemetry. Provider requests originate from the browser, not from this Worker.

Static Assets honours `dist/_headers`; verify hosted headers and browser behavior after upload.
No inline or evaluated scripts are allowed. CI uses the same headers on Vite's production preview.

Sources: [Static Assets configuration](https://developers.cloudflare.com/workers/static-assets/),
[SPA fallback](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/),
[Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/).
