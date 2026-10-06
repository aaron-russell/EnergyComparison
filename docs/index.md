---
layout: home
title: Energy Replay
description: Practical documentation for using, extending and operating the Energy Replay historical energy comparison tool.
hero:
  name: Energy Replay
  text: Historical energy comparison, documented end to end.
  tagline: Replay the same measured household usage against tariffs you choose, then extend the app with safe, provider-independent adapters.
  actions:
    - theme: brand
      text: Use the app
      link: /guide/using-the-app
    - theme: alt
      text: Open Energy Replay
      link: https://energy.russell-tech.co.uk/app/
    - theme: alt
      text: Add an adapter
      link: /guide/adding-an-adapter
features:
  - title: User guide
    details: Connect data, review coverage, add optional EV context, enter tariffs, and understand results.
    link: /guide/using-the-app
  - title: Extension guides
    details: Implement energy providers, file imports, API chargers, and measured-grid attribution.
    link: /guide/adding-an-adapter
  - title: Reference
    details: Find the contracts, normalized data shapes, calculations, deployment notes, and release gates.
    link: /reference/contracts
---

## For households

Start with the guide to [comparing historical energy costs](/guide/understanding-historical-comparisons),
learn [how household energy data is handled](/guide/privacy-and-energy-data), or [open the app](https://energy.russell-tech.co.uk/app/).

## Documentation as code

This handbook is maintained in the repository beside the application. Every page is Markdown, every
example is synthetic, and the documentation build runs in CI with the application checks. The current
handbook version follows the application package version: **v0.1.0**.

Use the search box to find a concept, or start with the [user journey](/guide/using-the-app). If you
are changing the code, read the [development workflow](/guide/development) before the relevant
[adapter guide](/guide/adding-an-adapter).

<div class="docs-app-cta">
  <div>
    <span class="docs-app-cta__eyebrow">READY TO REPLAY?</span>
    <strong>Take the documented journey in the app.</strong>
    <p>Bring your usage and tariff definitions together in a private browser session.</p>
  </div>
  <a class="docs-app-cta__link" href="https://energy.russell-tech.co.uk/app/">Open Energy Replay <span aria-hidden="true">↗</span></a>
</div>

## About this project

Read [about the author and Russell Tech](/about), the [Energy Replay project case study](/projects/energy-replay),
the [editorial policy](/editorial-policy), [privacy and security guide](/operations/privacy-and-security),
or [contact guidance](/contact).
