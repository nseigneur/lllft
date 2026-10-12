import { esc, loadJSON, countUp, $, $$ } from '../ui.js';

// Interlocking rings echo the circles in Londolozi's centenary mark: two families, one land.
const RINGS = `
<svg class="rings" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <g fill="none" stroke-linecap="round">
    <circle pathLength="1" cx="470" cy="360" r="250"/>
    <circle pathLength="1" cx="640" cy="330" r="210"/>
    <circle pathLength="1" cx="780" cy="400" r="290"/>
    <circle pathLength="1" cx="330" cy="470" r="150"/>
    <circle pathLength="1" cx="930" cy="300" r="120"/>
  </g>
</svg>`;

// Layered bush silhouettes with acacia crowns along the horizon.
const BUSH = `
<svg class="bush" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3e3b8" stop-opacity=".0"/><stop offset="1" stop-color="#f3e3b8" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <path class="far" d="M0 190 C120 150 220 175 330 160 C470 140 560 185 700 165 C860 142 960 180 1100 160 C1230 142 1340 170 1440 150 V320 H0Z"/>
  <rect y="150" width="1440" height="70" fill="url(#mist)"/>
  <path class="mid" d="M0 235 C110 205 230 232 360 214 C500 194 610 238 760 220 C900 203 1010 238 1150 216 C1270 200 1360 226 1440 212 V320 H0Z"/>
  <g class="acacia" transform="translate(1090 150)">
    <path d="M0 120 C2 90 -4 70 -10 52 M-2 84 C14 70 26 62 40 58" />
    <ellipse cx="-4" cy="42" rx="74" ry="14"/><ellipse cx="42" cy="52" rx="38" ry="9"/><ellipse cx="-56" cy="52" rx="30" ry="8"/>
  </g>
  <g class="acacia small" transform="translate(240 190) scale(.62)">
    <path d="M0 110 C2 84 -3 66 -9 50 M-2 80 C12 68 24 60 36 56" />
    <ellipse cx="-4" cy="40" rx="70" ry="13"/><ellipse cx="40" cy="50" rx="34" ry="8"/>
  </g>
  <path class="near" d="M0 290 C140 262 260 284 400 270 C560 254 700 292 860 272 C1000 256 1160 288 1300 268 C1370 258 1410 266 1440 262 V320 H0Z"/>
</svg>`;

// A small, honest sample of what the charts look like.
const SAMPLE = (c1, c2) => `
<svg class="sample" viewBox="0 0 360 150" aria-hidden="true">
  <g stroke-linecap="round">
    <path class="drop" d="M70 28V60M138 28V92M186 60V124M246 92V124"/>
    <g style="--c:${c1}"><path class="b" d="M20 28H250"/><circle cx="20" cy="28" r="5.5"/></g>
    <g style="--c:${c2}"><path class="b" d="M70 60H210"/><circle cx="70" cy="60" r="5.5"/><path class="t" d="M210 52V68"/></g>
    <g style="--c:${c1}"><path class="b" d="M138 92H330"/><path class="d" d="M0 0" /><circle cx="138" cy="92" r="5.5"/><circle class="halo" cx="330" cy="92" r="7.5"/><circle cx="330" cy="92" r="2.6" class="dot"/></g>
    <g style="--c:${c2}"><path class="b" d="M186 124H266"/><path class="diamond" d="M186 117.5l6.5 6.5-6.5 6.5-6.5-6.5z"/><path class="t" d="M266 116V132"/></g>
    <g style="--c:${c1}"><path class="b" d="M246 124H300" opacity="0"/></g>
  </g>
</svg>`;

export async function mount(root) {
  root.innerHTML = `
  <section class="hero" aria-labelledby="hero-title">
    <div class="sky" aria-hidden="true"><i class="sun"></i></div>
    ${RINGS}
    <div class="hero-inner">
      <p class="kicker">Lion &amp; leopard family trees</p>
      <h1 id="hero-title"><span>The Lines</span><span>of Londolozi</span></h1>
      <p class="sub">Prides that split, dynasties that endure, and the males who ruled them — traced through the reserve’s own field records.</p>
      <div class="cta">
        <a class="btn" href="#/lions">Follow the lions</a>
        <a class="btn ghost" href="#/leopards">Follow the leopards</a>
      </div>
    </div>
    ${BUSH}
    <a class="scroll-cue" href="#begin" aria-label="Scroll to introduction" data-scroll><svg viewBox="0 0 30 16"><path d="M2 2l13 12L28 2"/></svg></a>
  </section>

  <section class="intro page" id="begin">
    <p class="eyebrow">Sand River · Sabi Sand · Greater Kruger</p>
    <blockquote class="bigquote">
      <p>Londolozi — a Zulu word meaning <em>‘Protector of All Living Things’.</em></p>
      <footer>The reserve describes its name this way on <a class="ext" href="https://www.londolozi.com/" target="_blank" rel="noopener noreferrer">londolozi.com ↗</a></footer>
    </blockquote>
    <p class="prose-lg">For a century the people of Londolozi have watched the same families of cats grow up, quarrel, disperse and return. Their rangers’ blogs and leopard profiles hold the pedigrees. This site draws them.</p>
  </section>

  <section class="doors page wide" aria-label="Choose a family">
    <a class="door lions" href="#/lions">
      <span class="eyebrow">Panthera leo</span>
      <h2>The Lions</h2>
      ${SAMPLE('#b08a2e', '#c0662d')}
      <p>How the Tsalala, Mhangeni, Ntsevu and Kambula prides descend from one another — and which coalitions of males took each one.</p>
      <ul class="stats"><li><b data-count="${'pride'}">0</b>prides traced</li><li><b data-count="rel">0</b>documented relationships</li></ul>
      <span class="go">Open the pride lineage <i aria-hidden="true">→</i></span>
    </a>
    <a class="door leopards" href="#/leopards">
      <span class="eyebrow">Panthera pardus</span>
      <h2>The Leopards</h2>
      ${SAMPLE('#c0662d', '#2f7482')}
      <p>Six named dynasties, from the Mother Leopard of the 1970s to the cubs born this year, with every sire and litter the profiles record.</p>
      <ul class="stats"><li><b data-count="leo">0</b>leopards</li><li><b data-count="dyn">0</b>dynasties</li></ul>
      <span class="go">Open the dynasties <i aria-hidden="true">→</i></span>
    </a>
  </section>

  <section class="howto" aria-labelledby="howto-title">
    <div class="page wide">
      <p class="eyebrow">How to read a life-line</p>
      <h2 id="howto-title">Every animal is a line through time</h2>
      <div class="howto-grid">
        <svg class="diagram" viewBox="0 0 640 300" role="img" aria-label="Diagram: a mother’s bar with a vertical drop to a cub born in 2016, and a dotted curve from the father.">
          <g class="grid">${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${60 + i * 100}" x2="${60 + i * 100}" y1="30" y2="270"/><text x="${60 + i * 100}" y="20">${2010 + i * 2}</text>`).join('')}</g>
          <g class="mom">
            <rect x="60" y="86" width="400" height="6" rx="3"/>
            <circle cx="60" cy="89" r="8"/>
            <path class="tick" d="M460 76v26"/>
            <text class="note" x="68" y="72">Mother — born 2010, died 2018</text>
          </g>
          <path class="drop" d="M260 89V176"/><circle class="junction" cx="260" cy="89" r="3.5"/>
          <g class="cub">
            <rect x="260" y="173" width="320" height="6" rx="3"/>
            <path d="M260 166l8 10-8 10-8-10z"/>
            <circle class="live" cx="580" cy="176" r="10"/><circle cx="580" cy="176" r="3.6"/>
            <text class="note" x="276" y="158">Son — born 2014 · alive today</text>
          </g>
          <g class="sire">
            <rect x="140" y="236" width="180" height="6" rx="3"/>
            <path d="M140 229l8 10-8 10-8-10z"/>
            <path class="curve" d="M260 239C226 226 226 196 260 176"/>
            <text class="note" x="156" y="264">Father — a sire, joined by a dotted curve</text>
          </g>
        </svg>
        <dl class="legend-list">
          <div><dt><svg viewBox="0 0 40 14"><rect x="0" y="4" width="40" height="6" rx="3"/></svg>Bar</dt><dd>A life, from birth to death. A glowing end means alive today.</dd></div>
          <div><dt><svg viewBox="0 0 40 14"><circle cx="20" cy="7" r="5.5"/></svg><svg viewBox="0 0 40 14"><path d="M20 0.5L27 7L20 13.5L13 7Z"/></svg>Marker</dt><dd>Circle for a female, diamond for a male. Hollow means a group or an uncertain origin.</dd></div>
          <div><dt><svg viewBox="0 0 40 14"><path d="M20 0V14" class="s"/></svg>Drop</dt><dd>A cub joining its mother’s line at the year of its birth.</dd></div>
          <div><dt><svg viewBox="0 0 40 14"><path d="M8 13C20 11 20 3 32 1" class="s dashed"/></svg>Curve</dt><dd>The sire — drawn on request, so the mother’s line stays easy to follow.</dd></div>
        </dl>
      </div>
    </div>
  </section>

  <section class="datanote page">
    <p class="eyebrow">A note on the evidence</p>
    <h2>Where the blog is silent, the chart says so</h2>
    <p class="prose-lg">Leopards come from structured public profiles. Lions are different: there is no lion database, only years of narrative blog posts. Most lions are unnamed, some posts contradict each other, and a handful of leopard parents have unpublished profiles. Those gaps are drawn, not smoothed over.</p>
    <a class="btn ghost dark" href="#/about">About the data</a>
  </section>

  <footer class="site-foot">
    <div class="page wide foot-grid">
      <div>
        <p class="wordmark">Lion Lines</p>
        <p class="small">An independent visualisation built from publicly available Londolozi blog posts and leopard profiles. It is not affiliated with, endorsed by or produced by Londolozi. Design inspired by <a class="ext" href="https://www.londolozi.com/" target="_blank" rel="noopener noreferrer">londolozi.com ↗</a>.</p>
      </div>
      <nav aria-label="Footer">
        <a href="#/lions">Lions</a><a href="#/leopards">Leopards</a><a href="#/about">About the data</a>
        <a class="ext" href="https://blog.londolozi.com/" target="_blank" rel="noopener noreferrer">Londolozi blog ↗</a>
        <a class="ext" href="https://leopards.londolozi.com/" target="_blank" rel="noopener noreferrer">Leopard profiles ↗</a>
      </nav>
    </div>
  </footer>`;

  // numbers come from the data, not from copy
  const [leo, lion] = await Promise.all([loadJSON('data/leopards.json'), loadJSON('data/lions.json')]).catch(() => [null, null]);
  const nums = {
    pride: lion ? lion.prides.length : 0, rel: lion ? lion.relationships.length : 0,
    leo: leo ? leo.count : 0, dyn: leo ? leo.dynasties.filter((d) => d !== 'Unknown').length : 0,
  };
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      $$('b[data-count]', e.target).forEach((b) => countUp(b, nums[b.dataset.count] ?? 0));
      io.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  $$('.door', root).forEach((d) => io.observe(d));

  $('[data-scroll]', root).addEventListener('click', (e) => {
    e.preventDefault();
    $('#begin').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  return () => io.disconnect();
}
