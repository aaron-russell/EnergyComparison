const svgNamespace = 'http://www.w3.org/2000/svg';

function createLink(href, text, className = '') {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  if (className) link.className = className;
  return link;
}

function createSearchIcon() {
  const icon = document.createElementNS(svgNamespace, 'svg');
  icon.setAttribute('viewBox', '0 0 20 20');
  icon.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS(svgNamespace, 'circle');
  circle.setAttribute('cx', '8.7');
  circle.setAttribute('cy', '8.7');
  circle.setAttribute('r', '5.7');
  const handle = document.createElementNS(svgNamespace, 'path');
  handle.setAttribute('d', 'm13 13 4 4');
  icon.append(circle, handle);
  return icon;
}

function createMenuIcon() {
  const icon = document.createElementNS(svgNamespace, 'svg');
  icon.setAttribute('viewBox', '0 0 20 20');
  icon.setAttribute('aria-hidden', 'true');
  for (const y of [5, 10, 15]) {
    const line = document.createElementNS(svgNamespace, 'path');
    line.setAttribute('d', `M3 ${y}h14`);
    icon.append(line);
  }
  return icon;
}

function createDocsSidebarToggle() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'er-docs-sidebar-toggle';
  button.setAttribute('aria-label', 'Open handbook menu');
  button.setAttribute('aria-controls', 'VPSidebarNav');
  button.setAttribute('aria-expanded', 'false');
  button.append(createMenuIcon(), document.createTextNode('Menu'));

  const sync = () => {
    const sidebarControl = document.querySelector('.VPLocalNav .menu');
    const sidebar = document.querySelector('.VPSidebar');
    button.hidden = !sidebarControl || window.matchMedia('(min-width: 960px)').matches;
    button.setAttribute('aria-expanded', String(Boolean(sidebar?.classList.contains('open'))));
  };

  button.addEventListener('click', () => {
    const sidebar = document.querySelector('.VPSidebar');
    if (sidebar?.classList.contains('open')) {
      document.querySelector('.VPBackdrop')?.click();
    } else {
      document.querySelector('.VPLocalNav .menu')?.click();
    }
    sync();
  });

  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });
  window.addEventListener('resize', sync);
  sync();
  return button;
}

function createBrand() {
  const brand = createLink('/', '', 'er-site-brand');
  brand.setAttribute('aria-label', 'Energy Replay home');
  const logo = document.createElement('img');
  logo.src = '/logo.svg';
  logo.alt = '';
  logo.width = 40;
  logo.height = 40;
  const copy = document.createElement('span');
  copy.className = 'er-site-brand-copy';
  copy.append(document.createTextNode('Energy Replay'));
  const byline = document.createElement('small');
  byline.textContent = 'BY RUSSELL TECH';
  copy.append(byline);
  brand.append(logo, copy);
  return brand;
}

function createNavigation(appIsCurrent, docsIsCurrent) {
  const navigation = document.createElement('nav');
  navigation.className = 'er-site-menu';
  navigation.setAttribute('aria-label', 'Main navigation');
  if (docsIsCurrent) navigation.append(createDocsSidebarToggle());
  navigation.append(
    createLink('/docs/guide/using-the-app.html', 'How it works'),
    createLink('/docs/guide/privacy-and-energy-data.html', 'Privacy'),
    createLink('/docs/about.html', 'About'),
  );
  const search = createLink('/docs/?search=1', '', 'er-site-search');
  search.setAttribute('aria-label', 'Search the handbook');
  search.addEventListener('click', (event) => {
    const searchButton = document.querySelector('.DocSearch-Button');
    if (window.location.pathname.startsWith('/docs/') && searchButton) {
      event.preventDefault();
      searchButton.click();
    }
  });
  const searchLabel = document.createElement('span');
  searchLabel.textContent = 'Search';
  search.append(createSearchIcon(), searchLabel);
  const appLink = createLink('/app/', 'Open app', 'er-site-menu-cta');
  if (appIsCurrent) appLink.setAttribute('aria-current', 'page');
  navigation.append(search, appLink);
  return navigation;
}

class EnergySiteHeader extends HTMLElement {
  connectedCallback() {
    if (this.hasChildNodes()) return;

    const appIsCurrent = window.location.pathname.startsWith('/app');
    const docsIsCurrent = window.location.pathname.startsWith('/docs/');
    const header = document.createElement('header');
    header.className = 'er-site-header';
    header.append(createBrand(), createNavigation(appIsCurrent, docsIsCurrent));
    this.append(header);
  }
}

if (!customElements.get('energy-site-header')) {
  customElements.define('energy-site-header', EnergySiteHeader);
}
