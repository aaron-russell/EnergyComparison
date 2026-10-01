# Connect and import history

## Connect an energy provider

Choose a provider on **Connect**. The bundled options are Octopus and Synthetic example. Octopus can
discover import supplies from an account or accept a manual meter list. Credentials are used in the
active browser session only and are cleared when the connection is disconnected.

Select only import supplies. Export meters are not part of household replay. Replacement meters for
one meter point are combined into one anonymous supply; separate meter points remain separate supplies.

For a first run, choose **Synthetic example**. It generates deterministic electricity and gas data,
so it is safe for screenshots, tests, and documentation.

## Choose the period

The start date is included and the end date is excluded. Both are London calendar midnights. The
default is the previous 12 complete London calendar months. The maximum period is five years.

The app expects exact half-hour readings with explicit UTC boundaries. Duplicate records are removed;
conflicting overlaps block comparison until the source or manual meter list is corrected. Partial
provider failures retain completed pages and show a retry action, but incomplete data must be reviewed.

## Import behavior

The connection layer owns provider requests, authentication, pagination, cancellation, and upstream
response parsing. The calculation engine receives only anonymous normalized readings. This separation
is important both for privacy and for adding another provider without changing pricing code.

Continue to [coverage and estimates](/guide/coverage-and-estimates) when the import has no conflicts.
