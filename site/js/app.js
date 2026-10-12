// Hash router + page shell. Views are loaded on demand and return a cleanup function.
import { initPanel, closePanel } from './panel.js';
import { $, $$, tip } from './ui.js';

const main = $('#main');
let cleanup = null;
let token = 0;

const VIEWS = {
  '': { load: () => import('./views/home.js'), title: 'Lion Lines — the family trees of Londolozi’s lions and leopards', cls: 'home' },
  lions: { load: () => import('./views/lions.js'), title: 'Lions — Lion Lines', cls: 'viz' },
  leopards: { load: () => import('./views/leopards.js'), title: 'Leopards — Lion Lines', cls: 'viz' },
  about: { load: () => import('./views/about.js'), title: 'About the data — Lion Lines', cls: 'doc' },
};

function parse() {
  const seg = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = VIEWS[seg[0] ?? ''] ? seg[0] ?? '' : '';
  if (name === 'lions') {
    const tab = seg[1] === 'bloodlines' ? 'bloodlines' : 'prides';
    return { name, params: { tab, sel: seg[1] === 'bloodlines' || seg[1] === 'prides' ? seg[2] : undefined } };
  }
  if (name === 'leopards') return { name, params: { sel: seg[1] } };
  return { name, params: {} };
}

async function route() {
  const my = ++token;
  const { name, params } = parse();
  const view = VIEWS[name];

  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  closePanel({ silent: true });
  tip.hide();

  document.title = view.title;
  document.body.dataset.view = view.cls;
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  main.classList.add('loading');
  main.scrollTop = 0;
  scrollTo(0, 0);

  const mod = await view.load();
  if (my !== token) return;
  main.innerHTML = '';
  const fn = await mod.mount(main, params);
  if (my !== token) { fn?.(); return; }
  cleanup = fn || null;
  main.classList.remove('loading');
  main.focus({ preventScroll: true });
}

initPanel();
addEventListener('hashchange', route);
route();

// the header turns solid once the hero is scrolled past
const topbar = $('.topbar');
const onScroll = () => topbar.classList.toggle('solid', scrollY > 40 || document.body.dataset.view !== 'home');
addEventListener('scroll', onScroll, { passive: true });
new MutationObserver(onScroll).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
onScroll();

// mobile menu
const burger = $('.burger');
burger?.addEventListener('click', () => {
  const open = topbar.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', String(open));
});
$('.topbar nav')?.addEventListener('click', (e) => {
  if (e.target.closest('a')) { topbar.classList.remove('menu-open'); burger?.setAttribute('aria-expanded', 'false'); }
});
