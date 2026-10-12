import json, re, sys, html, csv
raw, out = sys.argv[1], sys.argv[2]
leo = json.load(open(f'{raw}/leopard_p1.json'))
lin = json.load(open(f'{raw}/lineage.json'))
byid = {x['id']: x for x in leo}
lin_by = {x['id']: html.unescape(x['title']['rendered']) for x in lin}
def txt(s):
    if not s: return None
    s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip() or None
def ref(i):
    if not i: return None
    p = byid.get(i)
    return {'id': i, 'name': html.unescape(p['title']['rendered']), 'slug': p['slug']} if p else {'id': i, 'name': None, 'slug': None, 'note': 'not in published leopard set'}
def refs(l): return [ref(i) for i in (l or [])]
recs = []
for x in leo:
    a = x['acf']
    dob = ' '.join(filter(None, [a.get('lol_basic_dob_month') or None, a.get('lol_basic_dob_year') or None])) or None
    dec = ' '.join(filter(None, [a.get('lol_status_deceased_month') or None, a.get('lol_status_deceased_year') or None])) or None
    recs.append({
        'id': x['id'], 'slug': x['slug'], 'url': x['link'],
        'title': html.unescape(x['title']['rendered']),
        'name': (a.get('lol_basic_name') or '').strip(), 'spots': a.get('lol_basic_spots') or None,
        'sex': a.get('lol_basic_sex'),
        'aliases': [y['lol_basic_aliases_alias'] for y in (a.get('lol_basic_aliases') or [])],
        'born': dob, 'born_year': a.get('lol_basic_dob_year') or None,
        'status': a.get('lol_status_status'), 'died': dec,
        'death_note': txt(a.get('lol_status_deceased_desc')),
        'death_involved': refs(a.get('lol_status_deceased_involved')),
        'lineage': {'id': a.get('lol_family_lineage'), 'name': lin_by.get(a.get('lol_family_lineage'))},
        'mother': ref(a.get('lol_family_mother')), 'father': ref(a.get('lol_family_father')),
        'siblings': refs(a.get('lol_family_siblings')), 'offspring': refs(a.get('lol_family_offspring')),
        'litters': [{'year': l.get('lol_family_litters_year'), 'month': l.get('lol_family_litters_month'),
                     'cubs': l.get('lol_family_litters_no') or None, 'description': txt(l.get('lol_family_litters_desc'))}
                    for l in (a.get('lol_family_litters') or [])],
        'excerpt': txt(a.get('lol_basic_profile_excerpt')),
        'profile': txt(a.get('lol_basic_profile_content')),
        'territory': txt(a.get('lol_territory_desc')),
    })
recs.sort(key=lambda r: (r['lineage']['name'] or '', r['born_year'] or '9999', r['title']))
json.dump({'source': 'https://leopards.londolozi.com/wp-json/wp/v2/leopard', 'count': len(recs),
           'lineages': [{'id': k, 'name': v} for k, v in lin_by.items()], 'leopards': recs},
          open(f'{out}/leopards.json', 'w'), indent=2, ensure_ascii=False)
# edges: parent -> child (derived from child's mother/father fields, plus offspring lists)
edges = {}
for r in recs:
    for role in ('mother', 'father'):
        p = r[role]
        if p: edges[(p['id'], r['id'], role)] = 'child_field'
for r in recs:
    for o in r['offspring']:
        role = 'mother' if r['sex'] == 'female' else 'father' if r['sex'] == 'male' else 'parent'
        edges.setdefault((r['id'], o['id'], role), 'offspring_field')
names = {r['id']: r['title'] for r in recs}
with open(f'{out}/leopard_parent_child_edges.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['parent_id', 'parent', 'child_id', 'child', 'parent_role', 'derived_from'])
    for (p, c, role), src in sorted(edges.items()):
        w.writerow([p, names.get(p, ''), c, names.get(c, byid.get(c) and '' or ''), role, src])
unres = {i for (p, c, _) in edges for i in (p, c) if i not in byid}
print(len(recs), 'leopards;', len(edges), 'edges; unresolved ids:', unres)
