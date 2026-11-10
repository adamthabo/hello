#!/bin/sh
# serves app/ for the tests (run from lc2/)
cd "$(dirname "$0")/../app" && exec python3 -I -m http.server 8757 --bind 127.0.0.1
