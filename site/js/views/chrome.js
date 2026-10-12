// Shared page chrome for the chart views: title block, optional tabs, search + zoom tools.
import { esc, $, $$ } from '../ui.js';

export function shell({ cls, eyebrow, title, lede, tabs, tools = '', legend = '', searchHint }) {
  const tabHtml = tabs
    ? `<nav class="tabs" aria-label="Choose a view">${tabs
        .map((t) => `<a href="${esc(t.href)}" class="tab${t.active ? ' active' : ''}" ${t.active ? 'aria-current="page"' : ''}>${esc(t.label)}</a>`)
        .join('')}</nav>`
    : '';
  return `
  <section class="viz-view ${esc(cls)}">
    <header class="viz-head">
      <div class="viz-title">
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h1>${esc(title)}</h1>
        <p class="lede">${lede}</p>
      </div>
      ${tabHtml}
    </header>
    <div class="viz-tools">
      <label class="search">
        <span class="sr">Search</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l5 5"/></svg>
        <input type="search" name="q" placeholder="${esc(searchHint)}" autocomplete="off" spellcheck="false">
        <span class="count" aria-live="polite"></span>
      </label>
      ${tools}
      <div class="zoom" role="group" aria-label="Zoom the timeline">
        <button type="button" data-z="out" aria-label="Zoom out">−</button>
        <button type="button" data-z="fit">Fit</button>
        <button type="button" data-z="in" aria-label="Zoom in">+</button>
      </div>
    </div>
    <div class="viz-legend">${legend}</div>
    <div class="chart" id="chart"></div>
  </section>`;
}

/** Wire search + zoom to a chart instance. */
export function bindTools(root, chart) {
  const input = $('.search input', root);
  const count = $('.search .count', root);
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const n = chart.search(input.value);
      count.textContent = input.value.trim() ? (n ? `${n} found` : 'none found') : '';
      count.classList.toggle('none', !!input.value.trim() && !n);
    }, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; input.dispatchEvent(new Event('input')); }
  });
  $$('.zoom button', root).forEach((b) =>
    b.addEventListener('click', () => {
      const z = b.dataset.z;
      if (z === 'fit') chart.fit();
      else chart.zoomBy(z === 'in' ? 1.3 : 1 / 1.3);
    }));
}

export const swatch = (color, label, attrs = '') =>
  `<button type="button" class="swatch" ${attrs} style="--c:${esc(color)}"><i></i>${esc(label)}</button>`;

export function fail(root, err) {
  console.error(err);
  root.innerHTML = `<section class="page narrow"><p class="eyebrow">Something went wrong</p><h1>The data could not be loaded</h1><p class="lede">${esc(err.message)}. Try reloading the page.</p></section>`;
}
