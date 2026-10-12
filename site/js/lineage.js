// Life-line genealogy chart.
// Every animal is a horizontal bar on a shared time axis; a vertical drop joins a parent's
// bar to each offspring's birth. Rows follow the primary (maternal) descent tree so a
// whole family reads top to bottom. Secondary links (sires, second mothers) are dotted
// curves that appear on demand.
import { tip } from './ui.js';

const d3 = window.d3;

export function createLineage(host, cfg) {
  const o = {
    rowH: 30, bandH: 30, padL: 30, padR: 240, axisH: 44, barH: 5, now: 2026.75,
    ariaLabel: 'Family tree', ...cfg,
  };
  const nodes = o.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = o.links.filter((l) => byId.has(l.from) && byId.has(l.to));

  // ---- adjacency over every link, used for ancestor/descendant highlighting
  const up = new Map(nodes.map((n) => [n.id, []]));
  const down = new Map(nodes.map((n) => [n.id, []]));
  links.forEach((l, i) => {
    down.get(l.from).push([l.to, i]);
    up.get(l.to).push([l.from, i]);
  });

  const minY = Math.floor(Math.min(...nodes.map((n) => n.start))) - 1;
  const maxY = Math.ceil(o.now) + 1;
  let ppy = o.ppy || 24;

  // ---- DOM scaffold
  host.innerHTML = '';
  const scroll = d3.select(host).append('div').attr('class', 'lin-scroll').attr('tabindex', -1);
  const axisSvg = scroll.append('svg').attr('class', 'lin-axis').attr('aria-hidden', 'true');
  const svg = scroll.append('svg').attr('class', 'lin-chart').attr('role', 'group').attr('aria-label', o.ariaLabel);
  const defs = svg.append('defs');
  const gBands = svg.append('g').attr('class', 'bands');
  const gGrid = svg.append('g').attr('class', 'grid');
  const gLinks = svg.append('g').attr('class', 'links');
  const gNodes = svg.append('g').attr('class', 'nodes');
  const scrollEl = scroll.node();

  let height = 0;
  const bands = [];
  const order = [];

  // ---- layout: DFS over primary links -> row per node, contiguous families
  (function layout() {
    const kids = new Map(nodes.map((n) => [n.id, []]));
    const hasParent = new Set();
    for (const l of links) {
      if (l.primary && !hasParent.has(l.to)) {
        hasParent.add(l.to);
        kids.get(l.from).push(byId.get(l.to));
      }
    }
    for (const k of kids.values()) k.sort((a, b) => a.start - b.start || a.label.localeCompare(b.label));
    const roots = nodes.filter((n) => !hasParent.has(n.id));
    const ix = new Map((o.rootOrder || []).map((id, i) => [id, i]));
    const rk = o.rootKey || ((n) => ix.get(n.id) ?? 1e9);
    roots.sort((a, b) => rk(a) - rk(b) || a.start - b.start);

    const seen = new Set();
    const walk = (n, depth) => {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      n.depth = depth;
      order.push(n);
      for (const c of kids.get(n.id)) walk(c, depth + 1);
    };
    const addBand = (r) => {
      const b = { root: r, start: order.length, label: o.bandLabel ? o.bandLabel(r, bands.length) : null };
      walk(r, 0);
      b.end = order.length;
      bands.push(b);
    };
    roots.forEach(addBand);
    nodes.filter((n) => !seen.has(n.id)).forEach(addBand); // cycles, if any

    let y = 4;
    bands.forEach((b, i) => {
      const head = b.label ? o.bandH : i ? o.bandH * 0.3 : 0;
      b.y0 = y;
      b.headH = head;
      y += head;
      for (let r = b.start; r < b.end; r++) {
        order[r].y = y + o.rowH / 2;
        y += o.rowH;
      }
      b.y1 = y;
    });
    height = y + 48;
  })();

  const X = (yr) => o.padL + (yr - minY) * ppy;
  const width = () => o.padL + (maxY - minY) * ppy + o.padR;

  // ---- shapes
  const shapePath = (shape, r) => {
    switch (shape) {
      case 'diamond': return `M0,${-r - 1}L${r + 1},0L0,${r + 1}L${-r - 1},0Z`;
      case 'square': return `M${-r},${-r}h${2 * r}v${2 * r}h${-2 * r}Z`;
      default: return `M${r},0A${r},${r} 0 1,0 ${-r},0A${r},${r} 0 1,0 ${r},0Z`;
    }
  };

  const shortEvent = (s) => s.replace(/\(.*?\)/g, '').replace(/\b(Males?|Coalition)\b/g, '').trim();

  // ---- render (idempotent; called again on zoom)
  function render() {
    const W = width();
    svg.attr('width', W).attr('height', height);
    axisSvg.attr('width', W).attr('height', o.axisH);
    defs.selectAll('*').remove();

    // bands + headers
    const bandSel = gBands.selectAll('g.band').data(bands).join('g').attr('class', 'band');
    bandSel.selectAll('*').remove();
    bandSel.append('rect').attr('class', (b, i) => `band-bg ${i % 2 ? 'odd' : 'even'}`)
      .attr('x', 0).attr('width', W).attr('y', (b) => b.y0).attr('height', (b) => b.y1 - b.y0);
    bandSel.filter((b) => b.label).append('text').attr('class', 'band-label')
      .attr('x', o.padL).attr('y', (b) => b.y0 + o.bandH - 9).text((b) => b.label);

    // vertical year grid + sticky axis ticks
    const years = d3.range(Math.ceil(minY), maxY + 1);
    const labelEvery = ppy >= 44 ? 1 : ppy >= 22 ? 2 : 5;
    gGrid.selectAll('line').remove();
    gGrid.selectAll('line.yr').data(years).join('line')
      .attr('class', (yr) => `yr ${yr % 5 === 0 ? 'major' : 'minor'}`)
      .attr('x1', X).attr('x2', X).attr('y1', 0).attr('y2', height)
      .style('display', (yr) => (yr % 5 === 0 || ppy >= 30 ? null : 'none'));
    axisSvg.selectAll('*').remove();
    axisSvg.append('line').attr('class', 'axis-rule').attr('x1', 0).attr('x2', W).attr('y1', o.axisH - 0.5).attr('y2', o.axisH - 0.5);
    const tickG = axisSvg.selectAll('g.tick').data(years.filter((yr) => yr % labelEvery === 0)).join('g')
      .attr('class', 'tick').attr('transform', (yr) => `translate(${X(yr)},0)`);
    tickG.append('line').attr('y1', o.axisH - 10).attr('y2', o.axisH);
    tickG.append('text').attr('y', o.axisH - 18).attr('text-anchor', 'middle').text((yr) => yr);
    const nowX = X(o.now);
    gGrid.append('line').attr('class', 'now').attr('x1', nowX).attr('x2', nowX).attr('y1', 0).attr('y2', height);
    axisSvg.append('text').attr('class', 'now-label').attr('x', nowX).attr('y', 14).attr('text-anchor', 'middle').text('TODAY');

    // ---- links
    const linkData = links.map((l, i) => ({ ...l, i }));
    const linkSel = gLinks.selectAll('g.link').data(linkData, (l) => l.i).join('g')
      .attr('class', (l) => `link ${l.role} ${l.primary ? 'p' : 's'}`);
    linkSel.selectAll('*').remove();
    linkSel.each(function (l) {
      const a = byId.get(l.from);
      const b = byId.get(l.to);
      const x = X(l.year ?? b.start);
      const g = d3.select(this);
      const dy = b.y - a.y;
      const d = l.primary
        ? `M${x},${a.y}V${b.y}`
        : `M${x},${a.y}C${x - 28},${a.y + dy * 0.3} ${x - 28},${a.y + dy * 0.7} ${x},${b.y}`;
      g.append('path').attr('d', d);
      g.append('circle').attr('cx', x).attr('cy', a.y).attr('r', l.primary ? 2.6 : 2.2);
    });

    // ---- nodes
    const nodeSel = gNodes.selectAll('g.node').data(nodes, (n) => n.id).join('g')
      .attr('class', (n) => `node ${n.ghost ? 'ghost' : ''} ${n.approx ? 'approx' : ''}`)
      .attr('transform', (n) => `translate(${X(n.start)},${n.y})`)
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (n) => n.aria || n.label);
    nodeSel.selectAll('*').remove();

    nodeSel.each(function (n) {
      const g = d3.select(this);
      const endYear = n.open ? o.now : n.end ?? n.start + (n.minSpan ?? 0.8);
      const bw = Math.max(0, X(endYear) - X(n.start));
      const color = n.color;
      g.style('--c', color);

      g.append('rect').attr('class', 'hit').attr('x', -12).attr('y', -o.rowH / 2)
        .attr('width', Math.max(bw + 24, 220)).attr('height', o.rowH);

      if (!n.ghost && !n.noBar) {
        let fill = color;
        let left = 0;
        if (n.startFade) {
          left = o.padL - X(n.start);
          const id = `fade-${String(n.id).replace(/[^a-z0-9]/gi, '')}`;
          const gr = defs.append('linearGradient').attr('id', id).attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', left).attr('x2', Math.min(bw, left + 160));
          gr.append('stop').attr('offset', 0).attr('stop-color', color).attr('stop-opacity', 0);
          gr.append('stop').attr('offset', 1).attr('stop-color', color).attr('stop-opacity', 1);
          fill = `url(#${id})`;
        }
        g.append('rect').attr('class', `bar ${n.endUnknown ? 'unknown' : ''}`)
          .attr('x', left).attr('y', -o.barH / 2).attr('width', Math.max(2, bw - left))
          .attr('height', o.barH).attr('rx', o.barH / 2).attr('fill', fill);
        if (n.open) {
          g.append('circle').attr('class', 'live').attr('cx', bw).attr('cy', 0).attr('r', 6.5);
          g.append('circle').attr('class', 'live-dot').attr('cx', bw).attr('cy', 0).attr('r', 2.6);
        } else if (n.end != null && !n.noEndTick) {
          g.append('path').attr('class', 'end-tick').attr('d', `M${bw},-8V8`);
        }
      }

      // events (e.g. male coalitions arriving at a pride)
      if (n.events?.length) {
        const lines = [-1e9, -1e9];
        let lastTxt = '';
        let lastX = -1e9;
        for (const ev of n.events) {
          const ex = X(ev.year + 0.5) - X(n.start);
          const eg = g.append('g').attr('class', `event ${ev.kind}`).attr('transform', `translate(${ex},0)`);
          eg.append('path').attr('d', ev.kind === 'takeover' ? 'M0,-6L6,0L0,6L-6,0Z' : 'M0,-5L5,0L0,5L-5,0Z');
          eg.append('title').text(`${ev.coalition} — ${ev.kind === 'takeover' ? 'takeover' : 'mated with the pride'}, ${ev.year}`);
          const txt = shortEvent(ev.coalition);
          const tw = txt.length * 6.2 + 8;
          const li = lines[0] < ex - 2 ? 0 : lines[1] < ex - 2 ? 1 : -1;
          const repeat = txt === lastTxt && ex - lastX < 90;
          if (li >= 0 && ppy >= 20 && !repeat) {
            lastTxt = txt;
            lastX = ex;
            lines[li] = ex + tw;
            eg.append('text').attr('class', 'event-label').attr('x', 0).attr('y', 20 + li * 13).text(txt);
          }
        }
      }

      // marker
      if (n.ghost) {
        g.append('path').attr('class', 'mark ghost-mark').attr('d', shapePath('circle', 6));
      } else {
        g.append('path').attr('class', `mark ${n.hollow ? 'hollow' : ''}`)
          .attr('d', shapePath(n.shape, n.r ?? 6)).attr('fill', n.hollow ? null : color).attr('stroke', color);
      }

      const lbl = g.append('text').attr('class', 'lbl').attr('x', 13).attr('y', -10);
      lbl.append('tspan').attr('class', 'name').text(n.label);
      if (n.sub) lbl.append('tspan').attr('class', 'sub').attr('dx', 8).text(n.sub);
    });

    wire();
    refreshState();
  }

  // ---- interaction
  let hoverId = null;
  let selId = null;
  let query = '';
  let filterFn = null;
  let showSecondary = false;

  function focusSet(id) {
    const ids = new Set([id]);
    const lk = new Set();
    const walk = (map) => {
      const stack = [id];
      const visited = new Set([id]);
      while (stack.length) {
        const cur = stack.pop();
        for (const [nx, li] of map.get(cur)) {
          lk.add(li);
          ids.add(nx);
          if (!visited.has(nx)) { visited.add(nx); stack.push(nx); }
        }
      }
    };
    walk(up);
    walk(down);
    return { ids, lk };
  }

  function refreshState() {
    const fid = hoverId ?? selId;
    const q = query.trim().toLowerCase();
    svg.classed('focusing', !!fid).classed('searching', !!q).classed('show-sec', showSecondary);
    const f = fid ? focusSet(fid) : null;
    gNodes.selectAll('g.node')
      .classed('in', (n) => !!f && f.ids.has(n.id))
      .classed('sel', (n) => n.id === selId)
      .classed('match', (n) => !!q && n.search.includes(q))
      .classed('off', (n) => !!filterFn && !filterFn(n))
      .attr('aria-pressed', (n) => String(n.id === selId));
    gLinks.selectAll('g.link')
      .classed('in', (l) => !!f && f.lk.has(l.i))
      .classed('off', (l) => !!filterFn && (!filterFn(byId.get(l.from)) || !filterFn(byId.get(l.to))));
  }

  function wire() {
    gNodes.selectAll('g.node')
      .on('mouseenter', (e, n) => { hoverId = n.id; refreshState(); if (o.tip) tip.show(o.tip(n), e); })
      .on('mousemove', (e) => tip.move(e))
      .on('mouseleave', () => { hoverId = null; refreshState(); tip.hide(); })
      .on('focus', (e, n) => { hoverId = n.id; refreshState(); })
      .on('blur', () => { hoverId = null; refreshState(); })
      .on('click', (e, n) => { tip.hide(); api.select(n.id); o.onSelect?.(n); })
      .on('keydown', (e, n) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tip.hide();
          api.select(n.id);
          o.onSelect?.(n);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const nx = order[order.indexOf(n) + (e.key === 'ArrowDown' ? 1 : -1)];
          if (nx) gNodes.selectAll('g.node').filter((m) => m === nx).node()?.focus();
        }
      });
  }

  // drag to pan with a mouse; pinch / ctrl-wheel to zoom
  let drag = null;
  scrollEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.node')) return;
    drag = { x: e.clientX, y: e.clientY, l: scrollEl.scrollLeft, t: scrollEl.scrollTop };
    scrollEl.classList.add('dragging');
    scrollEl.setPointerCapture(e.pointerId);
  });
  scrollEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    scrollEl.scrollLeft = drag.l - (e.clientX - drag.x);
    scrollEl.scrollTop = drag.t - (e.clientY - drag.y);
  });
  const endDrag = () => { drag = null; scrollEl.classList.remove('dragging'); };
  scrollEl.addEventListener('pointerup', endDrag);
  scrollEl.addEventListener('pointercancel', endDrag);
  scrollEl.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    api.zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX);
  }, { passive: false });

  const api = {
    setScale(next, anchorClientX) {
      const rect = scrollEl.getBoundingClientRect();
      const ax = (anchorClientX ?? rect.left + rect.width / 2) - rect.left;
      const yearAtAnchor = minY + (scrollEl.scrollLeft + ax - o.padL) / ppy;
      ppy = Math.max(8, Math.min(120, next));
      render();
      scrollEl.scrollLeft = o.padL + (yearAtAnchor - minY) * ppy - ax;
    },
    zoomBy(f, anchor) { api.setScale(ppy * f, anchor); },
    fit() {
      api.setScale(Math.max(14, (scrollEl.clientWidth - o.padL - o.padR + 80) / (maxY - minY)));
      scrollEl.scrollLeft = 0;
    },
    get scale() { return ppy; },
    select(id, { reveal = false } = {}) {
      selId = id;
      refreshState();
      if (reveal && id) api.reveal(id);
    },
    reveal(id) {
      const n = byId.get(id);
      if (!n) return;
      scrollEl.scrollTo({
        left: Math.max(0, X(n.start) - scrollEl.clientWidth * 0.3),
        top: Math.max(0, n.y - scrollEl.clientHeight * 0.45),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    },
    search(q) {
      query = q || '';
      refreshState();
      const needle = query.trim().toLowerCase();
      const hits = needle ? nodes.filter((n) => n.search.includes(needle) && (!filterFn || filterFn(n))) : [];
      if (hits.length) api.reveal(hits.sort((a, b) => a.y - b.y)[0].id);
      return hits.length;
    },
    setFilter(fn) { filterFn = fn; refreshState(); },
    showSecondary(on) { showSecondary = on; refreshState(); },
    node: (id) => byId.get(id),
    destroy() { host.innerHTML = ''; tip.hide(); },
  };

  render();
  // measure label widths once fonts are in so hit areas hug their labels
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    gNodes.selectAll('g.node').each(function () {
      const l = this.querySelector('.lbl');
      const h = this.querySelector('.hit');
      if (l && h) h.setAttribute('width', Math.max(parseFloat(h.getAttribute('width')), l.getBBox().width + 28));
    });
  });
  return api;
}
