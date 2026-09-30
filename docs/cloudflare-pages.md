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

## GitHub Actions with Wrangler

The repository workflow at `.github/workflows/deploy.yml` builds and deploys the Pages project with
`cloudflare/wrangler-action` when changes land on `main`, and creates a `pr-<number>` preview branch
for pull requests from this repository. The preview job updates a single pull request comment with
the stable preview alias and immutable deployment URL. Passing `GITHUB_TOKEN` also creates GitHub
Deployment records for both production and preview deployments. Pull requests from forks are skipped
because Cloudflare deployment secrets are not exposed to fork workflows.

The workflow grants `issues: write` so the preview step can create or update the pull request comment;
GitHub models pull request conversation comments through its Issues API.

The workflow can also be started manually with the `workflow_dispatch` action in GitHub. This is the
deployment path for this project: disable Cloudflare Pages' automatic Git deployment for the project
before enabling it, or every push to `main` will create duplicate deployments. Add these repository
secrets before enabling the workflow:

- `CLOUDFLARE_API_TOKEN`: a narrowly scoped token with Pages project edit permission.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account that owns the Pages project.

The workflow uses the Pages project name `energy-replay`, uploads the Vite `dist` directory, and
creates a GitHub deployment record. Keep the build and deployment branch protected by requiring the
existing quality-check workflow before merging.

The default `wrangler.jsonc` is Pages configuration. Static security headers are copied from
`public/_headers`. The app has a single URL and in-memory step navigation. Cloudflare's SPA
fallback serves the same entry document. No third-party font or image origin is required.

After deployment, inspect the response CSP and verify the worker, tariff validator, downloads,
provider CORS and mobile layouts using synthetic data first. Then run the live release checklist.
Attach custom domains through Pages and verify HTTPS. Keep the previous successful deployment
available for rollback; do not replace it until checks pass.

Sources: [Cloudflare Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/),
[Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).
