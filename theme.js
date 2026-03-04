(function () {
  const STORAGE_KEY = 'chaveiro-theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function init() {
    const theme = getStoredTheme();
    setTheme(theme);

    const select = document.getElementById('theme-select');
    if (select) {
      select.value = theme;
      select.addEventListener('change', (e) => setTheme(e.target.value));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
