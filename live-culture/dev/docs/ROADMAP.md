# Roadmap

Nothing here is promised or scheduled. These are the next things worth doing, most useful first. Ask the owner before any of them
changes how the page sounds.

1. **See the hosted version run for real.** Deployed on 10 Nov (live at 11:38 at `live-culture.adamthabo.workers.dev`), but not yet
   seen working against the real sources: this session cannot open workers.dev. Ask him for a screenshot of each world, or open it
   from a session that can: check every source arrives (the readouts give each one's time), which cameras are on the air, how the
   real clouds and rain look; fix what the stand-ins could not show. Updates go to the `live-culture` repository Cloudflare made for
   him (each push deploys; its check run says whether it went live). Never push into the repository of his trading app for this.
2. **Smoke's game, next.** Since 13 Nov (night) it is the push game (rule 16), tuned on 14 Nov by measurement as a phone at sixty
   frames a second runs it (`fixdt`): a bot pushing from the side of the plume fills a ring in two to nine seconds; nobody touching
   fills none. Worth watching: whether a person finds round 1 too easy or too hard (`gmPlan`: rings, seconds, ring size), whether the
   held finger's blowing feels right, how a phone at thirty frames a second plays it. Ideas, only if he wants more: a ring that moves
   along a path, two rings at once of two colours, a short combo for rings filled quickly. (The 24 set-ups of 13 Nov, their tools and
   what was learnt making them are in the artifact's version 28 and this file's history.)
3. **Hear it and hold it.** The two things no machine test covers: every voice by ear, and every world on a real iPhone
   (frame rate in Wind and Orbit above all, the first touch starting the band with the ring switch on silent, whether a first stroke
   leaves the sound waiting for a tap as expected, the card's size).
4. **Weather, next.** Done on the site: the model's temperature, pressure, waves (12 Nov; taken away 14 Nov afternoon, back the same
   night as layers in a row of buttons, rule 20, and since then the model's forecast for this hour); NOAA's live view (GOES-19 and
   GOES-18 every ten minutes, laid on the globe, 14 Nov night); the wind's speed in colour; clouds and rain drifting with the wind; the
   place card (Open-Meteo, RainViewer); storms up close. A new layer is a button in the row and must show itself the moment it is
   pressed. Next: the rest of the world live too (Himawari over Asia and Australia, Meteosat over Europe, Africa and the Indian Ocean,
   laid on the same way), NOAA's radar mosaic and warnings over the United States, the weather fronts (NOAA's coded surface analysis),
   the official forecast tracks and cones of the storms (NHC, JTWC, GDACS), the model's hours ahead (play the next two days), the GOES
   loops of the last hours as videos. For the artifact: nothing of this can reach it unless a copy of the data
   is kept on GitHub by a job in his repository: ask him first (it would run on a schedule on his account).
5. **The modes, next (15 Nov).** Hear each by ear on a phone (the acid filter's bite, the dub echo's tail, the shuffle's feel, the
   balance of each band; every level was set by measurement only). If he wants more: a sixth mode, a second set of loops a mode moves
   to every eight bars, the band's own players reworked for a mode (an echo on the talking drum in dub) — ask before touching the band.
5b. **The zones, next (15 Nov, night).** Keep `data/zones.json` true: wars end and start, shutdowns lift (re-check `WAR` and `DARK` in
   `tools/gen_zones.py` before each publish, README "Live data"). Check on the site that IODA's summary has the shape the Worker
   expects (`data[].entity.code`, `data[].scores.overall`; the mock is made up in that shape): if not, nothing is marked and nothing
   breaks. See whether the sixteen new city cameras find streams (`/api/live?ids=moscow,beijing,...`) and drop those that never do.
6. **Keep the artifact's data fresh.** Only if he asks: a scheduled task that runs the refresh in README.md. The wind changes every
   6 hours; four runs a day is about what his plan can spare (a night of hourly runs once hit his limit).
6. **More on the Earth.** The hundred brightest objects (mostly spent rocket stages, not in the active list); a ring on the ground
   under a chosen satellite; the Moon at its true place far out; passes over a place he names; winding time again (it went with
   Orbit's own world on 13 Nov), if he misses it.
9. **Mix, next.** Since 13 Nov (night) a list: the band's nine and ten recorded instruments (VCSL, CC0), two loops each, written on
   the band's chords (Em7, A7) and swing, and "jam" (14 Nov). Do not bring back knobs, decks or pads unless he asks. Worth doing: hear
   it (no ear has); a third loop for the instruments he uses most; more of VCSL's struck instruments if he wants them (steel drum,
   handbells, tabla, frame drums; never the kalimbas: their other tines ring out of key when a note is moved). Any new loop: its notes
   on the chord of its bar (measure them as on 13 Nov), and `t_levels.js` with it alone and with everything.
10. **The cameras, for real.** Since 14 Nov the window is big and takes taps; whether YouTube plays in it on his iPhone, from the
   Worker's lookups, could not be seen from here. Ask him what he sees; if YouTube refuses the Worker (a consent or "not a bot" page),
   the lookups need another way (the channels' own pages, or a list kept fresh by hand).
7. **Video as ink.** A clip from his camera roll through the file picker (allowed in the artifact) playing as the ink in Smoke.
8. **Record a loop.** Save one four-bar loop of a world as video (the `downloads` capability takes mp4 and webm).
