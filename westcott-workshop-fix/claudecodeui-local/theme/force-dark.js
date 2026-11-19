(() => {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function apply() {
    if (!root.classList.contains('dark')) root.classList.add('dark');
    if (themeColor && themeColor.content !== '#282d30') {
      themeColor.content = '#282d30';
    }
  }

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  if (themeColor) {
    observer.observe(themeColor, { attributes: true, attributeFilter: ['content'] });
  }
})();
