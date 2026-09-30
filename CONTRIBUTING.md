# Contributing

Use Node.js 24 and npm. Install with `npm ci` and start the app with `npm run dev`.

## Code quality

- `npm run format` applies Prettier to source, configuration and documentation.
- `npm run format:check` checks formatting without changing files.
- `npm run lint` runs ESLint for TypeScript and React, including Hooks rules.
- `npm run lint:fix` applies safe automatic lint fixes.
- `npm run check` runs formatting, linting, type checking, unit tests and a production build.
- `npm run test:e2e` runs browser workflows separately.

Use descriptive names, small functions and explicit error states. Separate parsing, validation,
calculation and presentation. Keep money and energy as decimal strings; do not convert them to
JavaScript numbers for calculations. Explain assumptions at the point where a user makes a choice.

Use synthetic fixtures only. Never commit API keys, account details, meter identifiers, device
identifiers or real consumption. New adapters need contract tests and registration in the relevant
registry; the calculation engine must remain independent of providers.

Prettier owns formatting. ESLint catches correctness and maintainability problems; conflicting
formatting rules are disabled with `eslint-config-prettier`. Editor settings are in `.editorconfig`.

## Keep functions focused

Production functions have enforced limits: complexity 10, nesting depth 3, and 80 nonblank,
noncomment lines. Extract coherent parsing, validation or domain operations rather than adding
exceptions to these limits. See [architecture and module responsibilities](docs/architecture.md).
