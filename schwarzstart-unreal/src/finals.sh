#!/bin/bash
cd /home/claude/work/unreal-kit/src
P=/home/claude/work/unreal-kit/previews
run() { python3 render.py "$1" "$P/$2" 1600 900 48 "${@:3}" dust=1.0 2>&1 | grep -E "rendered|post done|Error|Traceback|KeyError" ; }
run street_west 01_dusk_towards_fernsehturm.jpg elev=1.0 az=250 auto=0.12
run sunset 02_last_light_looking_west.jpg elev=5 az=275 auto=0.12
run market 03_black_market_hackescher_markt.jpg elev=0.5 az=250 auto=0.12
run barricade 04_barricade.jpg elev=1.0 az=250 auto=0.12
run tram 05_stranded_tram.jpg elev=7 az=240 auto=0.13
run overview 06_overview.jpg elev=10 az=235 auto=0.16 fog=0.05 flakes=0
echo ALL DONE
