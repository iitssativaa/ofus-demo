(function () {
  function apply(theme) {
    var dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#18191B' : '#F5F6FB';
  }
  try { apply(localStorage.getItem('ofus.theme.v1')); } catch { apply('light'); }
  window.addEventListener('storage', function (event) { if (event.key === 'ofus.theme.v1') { apply(event.newValue); window.dispatchEvent(new Event('ofus:themechange')); } });
})();

