import { esc, ext, loadJSON } from '../ui.js';
import { fail } from './chrome.js';

const GROUP_LABEL = {
  tsalala: 'Tsalala, Birmingham, Majingilane & Matimba',
  ntsevu: 'Ntsevu, Kambula, Msuthlu, Styx & Othawa',
  mhangeni: 'Mhangeni, Nkuhuma & the male coalitions',
};

export async function mount(root) {
  let lions;
  let leopards;
  try {
    [lions, leopards] = await Promise.all([loadJSON('data/lions.json'), loadJSON('data/leopards.json')]);
  } catch (err) {
    fail(root, err);
    return () => {};
  }

  const byGroup = {};
  lions.openQuestions.forEach((q) => (byGroup[q.group] ||= []).push(q.question));

  const sources = lions.externalSources.map((s) => `
    <li>
      <p class="src-title">${ext(s.url, s.title || s.url)}</p>
      <p class="src-meta">${esc([s.publisher, s.date].filter(Boolean).join(' · '))}</p>
      ${s.what_it_adds ? `<p class="src-note">${esc(s.what_it_adds)}</p>` : ''}
    </li>`).join('');

  root.innerHTML = `
  <article class="page narrow about">
    <p class="eyebrow">About the data</p>
    <h1>What this is, and what it is not</h1>
    <p class="prose-lg">Lion Lines turns two bodies of public writing from Londolozi into family trees you can explore. It adds nothing of its own: every parent, every year and every takeover comes from a profile or a blog post, and where the sources are unclear the chart says so.</p>

    <section>
      <h2>The leopards</h2>
      <p>${leopards.count} leopards come from the structured profiles at ${ext('https://leopards.londolozi.com/', 'leopards.londolozi.com')}: name, spot pattern, birth, death, dynasty, mother, father and litters. A line is drawn wherever a profile names a parent.</p>
      <ul>
        <li>Six parents and one sibling are referenced by profiles that are not public. They appear as dashed “unpublished profile” markers rather than being named.</li>
        <li>31 leopards have no recorded dynasty, and 23 no recorded parent. A mother is recorded for 62 of the 87 and a father for 39, so mothers form the backbone of each tree and fathers are shown on request.</li>
        <li>Offspring lists on profiles are often incomplete; the chart uses each cub’s own mother and father fields, which are more complete.</li>
      </ul>
    </section>

    <section>
      <h2>The lions</h2>
      <p>There is no lion database. The only source is narrative posts in the ${ext(lions.blog, 'Lions category of the Londolozi blog')}. 307 of its 862 posts, those whose titles mention prides, coalitions, cubs and the like, were read in full and turned into ${lions.counts.individuals} lion records, ${lions.counts.coalitions} coalitions and ${lions.counts.relationships} relationships. Each relationship keeps a short quote and a link to the post that says it.</p>
      <ul>
        <li><b>Pride lineage</b> is a curated reading of the posts’ own breakaway dates (for example, the Ntsevu Pride was renamed on 29 April 2017). A hollow marker means the post does not say when or how that pride began.</li>
        <li><b>Bloodlines</b> use only mother and sire relationships. Lions are rarely named, so many cubs appear as a litter. Where a label could not be matched to a record it becomes its own litter node, which can leave duplicates.</li>
        <li>A year marked as estimated was inferred from the date of the post that introduces that animal.</li>
        <li>The other 555 Lions posts were not read, and one profile post (the Styx Male, September 2026) was not among those downloaded.</li>
      </ul>
    </section>

    <section>
      <h2>Where the posts disagree</h2>
      <p>The posts occasionally contradict each other on when the Mhangeni formed, who killed the Original Tailless Female, how many cubs a litter held. These are kept as ${lions.openQuestions.length} open questions instead of being resolved.</p>
      ${Object.entries(byGroup).map(([g, qs]) => `
        <details class="oq">
          <summary>${esc(GROUP_LABEL[g] || g)} <span class="count">${qs.length}</span></summary>
          <ol>${qs.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
        </details>`).join('')}
    </section>

    ${sources ? `<section>
      <h2>Corroborating sources</h2>
      <p>Secondary and lower-confidence. These were used to check the blog, not to add to the charts.</p>
      <ul class="sources">${sources}</ul>
    </section>` : ''}

    <section>
      <h2>Rebuilding</h2>
      <p>The data pipeline lives in the repository. After refreshing <code>data/</code>, regenerate the site’s files and commit them:</p>
      <pre><code>python3 -I scripts/build_site_data.py "$PWD"</code></pre>
    </section>

    <p class="fine">Independent project. Not affiliated with, endorsed by or produced by Londolozi. Design inspired by londolozi.com. All names, dates and descriptions belong to their original authors; please follow the links to read them at the source.</p>
  </article>`;
  return () => {};
}
