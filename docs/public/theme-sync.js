(() => {
  const key = 'energy-replay:theme';
  const readTheme = () => {
    try {
      return localStorage.getItem(key) || 'dark';
    } catch {
      return 'dark';
    }
  };
  const apply = () => {
    document.documentElement.classList.toggle('dark', readTheme() !== 'light');
  };

  try {
    apply();
    new MutationObserver(apply).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    window.addEventListener('storage', (event) => {
      if (event.key === key) apply();
    });
  } catch {
    apply();
  }
})();
