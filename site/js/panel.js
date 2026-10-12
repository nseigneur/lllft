// Slide-over detail panel (right on desktop, bottom sheet on mobile).
import { esc, $ } from './ui.js';

let opener = null;
let navigate = null;
let onClose = null;

const panel = () => $('#panel');

export function openPanel({ eyebrow, title, subtitle, html, accent }, { go, close, trigger } = {}) {
  const p = panel();
  navigate = go || null;
  onClose = close || null;
  if (!p.classList.contains('open')) opener = trigger || document.activeElement;
  p.style.setProperty('--accent', accent || 'var(--gold)');
  $('.panel-head', p).innerHTML = `
    <p class="eyebrow">${esc(eyebrow || '')}</p>
    <h2 id="panel-title" tabindex="-1">${esc(title)}</h2>
    ${subtitle ? `<p class="panel-sub">${esc(subtitle)}</p>` : ''}`;
  $('.panel-body', p).innerHTML = html;
  $('.panel-scroll', p).scrollTop = 0;
  p.classList.add('open');
  p.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
  $('#panel-title', p).focus({ preventScroll: true });
}

export function closePanel({ silent = false } = {}) {
  const p = panel();
  if (!p.classList.contains('open')) return;
  p.classList.remove('open');
  p.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open');
  if (!silent) onClose?.();
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  opener = null;
}

export function initPanel() {
  const p = panel();
  p.addEventListener('click', (e) => {
    if (e.target.closest('.panel-close')) { closePanel(); return; }
    const go = e.target.closest('[data-go]');
    if (go && navigate) navigate(go.dataset.go);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && p.classList.contains('open')) closePanel();
  });
  $('#scrim')?.addEventListener('click', () => closePanel());
}

/** Reusable fragments --------------------------------------------------- */
export const chip = (id, label, extra = '') =>
  id
    ? `<button class="chip" type="button" data-go="${esc(id)}">${esc(label)}${extra}</button>`
    : `<span class="chip chip-static">${esc(label)}</span>`;

export const kv = (k, v) => (v ? `<div class="kv"><dt>${esc(k)}</dt><dd>${v}</dd></div>` : '');

export const section = (title, inner) => (inner ? `<section class="psec"><h3>${esc(title)}</h3>${inner}</section>` : '');
