# Workers Static Assets alternative

The repository also contains `wrangler.workers.jsonc` for serving the built `dist` directory as Workers
Static Assets. Build with `npm run build`, then use the Workers configuration when the deployment target
needs a Worker instead of Pages.

This alternative does not change adapter or calculation behavior. Verify both `/` and `/docs/`, preserve
the static asset headers, and run the same synthetic and hosted checks before release.
