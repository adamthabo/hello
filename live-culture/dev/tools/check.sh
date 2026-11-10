#!/bin/sh
# build the page, make sure its script parses, then run the tests that must pass before anything is published.
# usage: sh tools/check.sh          (build and parse only)
#        sh tools/check.sh all      (also: every world opens clean, real-touch play, loudness under the band, the edge cases,
#                                    and a phone that holds the sound back until a plain tap)
# The tests need the page served: sh tools/serve.sh &   (port 8757)
cd "$(dirname "$0")/.." || exit 1
python3 -I build.py && node --check app/_check.js && node --check hosted/_check.js && echo "BUILD OK" || exit 1
[ "$1" = "all" ] || exit 0
mkdir -p shots
node tools/test_astro.js && node tools/t_first.js phone,desk && node tools/t_play.js phone && node tools/t_levels.js && node tools/t_misc.js && node tools/t_hide.js && node tools/t_gov.js && node tools/t_lock.js && echo "ALL CHECKS PASSED"
