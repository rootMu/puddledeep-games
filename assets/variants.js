(() => {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    const sync = () => {
      const dark = document.documentElement.dataset.theme !== 'light';
      toggle.removeAttribute('aria-pressed');
      toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
      toggle.querySelector('.theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = dark ? '#120f1c' : '#f7f1ff';
    };
    sync();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem('puddledeep-theme', theme); } catch (_) {}
      sync();
    });
  }
})();
