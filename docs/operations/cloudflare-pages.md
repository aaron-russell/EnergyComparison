# Deploy to Cloudflare Pages

The existing GitHub Actions deployment builds the React application and VitePress handbook together,
then deploys `dist` to the `energy-replay` Pages project. The application is at `/`; the handbook is at
`/docs/`.

## Local verification

```sh
npm ci
npm run build
npm run preview
```

Check `/`, `/docs/`, a nested handbook page, and an application route. The VitePress base path is
`/docs/`, so do not test the generated site only at its filesystem root.

## GitHub Actions requirements

The deploy workflow requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. CI runs application
quality checks and documentation checks on pushes and pull requests. Publishing does not prove live
provider compatibility, real-account CORS behavior, DNS, or production secrets.

This repository uses the GitHub Actions deployment path. Disable Cloudflare Pages automatic Git
deployment for `energy-replay` before enabling it, or each push to `main` can create a competing
production deployment. Keep the production branch protected and require the quality-check workflow
before merging.
