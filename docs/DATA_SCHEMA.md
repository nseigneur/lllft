# Data schema reference

All files are UTF-8. Dates are **free-form strings** as published (not normalised): leopards use `"July 2023"` / `"2023"`; lions use `"YYYY"`, `"YYYY-MM"` or `"YYYY-MM-DD"`. Method: see [METHODOLOGY.md](METHODOLOGY.md).

## data/leopards.json  (built by `scripts/build_leopards.py`)

```jsonc
{
  "source": "https://leopards.londolozi.com/wp-json/wp/v2/leopard",
  "count": 87,
  "lineages": [ { "id": 769, "name": "Mother Leopard" } ],      // 7 "dynasties"
  "leopards": [ {
    "id": 10977,                       // WordPress post ID (the key used by all relations)
    "slug": "kurhula-33-female",
    "url": "https://leopards.londolozi.com/leopard/kurhula-33-female/",
    "title": "Kurhula 3:3 Female",     // name + spot-pattern code + sex
    "name": "Kurhula",
    "spots": "3:3",                    // spot-count ID used by rangers (null for 1 record)
    "sex": "female",                   // "female" (50) | "male" (37)
    "aliases": ["Kunyuma"],
    "born": "July 2023",               // month/year, either may be missing
    "born_year": "2023",
    "status": "Alive",                 // "Alive" (30) | "Deceased" (57)
    "died": "June 2025",
    "death_note": "Killed by the Tortoise Pan Male in a fight over a female",
    "death_involved": [ Ref ],         // other leopards involved in the death
    "lineage": { "id": 769, "name": "Mother Leopard" },   // name "Unknown" for 31 leopards
    "mother": Ref | null,
    "father": Ref | null,
    "siblings": [ Ref ],
    "offspring": [ Ref ],              // as listed on the profile; incomplete for many
    "litters": [ { "year": "2026", "month": "April", "cubs": null, "description": "…" } ],
    "excerpt": "…", "profile": "…",    // plain-text summary / long profile
    "territory": "…"
  } ]
}
// Ref = { "id": 85, "name": "Camp Pan 4:3 Male", "slug": "camp-pan-43-male" }
//   unresolved (hidden profile): { "id": 120, "name": null, "slug": null, "note": "not in published leopard set" }
```

Not captured: photo/gallery URLs, territory map images, timeline entries, "users who spotted" lists (all present under `acf` in `raw/leopard_p1.json` if needed).

## data/leopard_parent_child_edges.csv

`parent_id, parent, child_id, child, parent_role, derived_from`
* `parent_role`: `mother` | `father` | `parent` (offspring-list entries of a leopard with unknown sex).
* `derived_from`: `child_field` (child's mother/father pointer) or `offspring_field` (parent's offspring list only).
* Hidden parents have an ID but an empty `parent` name.

## data/leopard_tree.mmd

Mermaid `graph TD`. Solid arrow = mother→child, dotted = father→child. Node = `"Name (birth year)"`; hidden parents are `"(hidden profile #ID)"`.

## data/lions.json  (built by `scripts/merge_lions.py`)

```jsonc
{
  "about": "…", "source_blog_category": "https://blog.londolozi.com/category/lions-2/",
  "counts": { "prides": 19, "coalitions": 36, "individuals": 135, "relationships": 366, "open_questions": 66 },
  "prides": [ Pride ], "coalitions": [ Coalition ], "individuals": [ Individual ],
  "relationships": [ Relationship ], "open_questions": [ { "group": "tsalala", "question": "…" } ],
  "external_sources": { "sources": [ … ], "dedicated_lion_family_tree_pages_found": [], "gaps": [ … ] }
}
```

Every `prides` / `coalitions` / `individuals` record also has
* `reported_by`: which extraction passes described it (`tsalala` | `ntsevu` | `mhangeni`);
* `other_reports` (only when more than one pass described it): the full records from the other passes, each with its `group`. The top-level record is the longest one.

**Pride**: `name, aliases[], status, first_mentioned, last_mentioned, origin_summary, splits_and_takeovers[{date, event, source_url}], notes`

**Coalition**: `id` (12 of 36 have one), `name, members[]` (labels or individual ids)`, origin, sired_litters[{mother, year, notes}], territory, status, notes, source_urls[]`

**Individual** (a single lion *or* a litter / cohort / group – read `label`):
`id (slug), label, aliases[], sex, pride, birth_year, birth_note, death_year, fate, mother_id_or_label, father_or_sire_label, offspring_labels[], sibling_labels[], notes, source_urls[], confidence`
* `sex` is not normalised: `M` (53), `F` (43), `mixed` (15), `M/F` (8), `M+F` (7), `U` (6), `unknown` (3).
* `confidence`: `stated` (115) | `inferred` (20).
* `mother_id_or_label` / `father_or_sire_label` may be an `id` of another individual **or** free text such as `"Castleton Pride (natal pride; mother not named)"` or a coalition name – they are not guaranteed to resolve to an id.

**Relationship**: `subject, relation, object, date, evidence_quote_short, source_url, confidence, reported_by`
* `evidence_quote_short`: under 25 words, taken from the cited post (see METHODOLOGY §3.6 for how this was checked).
* `confidence`: `stated` (311) | `inferred` (55).
* `relation` and counts: `sire_of` 85, `killed_by` 61, `member_of` 51, `mated_with` 50, `mother_of` 37, `breakaway_from` 26, `takeover_of` 25, `merged_with` 16, `sibling_of` 15.
* `subject` / `object` are labels (individuals, cohorts, prides or coalitions), not guaranteed ids. Mothers are under-represented relative to sires because the blog usually names the pride, not the individual mother.

## data/lion_relationships.csv

`subject, relation, object, date, confidence, evidence, source_url` – a flat copy of `relationships` (without `reported_by`).

## data/lion_tree.mmd

Mermaid `graph TD` built only from `mother_of` (solid, labelled *mother*), `sire_of` (dotted, *sire*) and `breakaway_from` (thick, *breakaway*) relationships. Node ids are slugified labels, so the same animal under two labels appears as two nodes. About 138 nodes – use a Mermaid renderer that copes with large graphs.

## Intermediate files (inputs to the merge)

`data/lions_tsalala_group.json`, `lions_ntsevu_group.json`, `lions_mhangeni_coalitions_group.json` – same record shapes as above plus a `group` string and `open_questions[]` (strings).
`data/lions_external_sources.json` – `{ sources: [{url, title, publisher, date, what_it_adds, key_facts[{claim, subject, confidence}]}], dedicated_lion_family_tree_pages_found[], other_structured_lion_databases_non_londolozi[], gaps[] }`.

## raw/  (untrusted downloaded data)

| File | Content |
|---|---|
| `leopard_p1.json`, `lineage.json` | WordPress REST responses for `leopard` and `lineage` (full `acf` objects) |
| `lion_posts_1..9.json` | Lions-category post list: `id, date, slug, link, title, excerpt, tags` (no body) |
| `lion_bodies/YYYY-MM-DD_<postid>.txt` | `TITLE:` / `DATE:` / `URL:` header + stripped post text, 307 files |
| `leopards_londolozi_com_*.html`, `cat.json`, `h.txt`, `h2.txt`, `lion_tag_counts.json` | Discovery artefacts from the exploration phase (page HTML, category lookup, response headers, tag-ID counts); not used by the scripts and not recreated by `fetch_all.sh` |
