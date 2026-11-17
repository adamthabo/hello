#!/bin/sh
# sets up a fresh clone of the site's repository (adamthabo/live-culture) for work: run from dev/ (sh tools/fresh.sh).
# It puts the page's pictures, sounds, data and fonts where the build and the tests look for them, installs the tools' two
# packages, fetches the stand-in site's sources from their GitHub mirrors (tools/feed.py) and DeepStateMap's latest front, builds,
# packs the site, and starts both servers: 8757 (the page, for the tests) and 8758 (the stand-in site, for t_hosted.js).
# (16 Nov: written for the hourly runs, docs/HOURLY.md)
cd "$(dirname "$0")/.." || exit 1
mkdir -p app/_fonts app/data shots testdata
cp fonts/*.woff2 app/_fonts/ || exit 1
cp -R ../public/audio ../public/img ../public/snd app/ || exit 1
cp ../public/data/*.json app/data/ || exit 1
(cd tools && npm install --no-audit --no-fund --loglevel=error >/tmp/fresh-npm.log 2>&1) || echo "npm install failed: test_astro.js needs it (/tmp/fresh-npm.log)"
echo "fetching the stand-in site's sources (a few minutes)..."
python3 -I tools/feed.py >/tmp/fresh-feed.log 2>&1 || echo "feed.py: some sources failed, the rest kept (/tmp/fresh-feed.log)"
for i in 0 1 2 3 4 5; do
  d=$(date -u -d "-$i day" +%Y%m%d)
  curl -sfL -o testdata/deepstate.geojson "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_$d.geojson" && break
done
[ -s testdata/deepstate.geojson ] || echo "no DeepStateMap file fetched: t_hosted.js's front check will fail"
sh tools/check.sh || exit 1
sh tools/pack_hosted.sh || exit 1
pkill -f "http.server 8757" 2>/dev/null; pkill -f "node tools/hostmock.mjs" 2>/dev/null; sleep 1
nohup sh tools/serve.sh >/tmp/fresh-serve.log 2>&1 &
nohup node tools/hostmock.mjs >/tmp/fresh-hostmock.log 2>&1 &
sleep 2
curl -sf -o /dev/null http://127.0.0.1:8757/local.html && curl -sf -o /dev/null http://127.0.0.1:8758/local.html && echo "FRESH OK" || { echo "a server did not start (/tmp/fresh-serve.log, /tmp/fresh-hostmock.log)"; exit 1; }
