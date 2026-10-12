#!/usr/bin/env bash
# Re-download all raw source material into <root>/raw. Safe to re-run (overwrites).
# Usage: scripts/fetch_all.sh <project_root>
set -euo pipefail
root="${1:?usage: fetch_all.sh <project_root>}"
raw="$root/raw"
mkdir -p "$raw/lion_bodies"

LEO=https://leopards.londolozi.com/wp-json/wp/v2
BLOG=https://blog.londolozi.com/wp-json/wp/v2
LIONS_CAT=3325   # blog category "Lions" (slug lions-2), 862 posts as of 2026-10-11

echo "leopards (87 records fit in one page of 100)"
curl -fsS "$LEO/leopard?per_page=100&page=1" -o "$raw/leopard_p1.json"
curl -fsS "$LEO/lineage?per_page=100" -o "$raw/lineage.json"

echo "lion post list (9 pages x 100; list endpoint omits body)"
for p in 1 2 3 4 5 6 7 8 9; do
  curl -fsS "$BLOG/posts?categories=$LIONS_CAT&per_page=100&page=$p&_fields=id,date,slug,link,title,excerpt,tags" \
    -o "$raw/lion_posts_$p.json"
done

echo "lion post bodies (single-post endpoint exposes the text in the 'body' field)"
python3 -I "$(dirname "$0")/fetch_bodies.py" "$raw"
