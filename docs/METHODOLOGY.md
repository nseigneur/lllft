# Methodology – how this data was collected

Everything here was collected on 2026-10-11. Field-level descriptions of the outputs are in [DATA_SCHEMA.md](DATA_SCHEMA.md).

## 1. Discovery

* `blog.londolozi.com` is a WordPress site. Its home page links to a *Leopard Cards* page and to the separate `leopards.londolozi.com` site. The blog has a *Lions* category (`/category/lions-2/`, 862 posts, 58 pages of 15).
* `leopards.londolozi.com` is also WordPress. Its public REST index (`/wp-json/wp/v2/types`) exposes two custom post types: `leopard` (87 records) and `lineage` (7 records, called "dynasties" on the site). Profile fields live under each record's `acf` object.
* No equivalent exists for lions. The `www.londolozi.com` sitemap, the photography site and the blog REST types were checked for a lion or pride post type; none exists. The "Mashaba 4:3 Female" profile is the only "family tree" reference found, and it is a leopard.

## 2. Leopards (deterministic)

1. `scripts/fetch_all.sh` downloads `/wp-json/wp/v2/leopard?per_page=100` (all 87 in one page) and `/lineage`.
2. `scripts/build_leopards.py` flattens the ACF fields into `data/leopards.json`:
   * `lol_family_mother`, `lol_family_father`, `lol_family_siblings`, `lol_family_offspring` and `lol_status_deceased_involved` are **post IDs**; they are resolved to `{id, name, slug}` using the 87 fetched records. IDs not among them are kept with `name: null` and a note.
   * `lol_family_lineage` is the ID of a `lineage` record, resolved to its name.
   * HTML in text fields is stripped to plain text.
3. Parent→child edges (`leopard_parent_child_edges.csv`) are derived from each child's mother/father field; an edge is also added from a parent's `offspring` list if the child doesn't already point back (column `derived_from` says which).
4. `scripts/leopard_mermaid.py` writes the Mermaid diagram.

Re-running steps 1–2 into a fresh directory reproduced `leopards.json` identically (checked 2026-10-11).

**Known limits:** profiles marked private/unpublished are not returned by the API (HTTP 401 on direct access). Six parent IDs (120, 269, 287, 1856, 10274, 10276) and one sibling ID (752) point at such profiles. The profile text of a child sometimes names the parent (e.g. "born to the Kapen female"); these names were *not* back-filled into the structured fields.

## 3. Lions (LLM-assisted, not deterministic)

Lion information exists only as prose, so it was extracted by reading.

1. **Post list** – `scripts/fetch_all.sh` pages through `/wp-json/wp/v2/posts?categories=3325` (9 pages × 100). The list endpoint does not return post bodies.
2. **Post bodies** – `scripts/fetch_bodies.py` selected posts whose *title* matches a keyword regex (pride, coalition, takeover, breakaway, cubs, lioness, male lions, males, female, lions, plus a few history words) → **307 of 862** posts. For each, the single-post endpoint's `body` field is stripped of HTML and saved to `raw/lion_bodies/YYYY-MM-DD_<postid>.txt` with TITLE/DATE/URL header lines.
3. **Extraction** – three independent LLM passes each read a pride/coalition group in chronological order (oldest first, so lineage builds up) and wrote structured JSON:
   * Tsalala pride, Birmingham, Majingilane, Matimba males, Sparta, the Tailless lioness → `lions_tsalala_group.json`
   * Ntsevu, Kambula, Msuthlu, Styx, Othawa, Southern pride → `lions_ntsevu_group.json`
   * Mhangeni, Nkuhuma, Talamati, and later male coalitions (Plains Camp, Ndzhenga, Gijima, Avoca, Nkumati…) → `lions_mhangeni_coalitions_group.json`

   Instructions given to every pass: record only what posts state; mark `confidence: "inferred"` (with a reason) when a relation is implied; keep each evidence quote under 25 words; note contradictions rather than resolve them; use the blog's own labels for unnamed lions.
4. **External pass** – a fourth LLM pass searched the web for corroborating sources and for any dedicated lion family-tree page (none exist). Output: `lions_external_sources.json`. These sources (thewildlion.org, wild-guide.org, Wikipedia, lodge sites) are secondary and several are themselves compiled from the same blog; they were **not** merged into the tree.
5. **Merge** – `scripts/merge_lions.py` combines the three group files into `data/lions.json`:
   * prides, coalitions and individuals are keyed by lower-cased name / `id`; when several passes describe the same entity, the richest report is the primary record and the others are kept under `other_reports` (nothing is discarded);
   * relationships are de-duplicated on (subject, relation, object, source URL);
   * open questions from all passes are concatenated.
6. **Verification** – every one of the 366 relationship `evidence_quote_short` values was re-checked as text of its cited post in the local files: all present (2 differ from the post only by whitespace around punctuation). This confirms the *quote exists*, not that the model's interpretation of it is right.

**Known limits**

* 555 Lions-category posts were never read (titles without the keywords). A lineage fact that appears only in one of them is missing.
* Entity matching across passes is by exact name/id. Variants such as "Msuthlu Pride" and "Msuthlu Pride (formerly Talamati Breakaway Pride) - link only" remain separate records.
* Because extraction is done by an LLM, a re-run would not give byte-identical output.
* Posts contradict each other (founding story of the Mhangeni, year the Tailless lioness lost her tail, cub counts, who killed her and the Othawa Male, Birmingham count, two different males called "Styx Male"). They are listed in `open_questions`, not resolved.
* The 2026-09-05 post "The Styx Male: A Growing Presence…" was not among the 307 downloaded posts.
* Other-source disagreement on who killed the Tailless Tsalala female is recorded in the external-source file.

## 4. Reproducing

```bash
scripts/fetch_all.sh "$PWD"                         # raw/ (network; ~1 min)
python3 -I scripts/build_leopards.py raw data       # data/leopards.json + edges CSV
python3 -I scripts/leopard_mermaid.py data          # data/leopard_tree.mmd
python3 -I scripts/merge_lions.py data              # data/lions.json, lion_relationships.csv, lion_tree.mmd
python3 -I scripts/gen_reports.py "$PWD"            # docs/LEOPARDS.md, docs/LIONS.md
```

`lions_*_group.json` and `lions_external_sources.json` are inputs to the merge and are **not** regenerated by these commands (they come from the LLM passes in section 3).

## 5. Politeness and terms

Only public, unauthenticated endpoints were used, at low volume (about 330 requests). Blog text and photographs belong to Londolozi and its contributors; this repository stores facts and short (<25 word) quotes with links. The `raw/` directory contains full post text and should not be republished.
