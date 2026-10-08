(function () {
  var root = document.documentElement;
  function saved(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
  function font(value) {
    root.dataset.fontSize = value === 'large' ? 'large' : 'normal';
    document.querySelectorAll('[data-font-size]').forEach(function (el) { el.value = root.dataset.fontSize; });
    window.dispatchEvent(new Event('liangzai:font-change'));
  }
  var motionPaused = saved('liangzai-motion', '') === 'paused';
  function motion() {
    root.dataset.reducedMotion = String(motionPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.querySelectorAll('[data-motion-toggle]').forEach(function (el) { el.checked = root.dataset.reducedMotion === 'true'; });
  }
  font(saved('liangzai-font-size', 'normal')); motion();
  window.addEventListener('liangzai:font-request', function (event) { font(event.detail); try {localStorage.setItem('liangzai-font-size', root.dataset.fontSize);} catch {} });
  window.addEventListener('storage', function () {font(saved('liangzai-font-size', 'normal')); motionPaused=saved('liangzai-motion','active')==='paused'; motion();});
  window.addEventListener('liangzai-motion-change', function () { motionPaused = saved('liangzai-motion', motionPaused ? 'paused' : 'active') === 'paused'; motion(); });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', motion);
  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-font-size]')) window.dispatchEvent(new CustomEvent('liangzai:font-request', {detail:event.target.value}));
    if (event.target.matches('[data-motion-toggle]')) { motionPaused = event.target.checked; try {localStorage.setItem('liangzai-motion', event.target.checked ? 'paused' : 'active');} catch {} motion(); window.dispatchEvent(new Event('liangzai-motion-change')); }
  });
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-search-shortcut]').forEach(function (el) {el.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';});
    font(saved('liangzai-font-size', 'normal')); motion();
    if (!document.querySelector('.topbar.site-chrome')) return;
    var button = document.createElement('button'); button.className = 'floating-top'; button.type = 'button'; button.textContent = '↑ 回到顶部'; button.setAttribute('aria-label', '回到顶部');
    function update() {button.hidden = window.scrollY < 500;}
    button.addEventListener('click', function () {window.scrollTo({top:0, behavior:root.dataset.reducedMotion === 'true' ? 'instant' : 'smooth'});});
    update(); window.addEventListener('scroll', update, {passive:true}); document.body.append(button);
  });
})();
