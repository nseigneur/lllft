import { createLineage } from '../lineage.js';
import { esc, ext, paras, loadJSON, yr, $ } from '../ui.js';
import { openPanel, closePanel, chip, kv, section } from '../panel.js';
import { shell, bindTools, fail } from './chrome.js';

// One colour per pride family, shared by both tabs so a bloodline reads across them.
const GROUPS = {
  tsalala: { label: 'Tsalala', color: '#b08a2e' },
  mhangeni: { label: 'Mhangeni', color: '#7a4a2b' },
  ntsevu: { label: 'Ntsevu & Kambula', color: '#c0662d' },
  nkuhuma: { label: 'Nkuhuma, Talamati & Msuthlu', color: '#5d7a3a' },
  sparta: { label: 'Sparta', color: '#8a857a' },
  styx: { label: 'Styx', color: '#4a6fa5' },
  southern: { label: 'Southern', color: '#2f7482' },
  western: { label: 'Othawa & Ximungwe', color: '#7a4a6d' },
  castleton: { label: 'Castleton', color: '#a39a7e' },
  other: { label: 'Coalitions & unplaced', color: '#2b2a24' },
};
const PRIDE_GROUP = {
  tsalala: 'tsalala', 'tsalala-bw1': 'tsalala', 'tsalala-bw2': 'tsalala', mhangeni: 'mhangeni',
  ntsevu: 'ntsevu', 'ntsevu-bw': 'ntsevu', kambula: 'ntsevu', nkuhuma: 'nkuhuma', 'nkuhuma-bw': 'nkuhuma',
  talamati: 'nkuhuma', msuthlu: 'nkuhuma', sparta: 'sparta', styx: 'styx', southern: 'southern',
  othawa: 'western', ximungwe: 'western', castleton: 'castleton',
};
const WORDS = [
  ['tsalala', 'tsalala'], ['mhangeni', 'mhangeni'], ['ntsevu', 'ntsevu'], ['kambula', 'ntsevu'],
  ['nkuhuma', 'nkuhuma'], ['talamati', 'nkuhuma'], ['msuthlu', 'nkuhuma'], ['sparta', 'sparta'],
  ['styx', 'styx'], ['southern', 'southern'], ['othawa', 'western'], ['ximungwe', 'western'], ['castleton', 'castleton'],
];
const groupOf = (text) => {
  const t = (text || '').toLowerCase();
  const hit = WORDS.find(([w]) => t.includes(w));
  return hit ? hit[1] : 'other';
};
const REL = {
  mother_of: 'mother of', sire_of: 'sire of', breakaway_from: 'broke away from', takeover_of: 'took over',
  killed_by: 'killed by', mated_with: 'mated with', member_of: 'member of', merged_with: 'merged with', sibling_of: 'sibling of',
};

export async function mount(root, params) {
  let data;
  try {
    data = await loadJSON('data/lions.json');
  } catch (err) {
    fail(root, err);
    return () => {};
  }
  return params.tab === 'bloodlines' ? mountBloodlines(root, data, params) : mountPrides(root, data, params);
}

const tabs = (active) => [
  { href: '#/lions', label: 'Pride lineage', active: active === 'prides' },
  { href: '#/lions/bloodlines', label: 'Bloodlines', active: active === 'bloodlines' },
];

const groupLegend = (keys) =>
  `<ul class="swatches static" aria-label="Colour key">${keys
    .map((k) => `<li class="swatch" style="--c:${GROUPS[k].color}"><i></i>${esc(GROUPS[k].label)}</li>`).join('')}</ul>`;

/** Evidence list: every relationship the posts state about this node, quote + source. */
function evidence(data, idxs) {
  if (!idxs?.length) return '';
  const items = [...new Set(idxs)].map((i) => data.relationships[i]).filter(Boolean);
  const li = (r) => `<li class="ev">
      <span class="ev-rel">${esc(r.s)} <em>${esc(REL[r.r] || r.r)}</em> ${esc(r.o)}</span>
      <blockquote>“${esc(r.q)}”</blockquote>
      <span class="ev-meta">${esc(r.d || 'undated')} · ${esc(r.c)} · ${ext(r.u, 'post')}</span></li>`;
  const first = items.slice(0, 6).map(li).join('');
  const rest = items.slice(6);
  return section(`What the posts say (${items.length})`,
    `<ul class="evs">${first}</ul>${rest.length ? `<details><summary>${rest.length} more</summary><ul class="evs">${rest.map(li).join('')}</ul></details>` : ''}`);
}

// ======================================================================= prides
function mountPrides(root, data, params) {
  const P = new Map(data.prides.map((p) => [p.id, p]));
  const kidsOf = (id) => data.prides.filter((p) => p.parent === id);
  const rootsOrder = ['castleton', 'nkuhuma', 'sparta', 'styx', 'southern', 'othawa', 'ximungwe'];

  root.innerHTML = shell({
    cls: 'prides',
    eyebrow: 'The Lions of Londolozi',
    title: 'How the prides split and descend',
    lede: `Prides are born when lionesses break away. Each bar is a pride, each drop a breakaway. Diamonds on a bar mark male coalitions that took over, or mated with, that pride.`,
    searchHint: 'Find a pride or coalition',
    tabs: tabs('prides'),
    legend: groupLegend(['tsalala', 'mhangeni', 'ntsevu', 'nkuhuma', 'sparta', 'styx', 'southern', 'western', 'castleton'])
      + `<ul class="key"><li><svg viewBox="0 0 22 14"><path class="ev-t" d="M11 1L17 7L11 13L5 7Z"/></svg>Takeover</li>
         <li><svg viewBox="0 0 22 14"><path class="ev-m" d="M11 2L16 7L11 12L6 7Z"/></svg>Mated with pride</li>
         <li><svg viewBox="0 0 22 14"><circle cx="11" cy="7" r="5" class="hollowk"/></svg>Origin not stated</li></ul>`,
  });

  const vnodes = data.prides.map((p) => {
    const fade = p.start == null;
    return {
      id: p.id, label: p.name.replace(' Pride', ''), sub: fade ? 'origin not stated' : '',
      start: p.start ?? 1995, startFade: fade, end: p.id === 'castleton' ? 1998.5 : p.end,
      open: p.end == null && p.id !== 'castleton', noEndTick: p.id === 'castleton', hollow: p.approxStart,
      shape: 'circle', r: 6.5, color: GROUPS[PRIDE_GROUP[p.id] || 'other'].color,
      events: p.events.filter((e) => e.year >= Math.floor(p.start ?? 1995)).map((e) => ({ year: e.year, kind: e.kind, coalition: e.coalition })),
      search: [p.name, ...p.aliases, ...p.events.map((e) => e.coalition)].join(' ').toLowerCase(),
      aria: `${p.name}${p.parent ? `, broke away from ${P.get(p.parent).name}` : ''}`,
    };
  });
  const vlinks = data.prides.filter((p) => p.parent)
    .map((p) => ({ from: p.parent, to: p.id, role: 'breakaway', year: p.linkYear, primary: true }));

  const bandLabel = (r) => {
    if (r.id === 'castleton') return 'Castleton → Tsalala → Mhangeni → Ntsevu & Kambula';
    if (r.id === 'nkuhuma') return 'Nkuhuma → Talamati → Msuthlu';
    return r.id === 'sparta' ? 'Prides with no recorded parent or breakaway' : null;
  };

  const tipHtml = (n) => {
    const p = P.get(n.id);
    const span = p.start == null ? 'origin not stated' : `from ${yr(p.start)}`;
    const t = p.events.length ? `${p.events.length} male coalition events` : 'no male events recorded';
    return `<strong>${esc(p.name)}</strong><span>${esc(span)}${p.end ? ` · until ${yr(p.end)}` : ' · still recorded'}</span><span>${esc(t)}</span>`;
  };

  const chart = createLineage($('#chart', root), {
    nodes: vnodes, links: vlinks, rootOrder: rootsOrder, bandLabel, rowH: 84, bandH: 34, ppy: 36,
    now: data.now, ariaLabel: 'Lion pride genealogy on a timeline', tip: tipHtml, onSelect: (n) => show(n.id),
  });
  bindTools(root, chart);
  chart.fit();

  function onClose() { chart.select(null); history.replaceState(null, '', '#/lions'); }

  function show(id, { reveal = false } = {}) {
    const p = P.get(id);
    if (!p) return;
    chart.select(id, { reveal });
    history.replaceState(null, '', `#/lions/prides/${encodeURIComponent(id)}`);
    const color = GROUPS[PRIDE_GROUP[id] || 'other'].color;
    const parent = p.parent ? P.get(p.parent) : null;
    const kids = kidsOf(id);
    const evs = p.events.map((e) => `<li><b>${esc(e.year)}</b> ${esc(e.coalition)} <span class="muted">· ${e.kind === 'takeover' ? 'took over' : 'mated with the pride'}</span></li>`).join('');
    const hist = p.history.map((h) => `<li><b>${esc(h.date)}</b> ${esc(h.event)} ${ext(h.source_url, 'post')}</li>`).join('');
    const html = `
      <p class="note lead">${esc(p.note)}</p>
      <dl class="kvs">
        ${kv('Broke away from', parent ? chip(parent.id, parent.name) + (p.linkYear ? ` <span class="muted">${esc(yr(p.linkYear))}</span>` : '') : '')}
        ${kv('Gave rise to', kids.map((k) => chip(k.id, k.name)).join(''))}
        ${kv('Status', esc(p.status))}
        ${kv('Also called', esc((p.aliases || []).join(' · ')))}
        ${kv('In the posts', p.first ? esc(`${p.first} → ${p.last}`) : '')}
      </dl>
      ${p.origin ? section('Origin', `<div class="prose">${paras(p.origin)}</div>`) : ''}
      ${evs ? section('Males who ruled or mated', `<ul class="timeline">${evs}</ul>`) : ''}
      ${hist ? section('Splits and takeovers, as told', `<ul class="timeline rich">${hist}</ul>`) : ''}
      ${p.members.length ? section(`Lions recorded in this pride (${p.members.length})`, `<p class="members">${p.members.map(esc).join(' · ')}</p>`) : ''}
      ${evidence(data, p.rels)}
      ${p.notes ? section('Notes', `<div class="prose">${paras(p.notes)}</div>`) : ''}`;
    openPanel({ eyebrow: 'Lion pride', title: p.name, subtitle: parent ? `A breakaway from the ${parent.name}` : 'A founding line in these records', html, accent: color },
      { go: (x) => show(x, { reveal: true }), close: onClose });
  }

  if (params.sel && P.has(params.sel)) show(params.sel, { reveal: true });
  return () => { closePanel({ silent: true }); chart.destroy(); };
}

// ======================================================================= bloodlines
function mountBloodlines(root, data, params) {
  const B = data.bloodlines;
  const N = new Map(B.nodes.map((n) => [n.id, n]));

  // primary parent: the mother if there is one, else the sire
  const incoming = new Map();
  B.links.forEach((l, i) => {
    if (!incoming.has(l.to)) incoming.set(l.to, []);
    incoming.get(l.to).push({ ...l, i });
  });
  const primary = new Set();
  for (const ls of incoming.values()) primary.add((ls.find((l) => l.role === 'mother') || ls[0]).i);

  // fill missing years from relatives so every node can be placed (flagged approximate)
  const start = new Map(B.nodes.map((n) => [n.id, n.start]));
  for (let pass = 0; pass < 6; pass++) {
    for (const l of B.links) {
      if (start.get(l.to) == null && start.get(l.from) != null) start.set(l.to, start.get(l.from) + 1);
      if (start.get(l.from) == null && start.get(l.to) != null) start.set(l.from, start.get(l.to) - 1);
    }
  }

  const clean = (s) => s.replace(/\s*\(.*?\)\s*/g, ' ').trim() || s;
  const short = (s) => (s.length > 34 ? `${s.slice(0, 33).trimEnd()}…` : s);
  const compName = (ci) => {
    const members = B.nodes.filter((n) => n.component === ci);
    const counts = {};
    members.forEach((n) => {
      const g = n.kind === 'coalition' ? 'other' : groupOf(n.pride || n.label);
      if (g !== 'other') counts[g] = (counts[g] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => GROUPS[g].label.split(' ')[0]);
    if (top.length) return `${top.join(' · ')} line`;
    const first = members.filter((n) => n.kind !== 'coalition')[0] || members[0];
    return `Line of ${clean(first.label)}`;
  };
  const comps = B.components.map((size, ci) => ({ ci, size, name: compName(ci) })).filter((c) => c.size > 1);

  root.innerHTML = shell({
    cls: 'bloodlines',
    eyebrow: 'The Lions of Londolozi',
    title: 'Bloodlines: mothers, sires and litters',
    lede: `Descent as the blog tells it. Solid drops follow mothers; dotted curves bring in the sires, usually a male coalition. Many cubs are only ever named as a litter, shown as hollow rings.`,
    searchHint: 'Find a lion, litter or coalition',
    tabs: tabs('bloodlines'),
    tools: `
      <label class="select"><span class="sr">Family line</span>
        <select id="comp"><option value="all">All ${comps.length} family lines</option>
        ${comps.map((c) => `<option value="${c.ci}">${esc(c.name)} · ${c.size}</option>`).join('')}</select></label>
      <label class="toggle"><input type="checkbox" id="sires" checked><span class="track"></span><span>Show sires</span></label>`,
    legend: groupLegend(['tsalala', 'mhangeni', 'ntsevu', 'nkuhuma', 'sparta', 'styx', 'southern', 'other'])
      + `<ul class="key"><li><svg viewBox="0 0 22 14"><circle cx="11" cy="7" r="5"/></svg>Lioness</li>
         <li><svg viewBox="0 0 22 14"><path d="M11 1.5L17 7l-6 5.5L5 7z"/></svg>Male</li>
         <li><svg viewBox="0 0 22 14"><rect x="6" y="2" width="10" height="10"/></svg>Coalition</li>
         <li><svg viewBox="0 0 22 14"><circle cx="11" cy="7" r="5" class="hollowk"/></svg>Litter or group</li></ul>`,
  });

  const vnodes = B.nodes.filter((n) => start.get(n.id) != null).map((n) => {
    const isC = n.kind === 'coalition';
    const cohort = n.kind === 'cohort';
    return {
      id: n.id, label: short(clean(n.label)), sub: '',
      start: start.get(n.id), approx: n.start == null || n.approx, end: n.end, noEndTick: isC,
      endUnknown: !isC && n.end == null && !cohort, noBar: cohort && n.end == null, minSpan: isC ? 1 : 0.8,
      shape: isC ? 'square' : n.sex === 'M' ? 'diamond' : 'circle', r: isC ? 5.5 : cohort ? 5 : 6,
      hollow: cohort, color: GROUPS[isC ? 'other' : groupOf(n.pride || n.label)].color,
      search: [n.label, ...(n.aliases || [])].join(' ').toLowerCase(), component: n.component,
      aria: `${n.label}${isC ? ', male coalition' : ''}`,
    };
  });
  const have = new Set(vnodes.map((v) => v.id));
  const vlinks = [];
  B.links.forEach((l, i) => {
    if (have.has(l.from) && have.has(l.to)) vlinks.push({ from: l.from, to: l.to, role: l.role, year: l.year, primary: primary.has(i) });
  });

  const seenComp = new Set();
  const bandLabel = (r) => {
    const c = r.component;
    if (seenComp.has(c)) return null;
    seenComp.add(c);
    const info = comps.find((x) => x.ci === c);
    return info ? `${info.name}  ·  ${info.size} records` : 'Pairs and singletons';
  };

  const tipHtml = (n) => {
    const d = N.get(n.id);
    const kind = d.kind === 'coalition' ? 'Male coalition' : d.kind === 'cohort' ? 'Litter or group' : d.sex === 'M' ? 'Male' : d.sex === 'F' ? 'Lioness' : 'Lion';
    const span = d.kind === 'coalition' ? `seen ${yr(d.start)}–${yr(d.end)}` : d.birthYear ? `born ${d.birthYear}${d.deathYear ? ` · died ${d.deathYear}` : ''}` : 'year inferred from the posts';
    return `<strong>${esc(d.label)}</strong><span>${esc(kind)}</span><span>${esc(span)}</span>`;
  };

  const chart = createLineage($('#chart', root), {
    nodes: vnodes, links: vlinks, rootKey: (n) => n.component ?? 99, bandLabel, rowH: 30, bandH: 34, ppy: 30,
    now: data.now, ariaLabel: 'Lion bloodlines on a timeline', tip: tipHtml, onSelect: (n) => show(n.id),
  });
  bindTools(root, chart);
  chart.fit();
  chart.showSecondary(true);

  $('#sires', root).addEventListener('change', (e) => chart.showSecondary(e.target.checked));
  $('#comp', root).addEventListener('change', (e) => {
    const v = e.target.value;
    chart.setFilter(v === 'all' ? null : (n) => String(n.component) === v);
    if (v !== 'all') {
      const first = vnodes.filter((n) => String(n.component) === v).sort((a, b) => a.y - b.y)[0];
      if (first) chart.reveal(first.id);
    }
  });

  const parentsOf = (id) => B.links.filter((l) => l.to === id);
  const childrenOf = (id) => B.links.filter((l) => l.from === id);
  const nodeChip = (id) => (have.has(id) ? chip(id, clean(N.get(id).label)) : chip(null, clean(N.get(id)?.label || id)));

  function onClose() { chart.select(null); history.replaceState(null, '', '#/lions/bloodlines'); }

  function show(id, { reveal = false } = {}) {
    const n = N.get(id);
    if (!n) return;
    chart.select(id, { reveal });
    history.replaceState(null, '', `#/lions/bloodlines/${encodeURIComponent(id)}`);
    const g = n.kind === 'coalition' ? 'other' : groupOf(n.pride || n.label);
    const kind = n.kind === 'coalition' ? 'Male coalition' : n.kind === 'cohort' ? 'Litter or group' : 'Lion';
    const mothers = parentsOf(id).filter((l) => l.role === 'mother');
    const sires = parentsOf(id).filter((l) => l.role === 'sire');
    const kids = childrenOf(id);
    const sired = (n.sired || []).map((s) => `<li><b>${esc(s.year)}</b> with ${esc(s.mother)}${s.notes ? ` — ${esc(s.notes)}` : ''}</li>`).join('');
    const html = `
      <div class="facts">
        <span class="pill">${esc(kind)}</span>
        ${n.sex && n.sex !== 'mixed' ? `<span class="pill">${esc({ M: '◆ Male', F: '● Female' }[n.sex] || n.sex)}</span>` : ''}
        ${n.confidence ? `<span class="pill ${n.confidence === 'inferred' ? 'warn' : ''}">${esc(n.confidence)}</span>` : ''}
      </div>
      <dl class="kvs">
        ${kv('Pride', esc(n.pride))}
        ${kv('Born', esc(n.birthYear ? `${n.birthYear}${n.birthNote ? ` — ${n.birthNote}` : ''}` : n.birthNote))}
        ${kv('Fate', esc(n.fate))}
        ${kv('Also called', esc((n.aliases || []).join(' · ')))}
        ${kv('Origin', esc(n.origin))}
        ${kv('Territory', esc(n.territory))}
        ${kv('Status', esc(n.status))}
        ${kv(mothers.length > 1 ? 'Possible mothers' : 'Mother', mothers.map((l) => nodeChip(l.from)).join(''))}
        ${kv('Sire', sires.map((l) => nodeChip(l.from)).join(''))}
        ${kv(`Offspring (${kids.length})`, kids.map((l) => nodeChip(l.to)).join(''))}
      </dl>
      ${(n.start == null || n.approx) && start.get(id) != null ? `<p class="note">The position on the chart (${esc(yr(start.get(id)))}) is estimated from the posts; no exact year is stated for this record.</p>` : ''}
      ${sired ? section('Litters sired', `<ul class="timeline">${sired}</ul>`) : ''}
      ${n.notes ? section('Notes', `<div class="prose">${paras(n.notes)}</div>`) : ''}
      ${evidence(data, n.rels)}
      ${(n.sources || []).length ? section('Sources', `<ul class="srcs">${n.sources.slice(0, 6).map((u) => `<li>${ext(u, u.replace('https://blog.londolozi.com/', ''))}</li>`).join('')}</ul>`) : ''}`;
    openPanel({ eyebrow: kind, title: clean(n.label), subtitle: n.pride || '', html, accent: GROUPS[g].color },
      { go: (x) => show(x, { reveal: true }), close: onClose });
  }

  if (params.sel && N.has(params.sel)) show(params.sel, { reveal: true });
  return () => { closePanel({ silent: true }); chart.destroy(); };
}
