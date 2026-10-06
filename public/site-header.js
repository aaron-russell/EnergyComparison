class EnergySiteHeader extends HTMLElement {
  connectedCallback() {
    if (this.hasChildNodes()) return;

    const appIsCurrent = window.location.pathname.startsWith('/app');
    this.innerHTML = `
      <header class="er-site-header">
        <a class="er-site-brand" href="/" aria-label="Energy Replay home">
          <img src="/logo.svg" alt="" width="40" height="40" />
          <span class="er-site-brand-copy">Energy Replay<small>BY RUSSELL TECH</small></span>
        </a>
        <nav class="er-site-menu" aria-label="Main navigation">
          <a href="/docs/guide/using-the-app.html">How it works</a>
          <a href="/docs/guide/privacy-and-energy-data.html">Privacy</a>
          <a href="/docs/about.html">About</a>
          <a class="er-site-search" href="/docs/?search=1" aria-label="Search the handbook">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.7"/><path d="m13 13 4 4"/></svg>
            <span>Search</span>
          </a>
          <a class="er-site-menu-cta" href="/app/"${appIsCurrent ? ' aria-current="page"' : ''}>Open app</a>
        </nav>
      </header>`;
  }
}

if (!customElements.get('energy-site-header')) {
  customElements.define('energy-site-header', EnergySiteHeader);
}
