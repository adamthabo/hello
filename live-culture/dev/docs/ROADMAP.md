# Roadmap

Nothing here is promised or scheduled. These are the next things worth doing, most useful first. Ask the owner before any of them
changes how the page sounds.

1. **See the hosted version run for real.** Deployed on 10 Nov (live at 11:38 at `live-culture.adamthabo.workers.dev`), but not yet
   seen working against the real sources: this session cannot open workers.dev. Ask him for a screenshot of each world, or open it
   from a session that can: check every source arrives (the readouts give each one's time), which cameras are on the air, how the
   real clouds and rain look; fix what the stand-ins could not show. Updates go to the `live-culture` repository Cloudflare made for
   him (each push deploys; its check run says whether it went live). Never push into the repository of his trading app for this.
2. **A level editor, and more levels.** 24 levels since 12 Nov, each checked by `t_design.js` as a 60-frame phone runs it. What did
   not work (try none again without a new idea): two jets head on (their rising plume fills rings beside it), a ring anywhere above a
   jet (smoke rises into it), a vertical jet crossing a horizontal one when the ring is up the way it pushes (it acts as a ramp), a
   fixed fan more than a tenth of the tank from the jet it should bend (too weak by then), and sheltering a jet from a fixed fan near
   enough to bend it (a lid or a fence between them sends the fan's flow round its ends into the jet; a fan blowing back makes a
   wall of water the jet cannot pass; a slanted wall above the bent jet lets it round its end), an intruder of a colour near the ring's
   (green in a cyan ring, violet in a green one, amber in a rose one: mixed in, the ring still takes it for its own), smoke led along
   a slope or trapped under a shelf (too faint). What works: a jet turned by a wall at a slant, pushed by a fan close by, stopped by
   a lid; prisms and tunnels (they do exactly what they say); a drain on a jet (since 12 Nov a drain in a level swallows the jet's push
   as well as its ink, so the jet stops there). An editor in the sandbox could save a level to the store and share it.
3. **Hear it and hold it.** The two things no machine test covers: every voice by ear, and every world on a real iPhone
   (frame rate in Wind and Orbit above all, the first touch starting the band with the ring switch on silent, whether a first stroke
   leaves the sound waiting for a tap as expected, the card's size).
4. **Weather, next.** Done on the site (12 Nov): the model's jet streams, temperature, pressure, waves; clouds and rain drifting with
   the wind; the place card (Open-Meteo, RainViewer); storms up close. Next: the weather fronts (NOAA's coded surface analysis), the
   official forecast tracks and cones of the storms (NHC, JTWC, GDACS), the geostationary satellites' ten-minute infrared for the
   clouds, the model's hours ahead (play the next two days). For the artifact: nothing of this can reach it unless a copy of the data
   is kept on GitHub by a job in his repository: ask him first (it would run on a schedule on his account).
5. **Keep the artifact's data fresh.** Only if he asks: a scheduled task that runs the refresh in README.md. The wind changes every
   6 hours; four runs a day is about what his plan can spare (a night of hourly runs once hit his limit).
6. **More in Orbit.** The hundred brightest objects (mostly spent rocket stages, not in the active list); a ring on the ground under
   a chosen satellite; the Moon at its true place far out; passes over a place he names.
7. **Video as ink.** A clip from his camera roll through the file picker (allowed in the artifact) playing as the ink in Smoke.
8. **Record a loop.** Save one four-bar loop of a world as video (the `downloads` capability takes mp4 and webm).
