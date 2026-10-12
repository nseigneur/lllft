import json, sys, csv, re
data = sys.argv[1]
d = json.load(open(f'{data}/leopards.json'))
L = {r['id']: r for r in d['leopards']}
def nid(i): return f'L{i}'
lines = ['graph TD']
seen = set()
def node(i, label):
    if i in seen: return
    seen.add(i); lines.append(f'  {nid(i)}["{label.replace(chr(34), "")}"]')
for r in d['leopards']:
    node(r['id'], r['title'] + (f" ({r['born_year']})" if r['born_year'] else ''))
    for role, style in (('mother', '-->'), ('father', '-.->')):
        p = r[role]
        if p:
            node(p['id'], p['name'] or f"(hidden profile #{p['id']})")
            lines.append(f"  {nid(p['id'])} {style} {nid(r['id'])}")
open(f'{data}/leopard_tree.mmd', 'w').write('\n'.join(lines) + '\n')
print(len(seen), 'nodes')
# roots / stats
roots = [r['title'] for r in d['leopards'] if not r['mother'] and not r['father']]
print('no recorded parents:', len(roots))
