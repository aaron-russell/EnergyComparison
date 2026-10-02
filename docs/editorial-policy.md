---
title: Editorial policy
description: How Energy Replay documentation is researched, reviewed, corrected, and updated.
schemaType: WebPage
reviewed: 2026-10-02
---

# Editorial policy

Energy Replay documentation is maintained alongside the source repository. Its purpose is to help
people use, audit, and extend the application without overstating what the project proves.

## Sources and claims

Technical descriptions are based on the repository source, tests, fixtures, configuration, and
documentation. Provider behavior is described as supported, unsupported, or requiring live release
checks where the repository evidence requires that distinction. Synthetic fixtures are labelled as
synthetic and are never presented as real offers, accounts, or household records.

We do not invent author credentials, client outcomes, savings, supplier relationships, reviews, or
personal contact details. Missing owner information is marked as a placeholder until the owner
supplies and verifies it.

## Review and corrections

Each editorial page includes a visible review date. VitePress also shows a source-derived “Last
updated” value for handbook pages. Source changes, dependency changes, provider contract changes,
and corrections should update the relevant page and its review date.

Report a factual correction through the [GitHub repository](https://github.com/aaron-russell/EnergyComparison).
Report security issues privately as described in [SECURITY.md](https://github.com/aaron-russell/EnergyComparison/blob/main/SECURITY.md);
do not include credentials or real meter data.

## Independence

Energy Replay is independent of the named energy and charging providers. It is a historical replay
tool, not financial, energy-efficiency, or regulated advice. Results depend on the data and tariff
definitions supplied by the user.
