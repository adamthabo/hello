#!/bin/sh
# puts the hosted page and what it needs into the Worker's public folder (run from dev/ after sh tools/check.sh)
cd "$(dirname "$0")/.." || exit 1
P=../public
mkdir -p $P/data $P/audio $P/img
cp hosted/index.html $P/index.html && cp app/data/live.json app/data/satinfo.json $P/data/ && cp app/audio/stem*.mp3 $P/audio/ && cp app/img/earth-*.jpg $P/img/ && echo "PACKED $(du -sh $P | cut -f1)"
