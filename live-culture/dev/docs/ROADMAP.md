# Roadmap

Nothing here is promised or scheduled. These are the next things worth doing, most useful first. Ask the owner before any of them
changes how the page sounds.

1. **See the hosted version run for real.** Deployed on 10 Nov (live at 11:38 at `live-culture.adamthabo.workers.dev`), but not yet
   seen working against the real sources: this session cannot open workers.dev. Ask him for a screenshot of each world, or open it
   from a session that can: check every source arrives (the readouts give each one's time), which cameras are on the air, how the
   real clouds and rain look; fix what the stand-ins could not show. Updates go to the `live-culture` repository Cloudflare made for
   him (each push deploys; its check run says whether it went live). Never push into the repository of his trading app for this.
2. **More puzzles, and a level editor.** Five puzzles now, each checked by `t_puzzles.js`. Two more would bring back one player
   per puzzle. What did not work on 10 Nov (try none of these again without a new idea): smoke led along a sloping wall or trapped
   under a shelf (too faint to carry, it barely rises); jets meant to cross and spoil each other's colour (they push each other aside
   and stay clean); a ramp hit head-on by a vertical jet (it kills the jet); a drain on a jet's mouth (it takes too little); a ring
   near the edge a jet runs into (the jet spreads along the edge into it). What works: a jet turned by a wall it meets at a slant,
   pushed by a fan, stopped by a lid. The machine could take valves, mirrors, heat; a puzzle could be built and shared from the sandbox.
3. **Hear it and hold it.** The two things no machine test covers: every voice by ear, and every world on a real iPhone
   (frame rate in Wind and Orbit above all, the first touch starting the band with the ring switch on silent, whether a first stroke
   leaves the sound waiting for a tap as expected, the card's size).
4. **Weather done really well** (his words: "More weather would could be interesting if it was done really well", then "more layers,
   rain, sun, clouds. Real time"). Done in the hosted version: clouds (3-hourly), rain (IMERG, about four hours behind), the Sun. Next:
   radar rain where there is radar (RainViewer, every ten minutes), the geostationary satellites' ten-minute infrared for the clouds,
   the temperature of the air and the sea.
5. **Keep the artifact's data fresh.** Only if he asks: a scheduled task that runs the refresh in README.md. The wind changes every
   6 hours; four runs a day is about what his plan can spare (a night of hourly runs once hit his limit).
6. **More in Orbit.** The hundred brightest objects (mostly spent rocket stages, not in the active list); a ring on the ground under
   a chosen satellite; the Moon at its true place far out; passes over a place he names.
7. **Video as ink.** A clip from his camera roll through the file picker (allowed in the artifact) playing as the ink in Smoke.
8. **Record a loop.** Save one four-bar loop of a world as video (the `downloads` capability takes mp4 and webm).
