(() => {
  const preferenceKey = 'energy-replay-analytics-opt-out';
  try {
    if (document.cookie.split(';').some((cookie) => cookie.trim() === preferenceKey + '=true')) {
      return;
    }
  } catch {
    // Analytics remains available when browser cookies are unavailable.
  }

  const loadAnalytics = () => {
    if (document.querySelector('script[data-cf-beacon]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({ token: 'ac04a188fd314c8e934df9149d78f383' });
    document.head.append(script);
  };

  const schedule = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadAnalytics, { timeout: 3000 });
    } else {
      window.setTimeout(loadAnalytics, 1000);
    }
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
})();
