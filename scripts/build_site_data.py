#!/usr/bin/env python3
"""Shape data/leopards.json and data/lions.json into the compact JSON the website reads.

Usage: python3 -I scripts/build_site_data.py <repo-root>
Writes: site/data/leopards.json, site/data/lions.json

Nothing is invented here: every node and link comes from the project data. The only
curation is the lion *pride genealogy* (PRIDES below), whose parent links and years are
taken from `prides[].splits_and_takeovers` and the `breakaway_from` relationships.
Everything ambiguous stays ambiguous (flagged `approx`), and unresolved labels become
explicit "cohort" nodes rather than being guessed.
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
OUT = ROOT / "site" / "data"
OUT.mkdir(parents=True, exist_ok=True)

YEAR_RE = re.compile(r"(?<!\d)(19[89]\d|20[0-3]\d)(?!\d)")
NOW = 2026.75  # data was collected Oct 2026


def year_of(s):
    m = YEAR_RE.search(s or "")
    return int(m.group(1)) if m else None


def last_year_of(s):
    ys = YEAR_RE.findall(s or "")
    return int(ys[-1]) if ys else None


def norm(s):
    s = re.sub(r"\(.*?\)", "", (s or "").lower())
    return re.sub(r"[^a-z0-9]+", "", s)


def dump(name, obj):
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{p.relative_to(ROOT)}  {p.stat().st_size / 1024:.0f} KB")


# --------------------------------------------------------------------------- leopards
def build_leopards():
    src = json.loads((ROOT / "data" / "leopards.json").read_text(encoding="utf-8"))
    L = src["leopards"]
    by_id = {x["id"]: x for x in L}

    def nid(i):
        return f"l{i}"

    ghosts = {}
    for x in L:
        for k in ("mother", "father"):
            r = x[k]
            if r and r["id"] not in by_id:
                ghosts[r["id"]] = {"id": nid(r["id"]), "ghost": True, "name": "Unpublished profile", "sex": None}

    def ref(r):
        return nid(r["id"]) if r else None

    nodes = []
    for x in L:
        nodes.append({
            "id": nid(x["id"]), "name": x["name"], "title": x["title"], "spots": x["spots"],
            "sex": x["sex"], "aliases": x["aliases"], "born": x["born"], "bornYear": int(x["born_year"]),
            "status": x["status"], "died": x["died"],
            "diedYear": last_year_of(x["died"]) if x["died"] else None,
            "deathNote": x["death_note"],
            "deathInvolved": [r["name"] for r in x["death_involved"] if r.get("name")],
            "lineage": x["lineage"]["name"],
            "mother": ref(x["mother"]), "father": ref(x["father"]),
            "motherName": x["mother"]["name"] if x["mother"] else None,
            "fatherName": x["father"]["name"] if x["father"] else None,
            "siblings": [ref(r) for r in x["siblings"] if r["id"] in by_id],
            "offspring": [ref(r) for r in x["offspring"] if r["id"] in by_id],
            "litters": x["litters"], "territory": x["territory"],
            "excerpt": x["excerpt"], "profile": x["profile"], "url": x["url"],
        })
    nodes += list(ghosts.values())
    ids = {n["id"] for n in nodes}

    # mother -> child (solid), father -> child (dotted); hidden parents included as ghosts
    links = []
    for n in nodes:
        if n.get("ghost"):
            continue
        for role in ("mother", "father"):
            if n[role] and n[role] in ids:
                links.append({"from": n[role], "to": n["id"], "role": role, "year": n["bornYear"]})

    # families = trees of the matriline. Ordered by dynasty, then first birth year.
    kids = collections.defaultdict(list)
    for n in nodes:
        if not n.get("ghost") and n["mother"]:
            kids[n["mother"]].append(n["id"])
    node_by = {n["id"]: n for n in nodes}

    def members(root):
        out, st = [], [root]
        while st:
            x = st.pop()
            out.append(x)
            st.extend(kids[x])
        return out

    fams = []
    for r in [n["id"] for n in nodes if n.get("ghost") or not n["mother"]]:
        real = [node_by[i] for i in members(r) if not node_by[i].get("ghost")]
        if not real:
            continue
        cnt = collections.Counter(n["lineage"] for n in real if n["lineage"] != "Unknown")
        fams.append({
            "root": r, "size": len(real),
            "dynasty": cnt.most_common(1)[0][0] if cnt else "Unknown",
            "first": min(n["bornYear"] for n in real),
        })
    dyn_order = ["Mother Leopard", "Sunset Bend", "River Female", "Saseka Female", "Short Tail Female", "Little Bush", "Unknown"]
    fams.sort(key=lambda f: (f["size"] == 1, dyn_order.index(f["dynasty"]), f["first"]))

    dump("leopards.json", {
        "source": src["source"], "count": src["count"],
        "dynasties": dyn_order, "families": fams, "nodes": nodes, "links": links, "now": NOW,
    })


# --------------------------------------------------------------------------- lions
# Canonical pride genealogy: (key, name, parent, link year, start, end (None = open), start approximate?, note).
# Parent links and years are those stated in the posts (breakaway_from relationships and each
# pride's splits_and_takeovers); None = not stated.
PRIDES = [
    ("castleton", "Castleton Pride", None, None, None, None, True, "Natal pride of the two founders of the Tsalala Pride (1998). Its own origin is not given."),
    ("tsalala", "Tsalala Pride", "castleton", 1998, 1998, None, False, "Two Castleton females break away and den seven cubs ('Two and Seven')."),
    ("tsalala-bw1", "Tsalala Breakaway Pride (2009–2012)", "tsalala", 2010, 2010, 2012, False, "The Original Tailless Female leaves with four 2009-born sub-adults to escape the Majingilane."),
    ("mhangeni", "Mhangeni Pride", "tsalala-bw1", 2012, 2012, None, False, "The four sub-adults lose contact with the Original Tailless Female after the Jan 2012 flood and form the Mhangeni Pride."),
    ("tsalala-bw2", "Tsalala Breakaway Pride (2015–2018)", "tsalala", 2015.7, 2015.7, 2018.4, False, "The younger Tailless Sister takes four 2013-born sub-adults away from the incoming Matimba Males; ends when she dies (June 2018)."),
    ("ntsevu", "Ntsevu Pride", "mhangeni", 2016, 2016, None, False, "Six lionesses of the first Mhangeni litter (2013) split from their mothers; renamed Ntsevu ('six') on 29 Apr 2017."),
    ("ntsevu-bw", "Ntsevu Breakaway Pride", "ntsevu", 2021.6, 2021.6, 2025.6, False, "Eleven to twelve sub-adults (born 2018) leave the Ntsevu Pride in Aug 2021; dispersed by 2025."),
    ("kambula", "Kambula Pride", "ntsevu", 2024.2, 2024.2, None, False, "Name adopted on 21 Mar 2024 for the larger faction of the old Ntsevu Pride after the Ndzhenga takeover."),
    ("nkuhuma", "Nkuhuma Pride", None, None, None, None, True, "Originates north of Londolozi; the Talamati Pride broke away from it in 2007."),
    ("talamati", "Talamati Pride", "nkuhuma", 2007, 2007, None, False, "Broke away from the Nkuhuma Pride in 2007 when the Mapogo took over from the Manyeleti Males."),
    ("msuthlu", "Msuthlu Pride", "talamati", 2022, 2022, None, False, "Described as 'formerly the Talamati Breakaway Pride'; first met in 2022 in the north of the reserve."),
    ("nkuhuma-bw", "Nkuhuma Breakaway Pride", "nkuhuma", 2022, 2022, None, False, "Two Nkuhuma lionesses broke away westward and mated with the Plains Camp Males; both were killed in 2024, leaving two young orphans."),
    ("sparta", "Sparta Pride", None, None, None, 2020.9, True, "Long-resident Londolozi pride (viewed for over 40 years); down to one female by Nov 2020."),
    ("styx", "Styx Pride", None, None, None, None, True, "Old pride (14 lions in 2004), later semi-nomadic, then established in the south of Londolozi."),
    ("southern", "Southern Pride", None, None, None, None, True, "Once the largest pride in the Sabi Sand; nearly extinct by 2021, new offspring in 2025."),
    ("othawa", "Othawa Pride", None, None, 2018, None, True, "Known only as a western pride whose lionesses were mated by the Matimba Males in 2018."),
    ("ximungwe", "Ximungwe Pride", None, None, 2023, None, True, "Western-sector pride dominated by the Plains Camp Males; renamed Bateleur Pride in Feb 2026."),
]
PRIDE_ALIASES = {
    "Tsalala Breakaway Pride (2009-2012)": "tsalala-bw1",
    "Tsalala Breakaway Pride (2015-2018)": "tsalala-bw2",
    "Mhangeni Breakaway Pride": "ntsevu",
    "Mhangeni Breakaway Pride / Ntsevu Pride (origin only)": "ntsevu",
    "Msuthlu Pride (formerly Talamati Breakaway Pride) - link only": "msuthlu",
    "Ximungwe Pride (lions)": "ximungwe",
    "Tsalala Pride": "tsalala", "Mhangeni Pride": "mhangeni", "Ntsevu Pride": "ntsevu",
    "Kambula Pride": "kambula", "Ntsevu Breakaway Pride": "ntsevu-bw", "Sparta Pride": "sparta",
    "Castleton Pride": "castleton", "Talamati Pride": "talamati", "Msuthlu Pride": "msuthlu",
    "Styx Pride": "styx", "Southern Pride": "southern", "Othawa Pride": "othawa",
    "Nkuhuma Pride": "nkuhuma", "Nkuhuma Breakaway Pride": "nkuhuma-bw",
}
# words that identify a pride inside free text such as "Tsalala, Mhangeni and Ntsevu prides"
PRIDE_WORDS = [
    ("tsalala", "tsalala"), ("mhangeni", "mhangeni"), ("ntsevu", "ntsevu"), ("kambula", "kambula"),
    ("styx", "styx"), ("southern pride", "southern"), ("msuthlu", "msuthlu"), ("talamati", "talamati"),
    ("nkuhuma pride", "nkuhuma"), ("ximungwe", "ximungwe"), ("sparta", "sparta"), ("othawa pride", "othawa"),
]
COHORT_RE = re.compile(r"cubs|litter|cohort|males$|lionesses|daughters|offspring", re.I)


def build_lions():
    d = json.loads((ROOT / "data" / "lions.json").read_text(encoding="utf-8"))
    rels, inds, coals = d["relationships"], d["individuals"], d["coalitions"]

    idx = {}
    for i in inds:
        for k in [i["id"], i["label"]] + i["aliases"]:
            idx.setdefault(norm(k), ("ind", i["id"]))
    for c in coals:
        for k in [c["name"]] + ([c["id"]] if c.get("id") else []):
            idx.setdefault(norm(k), ("coal", "c:" + norm(c["name"])))

    def resolve(label):
        if label in PRIDE_ALIASES:
            return ("pride", PRIDE_ALIASES[label])
        return idx.get(norm(label))

    # every relationship, indexed per node so the panel can show evidence + source
    rel_out, node_rels = [], collections.defaultdict(list)
    for n, r in enumerate(rels):
        rel_out.append({
            "s": r["subject"], "r": r["relation"], "o": r["object"], "d": r["date"],
            "q": r["evidence_quote_short"], "u": r["source_url"], "c": r["confidence"],
        })
        for end in (resolve(r["subject"]), resolve(r["object"])):
            if end:
                node_rels[end[1]].append(n)

    # ---- prides: curated genealogy + male-coalition events
    pride_info = {p["name"]: p for p in d["prides"]}
    ind_by_pride = collections.defaultdict(list)
    for i in inds:
        pr = (i["pride"] or "").lower()
        for w, k in PRIDE_WORDS:
            if w in pr:
                ind_by_pride[k].append(i["label"])
                break

    coal_by_norm = {norm(c["name"]): c["name"] for c in coals}
    events = collections.defaultdict(list)
    for n, r in enumerate(rels):
        if r["relation"] not in ("takeover_of", "mated_with"):
            continue
        s, o = r["subject"], r["object"]
        if norm(s) in coal_by_norm and s not in PRIDE_ALIASES:
            cname, target = coal_by_norm[norm(s)], o
        elif norm(o) in coal_by_norm and s in PRIDE_ALIASES:
            cname, target = coal_by_norm[norm(o)], s
        else:
            continue
        y = year_of(r["date"])
        low = target.lower()
        if y is None or ("pride" not in low and low.rstrip().endswith(("male", "males"))):
            continue  # undated, or a takeover of another coalition rather than of a pride
        keys = {k for w, k in PRIDE_WORDS if w in low}
        if target in PRIDE_ALIASES:
            keys.add(PRIDE_ALIASES[target])
        for k in keys:
            events[k].append({
                "coalition": cname, "kind": "takeover" if r["relation"] == "takeover_of" else "mated",
                "year": y, "date": r["date"], "rel": n,
            })
    for k in events:  # one marker per coalition per year; a takeover outranks "mated with"
        best = {}
        for e in events[k]:
            sig = (e["coalition"], e["year"])
            if sig not in best or (e["kind"] == "takeover" and best[sig]["kind"] != "takeover"):
                best[sig] = e
        events[k] = sorted(best.values(), key=lambda e: (e["year"], e["coalition"]))

    p_nodes = []
    for key, name, parent, ly, start, end, approx, note in PRIDES:
        cands = [rec for nm, rec in pride_info.items() if PRIDE_ALIASES.get(nm) == key or nm == name]
        info = max(cands, key=lambda r: len(r["origin_summary"])) if cands else None
        p_nodes.append({
            "id": key, "name": name, "parent": parent, "linkYear": ly, "start": start, "end": end,
            "approxStart": approx, "note": note,
            "status": info["status"] if info else None,
            "origin": info["origin_summary"] if info else None,
            "aliases": info["aliases"] if info else [],
            "first": info["first_mentioned"] if info else None,
            "last": info["last_mentioned"] if info else None,
            "history": info["splits_and_takeovers"] if info else [],
            "notes": info["notes"] if info else None,
            "events": events.get(key, []),
            "members": ind_by_pride.get(key, []),
            "rels": node_rels.get(key, []),
        })

    # ---- bloodlines: mother_of / sire_of between individuals, cohorts and coalitions
    nodes = {}
    for i in inds:
        nodes[i["id"]] = {
            "id": i["id"],
            "kind": "cohort" if i["sex"] in ("mixed", "M/F", "M+F") or COHORT_RE.search(i["label"]) else "lion",
            "label": i["label"], "aliases": i["aliases"], "sex": i["sex"], "pride": i["pride"],
            "birthYear": i["birth_year"], "birthNote": i["birth_note"], "deathYear": i["death_year"],
            "fate": i["fate"], "notes": i["notes"], "confidence": i["confidence"],
            "sources": i["source_urls"], "rels": node_rels.get(i["id"], []),
        }
    for c in coals:
        key = "c:" + norm(c["name"])
        nodes.setdefault(key, {
            "id": key, "kind": "coalition", "label": c["name"], "sex": "M", "origin": c.get("origin"),
            "territory": c.get("territory"), "status": c.get("status"), "notes": c.get("notes"),
            "sired": c.get("sired_litters", []), "sources": c.get("source_urls", []),
            "rels": node_rels.get(key, []),
        })

    def endpoint(label, role):
        res = resolve(label)
        if res and res[0] != "pride":
            return res[1]
        # unresolved text (or a pride standing in for "a female of that pride") -> explicit cohort node
        nid = "synthetic:" + norm(label)
        nodes.setdefault(nid, {
            "id": nid, "kind": "cohort", "label": label, "synthetic": True, "rels": [],
            "sex": {"mother": "F", "sire": "M"}.get(role, "mixed"),
        })
        return nid

    links, seen = [], set()
    for n, r in enumerate(rels):
        if r["relation"] not in ("mother_of", "sire_of"):
            continue
        role = "mother" if r["relation"] == "mother_of" else "sire"
        a, b = endpoint(r["subject"], role), endpoint(r["object"], "child")
        if a == b or (a, b, role) in seen:
            continue
        seen.add((a, b, role))
        links.append({"from": a, "to": b, "role": role, "year": year_of(r["date"]), "rel": n})
        for x in (a, b):
            if nodes[x].get("synthetic") and n not in nodes[x]["rels"]:
                nodes[x]["rels"].append(n)

    # individual-level pointers that name another individual id
    for i in inds:
        for fld, role in (("mother_id_or_label", "mother"), ("father_or_sire_label", "sire")):
            for tok in re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)+", i.get(fld) or ""):
                if tok in nodes and tok != i["id"] and (tok, i["id"], role) not in seen:
                    seen.add((tok, i["id"], role))
                    links.append({"from": tok, "to": i["id"], "role": role, "year": i["birth_year"], "rel": None})

    used = {l["from"] for l in links} | {l["to"] for l in links}
    nodes = {k: v for k, v in nodes.items() if k in used}

    # year per node: stated birth year > a year in its label > date of the link that introduces it
    link_year = {}
    for l in links:
        if l["year"]:
            link_year[l["to"]] = min(l["year"], link_year.get(l["to"], 9999))
    for k, v in nodes.items():
        ys = [y for y in (year_of(rel_out[n]["d"]) for n in v["rels"]) if y]
        if v["kind"] == "coalition":
            v["start"], v["approx"] = (min(ys) if ys else None), True
            v["end"] = max(ys) if ys else None
            continue
        by = v.get("birthYear")
        v["approx"] = by is None
        if by is None:
            by = year_of(v["label"]) or link_year.get(k)
        v["start"] = by
        v["end"] = v.get("deathYear")

    # connected components, largest first -> "families" for the filter
    adj = collections.defaultdict(set)
    for l in links:
        adj[l["from"]].add(l["to"])
        adj[l["to"]].add(l["from"])
    seen_n, comps = set(), []
    for k in nodes:
        if k in seen_n:
            continue
        st, c = [k], []
        seen_n.add(k)
        while st:
            x = st.pop()
            c.append(x)
            for y in adj[x]:
                if y not in seen_n:
                    seen_n.add(y)
                    st.append(y)
        comps.append(c)
    comps.sort(key=len, reverse=True)
    for ci, c in enumerate(comps):
        for k in c:
            nodes[k]["component"] = ci

    dump("lions.json", {
        "about": d["about"], "counts": d["counts"], "blog": d["source_blog_category"],
        "prides": p_nodes,
        "bloodlines": {"nodes": list(nodes.values()), "links": links, "components": [len(c) for c in comps]},
        "relationships": rel_out,
        "openQuestions": d["open_questions"],
        "externalSources": d["external_sources"].get("sources", []),
        "now": NOW,
    })


if __name__ == "__main__":
    build_leopards()
    build_lions()
