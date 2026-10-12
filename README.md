# LionLines – Londolozi lion & leopard family trees

Collected 2026-10-11 from https://blog.londolozi.com and https://leopards.londolozi.com.

## The website (`site/`)

An interactive, dependency-free static site: lion pride lineage, lion bloodlines and leopard dynasties drawn as life-lines on a shared time axis (d3 is vendored, fonts are self-hosted, no build step). Styling follows londolozi.com (cream and gold haze, Trajan-style capitals, DIN-condensed labels).

```bash
python3 -I -m http.server 4173 -d site     # preview at http://localhost:4173
python3 -I scripts/build_site_data.py "$PWD"   # regenerate site/data/*.json after changing data/
```

**Deploy to Vercel (Git):** import the repository in Vercel and keep the defaults. `vercel.json` sets the output directory to `site`, disables install/build, and adds security and cache headers. Commit `site/data/*.json` (they are generated, but Vercel does not run the Python step). `raw/` (16 MB of downloaded source text) is not needed to deploy and can be left out of the repository if you prefer a lighter repo.

The pride genealogy is the one curated layer (`PRIDES` in `scripts/build_site_data.py`); every parent link carries the year the posts state. The source lists seven "lineages" for leopards, but one of them is `Unknown`, so the site shows six named dynasties.

## Layout

| Path | What it is |
|---|---|
| `data/leopards.json` | 87 leopard profiles: spots ID, sex, aliases, born/died, status, dynasty (lineage), mother, father, siblings, offspring, litters, territory, profile text |
| `data/leopard_parent_child_edges.csv` | 104 parent→child edges (mother/father) derived from the profiles |
| `data/leopard_tree.mmd` | Mermaid graph of the leopard tree (solid = mother, dotted = father) |
| `data/lions.json` | Merged lion dataset: prides, coalitions, individuals/cohorts, relationships, open questions, external sources |
| `data/lion_relationships.csv` | 366 lion relationships (mother_of, sire_of, sibling_of, breakaway_from, takeover_of, mated_with, killed_by, merged_with, member_of) with a short evidence quote + source URL |
| `data/lion_tree.mmd` | Mermaid graph of lion mother/sire/breakaway links |
| `data/lions_*_group.json`, `data/lions_external_sources.json` | Per-pass extraction outputs that `lions.json` was merged from |
| `raw/` | Downloaded source material (WordPress REST JSON, 307 lion post texts) – untrusted input data |
| `docs/` | Documentation – see index below |
| `scripts/` | Collection, build and report scripts – see "Reproduce" below |

## Documentation index

| Doc | Purpose |
|---|---|
| [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) | How the data was found, fetched, extracted and verified; known limits |
| [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md) | Field-by-field description of every data file, value sets and counts |
| [`docs/LEOPARDS.md`](docs/LEOPARDS.md) | Readable reference of all 87 leopards grouped by dynasty (generated) |
| [`docs/LIONS.md`](docs/LIONS.md) | Readable reference of lion prides, coalitions, individuals and open questions (generated) |

## Reproduce

```bash
scripts/fetch_all.sh "$PWD"                         # raw/ (network; ~1 min, ~330 requests)
python3 -I scripts/build_leopards.py raw data       # data/leopards.json + leopard_parent_child_edges.csv
python3 -I scripts/leopard_mermaid.py data          # data/leopard_tree.mmd
python3 -I scripts/merge_lions.py data              # data/lions.json, lion_relationships.csv, lion_tree.mmd
python3 -I scripts/gen_reports.py "$PWD"            # docs/LEOPARDS.md, docs/LIONS.md
```

The leopard build is deterministic (a fresh run reproduced `leopards.json` identically). The three `data/lions_*_group.json` files and `data/lions_external_sources.json` come from LLM reading passes and are inputs to the merge, not outputs of these commands – see the methodology doc.

## Sources and method

* **Leopards** – structured data from the public WordPress REST API `leopards.londolozi.com/wp-json/wp/v2/leopard` (87 records) and `/lineage` (7 dynasties). Parent/sibling/offspring fields are post IDs, resolved to names.
* **Lions** – no lion database exists on Londolozi's sites (checked the sitemap and REST types). The only source is narrative blog posts in the Lions category (862 posts, 2014–2026). 307 posts whose titles mention prides, coalitions, cubs, males/females etc. were downloaded in full and read by three extraction passes (Tsalala/Birmingham/Majingilane/Matimba; Ntsevu/Kambula/Msuthlu/Styx/Othawa; Mhangeni/Nkuhuma/male coalitions). A fourth pass collected external corroboration (thewildlion.org, wild-guide.org, Wikipedia, lodge sites; secondary, lower confidence).
* Every lion relationship carries a short quote and URL; all 366 quotes were re-checked against the downloaded post text (2 differ only by whitespace).

## Caveats

* **Leopards:** 6 referenced parents (post IDs 120, 269, 287, 1856, 10274, 10276) and 1 sibling (752) are hidden/unpublished profiles the API won't return; they appear as unnamed nodes. Some are named only in profile text (e.g. "Kapen female" for Kaxane 3:3 Male). 31 leopards have lineage "Unknown"; 23 have no recorded parent.
* **Lions:** The other 555 Lions-category posts (titles without the keywords) were not read. Lions are mostly unnamed, so entries use the blog's own labels (e.g. "Tsalala Female", "Original Tailless Female") and several are litter/cohort groups, not single animals.
* Posts contradict each other in places (founding of the Mhangeni, year the Tailless lost her tail, cub counts, who killed the Tailless female and the Othawa Male, Birmingham male count). These are listed in `open_questions` (66) rather than resolved. `confidence: inferred` marks relationships not stated outright.
* The Styx Male profile post (2026-09-05) was not among the downloaded files, and two different males are called "Styx Male".
