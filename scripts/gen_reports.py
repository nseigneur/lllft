#!/usr/bin/env python3
"""Generate docs/LEOPARDS.md and docs/LIONS.md from data/leopards.json and data/lions.json.

Usage: python3 -I scripts/gen_reports.py <project_root>
"""
import json
import sys
from collections import defaultdict

root = sys.argv[1]
leo = json.load(open(f'{root}/data/leopards.json'))
lions = json.load(open(f'{root}/data/lions.json'))


def nm(ref):
    if not ref:
        return '—'
    return ref['name'] or f"(hidden profile #{ref['id']})"


def years(r):
    end = r['died'] or ('present' if r['status'] == 'Alive' else r['status'])
    return f"{r['born'] or '?'} – {end}"


def one_line(s, n=400):
    if not s:
        return ''
    s = ' '.join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + '…'


# ---------------------------------------------------------------- leopards
L = ['# Leopards of Londolozi – family reference', '',
     f"Generated from `data/leopards.json` ({leo['count']} profiles). Source: {leo['source']}.", '',
     'Each entry lists mother, father and offspring as recorded on the leopard profile. '
     '"hidden profile #N" = the profile exists on the site but is not exposed by the public API.', '']
by_lin = defaultdict(list)
for r in leo['leopards']:
    by_lin[r['lineage']['name'] or 'Unknown'].append(r)
L += ['## Dynasties (lineage field)', '', '| Dynasty | Leopards |', '|---|---|']
for k, v in sorted(by_lin.items(), key=lambda kv: -len(kv[1])):
    L.append(f'| {k} | {len(v)} |')
L.append('')
for lin, rs in sorted(by_lin.items(), key=lambda kv: (kv[0] == 'Unknown', kv[0])):
    L += [f'## {lin} ({len(rs)})', '']
    for r in rs:
        L.append(f"### {r['title']}")
        L.append(f"* {r['sex']}, {years(r)}; status: {r['status']}; profile: {r['url']}")
        if r['aliases']:
            L.append(f"* Aliases: {', '.join(r['aliases'])}")
        L.append(f"* Mother: {nm(r['mother'])} · Father: {nm(r['father'])}")
        if r['siblings']:
            L.append(f"* Siblings: {', '.join(nm(s) for s in r['siblings'])}")
        if r['offspring']:
            L.append(f"* Offspring (listed): {', '.join(nm(o) for o in r['offspring'])}")
        if r['litters']:
            L.append(f"* Litters recorded: {len(r['litters'])}")
        if r['died'] or r['death_note']:
            L.append(f"* Death: {r['died'] or '?'}" + (f" – {one_line(r['death_note'], 200)}" if r['death_note'] else ''))
        if r['excerpt']:
            L.append(f"* Summary: {one_line(r['excerpt'])}")
        L.append('')
open(f'{root}/docs/LEOPARDS.md', 'w').write('\n'.join(L))

# ------------------------------------------------------------------- lions
c = lions['counts']
M = ['# Lions of Londolozi – reference', '',
     'Generated from `data/lions.json`. Reconstructed from narrative posts in '
     f"{lions['source_blog_category']} – there is no official lion database. "
     'Lions are mostly unnamed; labels are the blog\'s own. Entries marked `inferred` are not stated outright in a post.', '',
     f"Counts: {c['prides']} prides, {c['coalitions']} coalitions, {c['individuals']} individuals/cohorts, "
     f"{c['relationships']} relationships, {c['open_questions']} open questions.", '',
     '> Note: a few prides/coalitions appear under slightly different names because three extraction passes '
     'overlapped (e.g. "Msuthlu Pride" and "Msuthlu Pride (formerly Talamati Breakaway Pride) - link only"). '
     'They are kept unmerged rather than guessed together.', '', '## Prides', '']
for p in lions['prides']:
    M.append(f"### {p['name']}")
    if p.get('aliases'):
        M.append(f"* Aliases: {'; '.join(p['aliases'])}")
    M.append(f"* Status: {one_line(p.get('status'), 300)}")
    M.append(f"* First/last mentioned: {p.get('first_mentioned')} / {p.get('last_mentioned')}")
    M.append(f"* Origin: {one_line(p.get('origin_summary'), 600)}")
    for e in p.get('splits_and_takeovers') or []:
        M.append(f"  * {e.get('date')}: {one_line(e.get('event'), 300)}")
    if p.get('notes'):
        M.append(f"* Notes: {one_line(p['notes'], 600)}")
    M.append('')
M += ['## Male coalitions', '']
for k in lions['coalitions']:
    M.append(f"### {k['name']}")
    M.append(f"* Members: {', '.join(map(str, k.get('members') or [])) or '—'}")
    M.append(f"* Origin: {one_line(k.get('origin'), 400)}")
    M.append(f"* Territory: {one_line(k.get('territory'), 300)}")
    M.append(f"* Status: {one_line(k.get('status'), 300)}")
    for s in k.get('sired_litters') or []:
        M.append(f"  * Sired with {s.get('mother')} ({s.get('year')}): {one_line(s.get('notes'), 250)}")
    M.append('')
M += ['## Individuals and cohorts', '',
      '| Label | Sex | Pride | Born | Died | Mother | Sire | Confidence |', '|---|---|---|---|---|---|---|---|']
for i in sorted(lions['individuals'], key=lambda x: (str(x.get('pride')), str(x.get('birth_year') or '9999'))):
    cell = lambda v: one_line(v, 60).replace('|', '/') if v else '—'
    M.append(f"| {cell(i['label'])} | {cell(i.get('sex'))} | {cell(i.get('pride'))} | {cell(i.get('birth_year'))} | "
             f"{cell(i.get('death_year'))} | {cell(i.get('mother_id_or_label'))} | {cell(i.get('father_or_sire_label'))} | "
             f"{cell(i.get('confidence'))} |")
M += ['', '## Open questions / contradictions between posts', '']
for q in lions['open_questions']:
    text = q['question'] if isinstance(q['question'], str) else json.dumps(q['question'], ensure_ascii=False)
    M.append(f"* ({q['group']}) {one_line(text, 500)}")
ext = lions['external_sources']
M += ['', '## External corroborating sources', '']
for s in ext.get('sources', []):
    M.append(f"* [{s.get('title') or s['url']}]({s['url']}) – {one_line(s.get('what_it_adds'), 200)}")
M += ['', '### Gaps reported by the external-source pass', '']
for g in ext.get('gaps', []):
    M.append(f"* {one_line(g, 400)}")
open(f'{root}/docs/LIONS.md', 'w').write('\n'.join(M) + '\n')
print('wrote docs/LEOPARDS.md, docs/LIONS.md')
