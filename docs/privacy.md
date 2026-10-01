# Privacy

The browser holds credentials, upstream meter/device identifiers, consumption, charging imports
and results in memory. Supplier API requests go directly to fixed HTTPS destinations with cookies
omitted, caching disabled, redirects rejected and referrers omitted. The app never sends this data
to its own host. The energy engine receives anonymous supply references, not upstream identifiers.
If you use the Tariff Tracker postcode lookup, the entered postcode is sent directly to
`tarifftracker.io` to resolve an electricity region; it is not stored by this app.

Names and addresses in Pod Point reports are discarded during normalisation. Raw file contents are
held temporarily in component memory while validating and are cleared after a successful preview.
Connections and raw credential form fields clear after connection/disconnection as appropriate.
Clear session remounts the application; page exit unmounts it, aborts pending requests, disconnects
adapters and terminates calculation workers. Returning through browser history creates a fresh
session. JavaScript cannot promise forensic erasure of browser/OS memory or control extensions.

There are exactly two permitted localStorage keys:

- `energy-replay:saved-tariffs`: written only by explicit tariff Save/Delete actions.
- `energy-replay:theme`: written only when the user changes the theme.

No sessionStorage, IndexedDB, analytics, tracking pixels, session replay, service worker or
application-level sensitive logging is used. Tariff exports contain validated tariff definitions
only. Do not put personal information in manually entered tariff names if you plan to share them.

The hosting provider necessarily receives ordinary asset requests and connection metadata. The
static host is not a proxy for energy data. Disable optional Cloudflare Web Analytics and Zaraz
when deploying. No server-side data processing or custom telemetry is configured.
