// Small shared helpers. All text from the data files is treated as untrusted and escaped.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const httpsOnly = (u) => (/^https:\/\//i.test(u || '') ? u : null);

/** External link, only ever https. Falls back to plain text. */
export function ext(url, text) {
  const u = httpsOnly(url);
  return u
    ? `<a class="ext" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span aria-hidden="true"> ↗</span></a>`
    : esc(text);
}

/** Paragraphs from plain text (blank-line separated), escaped. */
export function paras(text) {
  return String(text || '')
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}

export const yr = (v) => (v == null ? '' : String(Math.floor(v)));

export const countUp = (el, to, ms = 1400) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// ---- tooltip (single shared element)
const tipEl = () => document.getElementById('tip');
export const tip = {
  show(html, e) {
    const t = tipEl();
    t.innerHTML = html;
    t.classList.add('on');
    tip.move(e);
  },
  move(e) {
    const t = tipEl();
    const pad = 16;
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    t.style.transform = `translate(${Math.max(8, x)}px,${Math.max(8, y)}px)`;
  },
  hide() {
    tipEl()?.classList.remove('on');
  },
};

export const loadJSON = (() => {
  const cache = new Map();
  return (url) => {
    if (!cache.has(url)) {
      cache.set(url, fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.json();
      }));
    }
    return cache.get(url);
  };
})();
