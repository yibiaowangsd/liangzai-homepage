// Standalone pages share the site's header and keyboard-friendly mobile menu.
const trigger = document.querySelector('.menu-toggle');
const source = document.querySelector('.site-nav');
if (trigger && source) {
  const menu = document.createElement('div');
  menu.id = 'practice-mobile-menu';
  menu.className = 'practice-mobile-menu';
  menu.hidden = true;
  const nav = source.cloneNode(true);
  nav.className = '';
  nav.setAttribute('aria-label', '移动导航');
  menu.append(nav);
  document.body.append(menu);
  let previousOverflow = '';
  function setOpen(open) {
    if (open === !menu.hidden) return;
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      nav.querySelector('a')?.focus();
    } else {
      document.body.style.overflow = previousOverflow;
      trigger.focus();
    }
  }
  trigger.addEventListener('click', () => setOpen(menu.hidden));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') setOpen(false);
    if (event.key !== 'Tab') return;
    const items = [trigger, ...nav.querySelectorAll('a')];
    const index = items.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); trigger.focus(); }
  });
  const desktop = matchMedia('(min-width: 1101px)');
  const resize = () => { if (desktop.matches) setOpen(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', resize);
  else desktop.addListener(resize);
}
