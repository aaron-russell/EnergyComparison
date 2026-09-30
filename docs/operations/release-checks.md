# Release checks

Run the automated checks first:

```sh
npm run check
npm run docs:check
npm run test:e2e
```

Then verify the combined preview at `/` and `/docs/`. Synthetic workflows prove contracts, parsing,
calculation, accessibility, and build behavior only. Before calling a release live-ready, separately
verify authenticated Octopus access, SmartFlex permissions and CORS, real Pod Point exports, hosted CSP,
Cloudflare Pages credentials, and any DNS or provider configuration.
