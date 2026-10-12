import { createLineage } from '../lineage.js';
import { esc, ext, paras, loadJSON, $, $$ } from '../ui.js';
import { openPanel, closePanel, chip, kv, section } from '../panel.js';
import { shell, bindTools, swatch, fail } from './chrome.js';

export const DYNASTY_COLOR = {
  'Mother Leopard': '#6b4a2f',
  'Sunset Bend': '#c0662d',
  'River Female': '#2f7482',
  'Saseka Female': '#7a4a6d',
  'Short Tail Female': '#5d7a3a',
  'Little Bush': '#4a6fa5',
  Unknown: '#8a857a',
};
const dynLabel = (d) => (d === 'Unknown' ? 'Lineage not recorded' : d);

export async function mount(root, params) {
  let data;
  try {
    data = await loadJSON('data/leopards.json');
  } catch (err) {
    fail(root, err);
    return () => {};
  }

  const raw = new Map(data.nodes.map((n) => [n.id, n]));
  const alive = data.nodes.filter((n) => !n.ghost && n.status === 'Alive').length;

  root.innerHTML = shell({
    cls: 'leopards',
    eyebrow: 'The Leopards of Londolozi',
    title: 'Six dynasties, followed mother to cub',
    lede: `${data.count} leopards, ${alive} alive today. Each bar is a life; a drop joins a mother to a cub at its birth. Hover to trace a bloodline, select for the full story.`,
    searchHint: 'Find a leopard — name, alias or spots (e.g. 3:3)',
    tools: `
      <div class="seg" role="group" aria-label="Show">
        <button type="button" data-status="all" aria-pressed="true">All</button>
        <button type="button" data-status="Alive" aria-pressed="false">Alive</button>
        <button type="button" data-status="Deceased" aria-pressed="false">Deceased</button>
      </div>
      <label class="toggle"><input type="checkbox" id="fathers"><span class="track"></span><span>Show fathers</span></label>`,
    legend: `
      <div class="swatches" role="group" aria-label="Filter by dynasty">
        ${data.dynasties.map((d) => swatch(DYNASTY_COLOR[d], dynLabel(d), `data-dyn="${esc(d)}" aria-pressed="false"`)).join('')}
      </div>
      <ul class="key" aria-label="How to read the chart">
        <li><svg viewBox="0 0 22 14"><circle cx="11" cy="7" r="5"/></svg>Female</li>
        <li><svg viewBox="0 0 22 14"><path d="M11 1.5L17 7l-6 5.5L5 7z"/></svg>Male</li>
        <li><svg viewBox="0 0 22 14"><circle class="live" cx="11" cy="7" r="6"/><circle cx="11" cy="7" r="2.4"/></svg>Alive today</li>
        <li><svg viewBox="0 0 22 14"><path class="tick" d="M11 1v12"/></svg>Death</li>
        <li><svg viewBox="0 0 22 14"><circle class="ghost" cx="11" cy="7" r="5"/></svg>Unpublished profile</li>
      </ul>`,
  });

  // ---- viz nodes
  const vnodes = data.nodes.map((n) => {
    if (n.ghost) return { id: n.id, ghost: true, label: 'Unpublished profile', sub: '', start: 0, color: '#8a857a', search: 'unpublished', aria: 'Unpublished leopard profile' };
    const deceased = n.status !== 'Alive';
    return {
      id: n.id, label: n.name, sub: `${n.spots ?? ''}`,
      start: n.bornYear, end: deceased ? n.diedYear : null, open: !deceased, endUnknown: deceased && !n.diedYear,
      shape: n.sex === 'male' ? 'diamond' : 'circle', color: DYNASTY_COLOR[n.lineage] || DYNASTY_COLOR.Unknown,
      search: [n.name, n.title, n.spots, ...n.aliases].join(' ').toLowerCase(),
      aria: `${n.title}, born ${n.bornYear}, ${deceased ? 'deceased' : 'alive'}`,
      status: n.status, lineage: n.lineage,
    };
  });
  // a hidden parent sits just before its earliest known child
  for (const g of vnodes.filter((v) => v.ghost)) {
    const kids = data.links.filter((l) => l.from === g.id).map((l) => l.year);
    g.start = Math.min(...kids) - 0.9;
  }
  const vlinks = data.links.map((l) => ({ ...l, primary: l.role === 'mother' }));

  const firstSingle = data.families.findIndex((x) => x.size === 1);
  const famLabel = (r, idx) => {
    const f = data.families[idx];
    if (!f) return null;
    if (f.size === 1) return idx === firstSingle ? 'Leopards with no recorded mother or cubs' : null;
    const rr = raw.get(r.id);
    return f.dynasty !== 'Unknown'
      ? `${f.dynasty} dynasty  ·  ${f.size} leopards`
      : `Line of ${rr.ghost ? 'an unpublished profile' : rr.title}  ·  ${f.size} leopards`;
  };

  const tipHtml = (n) => {
    const r = raw.get(n.id);
    if (r.ghost) return '<strong>Unpublished profile</strong><span>Referenced as a parent, but not public</span>';
    const span = r.status === 'Alive' ? `${r.bornYear} – today` : `${r.bornYear} – ${r.diedYear ?? '?'}`;
    return `<strong>${esc(r.title)}</strong><span>${esc(span)} · ${esc(r.status.toLowerCase())}</span><span>${esc(dynLabel(r.lineage))}</span>`;
  };

  const chart = createLineage($('#chart', root), {
    nodes: vnodes, links: vlinks, rootOrder: data.families.map((f) => f.root), bandLabel: famLabel, bandH: 34,
    now: data.now, ariaLabel: 'Leopard family tree on a timeline', tip: tipHtml,
    onSelect: (n) => show(n.id),
  });
  bindTools(root, chart);
  chart.fit();

  // ---- filters
  let status = 'all';
  const dyns = new Set();
  const applyFilter = () => {
    chart.setFilter((n) => n.ghost || ((status === 'all' || n.status === status) && (!dyns.size || dyns.has(n.lineage))));
    $$('.seg button', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === status)));
    $$('.swatch', root).forEach((b) => b.setAttribute('aria-pressed', String(dyns.has(b.dataset.dyn))));
  };
  $$('.seg button', root).forEach((b) => b.addEventListener('click', () => { status = b.dataset.status; applyFilter(); }));
  $$('.swatch', root).forEach((b) =>
    b.addEventListener('click', () => {
      if (dyns.has(b.dataset.dyn)) dyns.delete(b.dataset.dyn);
      else dyns.add(b.dataset.dyn);
      applyFilter();
    }));
  $('#fathers', root).addEventListener('change', (e) => chart.showSecondary(e.target.checked));

  // ---- detail panel
  const kidsOf = (id) => [...new Set(data.links.filter((l) => l.from === id).map((l) => l.to))];
  const sibsOf = (n) => {
    const s = new Set(n.siblings);
    if (n.mother) data.links.filter((l) => l.from === n.mother && l.role === 'mother').forEach((l) => s.add(l.to));
    s.delete(n.id);
    return [...s];
  };
  const personChip = (id) => {
    const r = raw.get(id);
    if (!r) return '';
    return r.ghost ? chip(null, 'Unpublished profile') : chip(id, r.title);
  };

  function onClose() {
    chart.select(null);
    history.replaceState(null, '', '#/leopards');
  }

  function show(id, { reveal = false } = {}) {
    const n = raw.get(id);
    if (!n) return;
    chart.select(id, { reveal });
    history.replaceState(null, '', `#/leopards/${id}`);
    const nav = { go: (x) => show(x, { reveal: true }), close: onClose };
    if (n.ghost) {
      openPanel({
        eyebrow: 'Hidden profile', title: 'Unpublished profile',
        html: `<p class="note">This leopard is named as a parent in the public records, but its profile is not published, so its name is unknown here.</p>
          ${section('Known cubs', kidsOf(id).map(personChip).join(''))}`,
        accent: '#8a857a',
      }, nav);
      return;
    }
    const color = DYNASTY_COLOR[n.lineage] || DYNASTY_COLOR.Unknown;
    const span = n.status === 'Alive' ? `${n.born || n.bornYear} – today` : `${n.born || n.bornYear} – ${n.died || 'date not recorded'}`;
    const kids = kidsOf(id);
    const litters = (n.litters || []).map((l) =>
      `<li><b>${esc([l.month, l.year].filter(Boolean).join(' '))}</b>${l.cubs ? ` · ${esc(l.cubs)} cubs` : ''}${l.description ? ` — ${esc(l.description)}` : ''}</li>`).join('');
    const involved = (n.deathInvolved || []).length ? ` Involved: ${esc(n.deathInvolved.join(', '))}.` : '';
    const html = `
      <div class="facts">
        <span class="pill ${n.status === 'Alive' ? 'live' : ''}">${esc(n.status)}</span>
        <span class="pill">${n.sex === 'male' ? '◆ Male' : '● Female'}</span>
        <span class="pill dyn" style="--c:${color}">${esc(dynLabel(n.lineage))}</span>
      </div>
      <dl class="kvs">
        ${kv('Lifespan', esc(span))}
        ${kv('Spots', esc(n.spots))}
        ${kv('Also known as', esc((n.aliases || []).join(', ')))}
      </dl>
      ${n.deathNote ? `<p class="note"><b>How it ended.</b> ${esc(n.deathNote)}.${involved}</p>` : ''}
      ${section('Family',
        `<dl class="kvs">
          ${kv('Mother', n.mother ? personChip(n.mother) : n.motherName ? esc(n.motherName) : '')}
          ${kv('Father', n.father ? personChip(n.father) : '')}
          ${kv('Siblings', sibsOf(n).map(personChip).join(''))}
          ${kv(`Cubs (${kids.length})`, kids.map(personChip).join(''))}
        </dl>`)}
      ${section('Territory', `<div class="prose">${paras(n.territory)}</div>`)}
      ${litters ? section('Litters', `<ul class="litters">${litters}</ul>`) : ''}
      ${section('Profile', `<div class="prose">${paras(n.profile || n.excerpt)}</div>`)}
      <p class="source">${ext(n.url, 'Read the original profile on leopards.londolozi.com')}</p>`;
    openPanel({ eyebrow: `Leopard · ${dynLabel(n.lineage)}`, title: n.name, subtitle: n.title, html, accent: color }, nav);
  }

  if (params.sel && raw.has(params.sel)) show(params.sel, { reveal: true });

  return () => { closePanel({ silent: true }); chart.destroy(); };
}
