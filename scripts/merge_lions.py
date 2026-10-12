import json, csv, re, sys, collections
data = sys.argv[1]
files = {'tsalala': 'lions_tsalala_group.json', 'ntsevu': 'lions_ntsevu_group.json', 'mhangeni': 'lions_mhangeni_coalitions_group.json'}
D = {k: json.load(open(f'{data}/{v}')) for k, v in files.items()}
ext = json.load(open(f'{data}/lions_external_sources.json'))

def size(e): return len(json.dumps(e))
def merge(section, keyf):
    groups = collections.OrderedDict()
    for g, d in D.items():
        for e in d[section]:
            groups.setdefault(keyf(e), []).append((g, e))
    out = []
    for k, items in groups.items():
        items.sort(key=lambda t: -size(t[1]))          # richest report first
        primary = dict(items[0][1])
        primary['reported_by'] = [g for g, _ in items]
        if len(items) > 1:
            primary['other_reports'] = [{'group': g, **e} for g, e in items[1:]]
        out.append(primary)
    return out

prides = merge('prides', lambda e: e['name'].lower().strip())
coalitions = merge('coalitions', lambda e: e['name'].lower().strip())
individuals = merge('individuals', lambda e: e['id'])
rels, seen = [], set()
for g, d in D.items():
    for r in d['relationships']:
        k = (r['subject'].lower(), r['relation'], r['object'].lower(), r['source_url'])
        if k in seen: continue
        seen.add(k); rels.append({**r, 'reported_by': g})
openq = [{'group': g, 'question': q} for g, d in D.items() for q in d['open_questions']]
out = {
    'about': 'Londolozi lion prides, coalitions and individuals reconstructed from blog.londolozi.com Lions-category posts (2014-2026). Only what posts state; confidence marks stated vs inferred. Posts conflict in places - see open_questions.',
    'source_blog_category': 'https://blog.londolozi.com/category/lions-2/',
    'counts': {'prides': len(prides), 'coalitions': len(coalitions), 'individuals': len(individuals), 'relationships': len(rels), 'open_questions': len(openq)},
    'prides': prides, 'coalitions': coalitions, 'individuals': individuals, 'relationships': rels,
    'open_questions': openq, 'external_sources': ext,
}
json.dump(out, open(f'{data}/lions.json', 'w'), indent=2, ensure_ascii=False)
with open(f'{data}/lion_relationships.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['subject', 'relation', 'object', 'date', 'confidence', 'evidence', 'source_url'])
    for r in rels: w.writerow([r['subject'], r['relation'], r['object'], r['date'], r['confidence'], r['evidence_quote_short'], r['source_url']])
# mermaid: mother_of / sire_of / breakaway_from / takeover_of-free: only lineage edges
def mid(s): return 'N' + re.sub(r'\W+', '_', s.strip().lower())[:60]
lab = {}
lines = ['graph TD']
for r in rels:
    if r['relation'] in ('mother_of', 'sire_of', 'breakaway_from'):
        a, b = r['subject'], r['object']
        for x in (a, b): lab[mid(x)] = x.replace('"', "'")
        arrow = {'mother_of': '-->|mother|', 'sire_of': '-.->|sire|', 'breakaway_from': '==>|breakaway|'}[r['relation']]
        lines.append(f'  {mid(a)} {arrow} {mid(b)}')
lines[1:1] = [f'  {k}["{v}"]' for k, v in lab.items()]
open(f'{data}/lion_tree.mmd', 'w').write('\n'.join(lines) + '\n')
print(out['counts'], 'mermaid nodes', len(lab))
