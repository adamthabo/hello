# Changelog

## For the owner
13 Nov 2026, after "Some is good, I like the videos and I like the weather, but is it real? Put them all on the same globe as
satélites and make that just a layer. Make a music dj mixer page ... And then make the smoke game clearer and work better. The game
should also be harder and more fun" and your choices (a clip grid like Ableton, two decks and a crossfader, drum pads, effects; too
much smoke made the rings too easy; tougher puzzles, moving parts, limited smoke; the cameras in a window over the globe):

- **One Earth.** Wind and Orbit are one world now, Earth: the weather, the satellites and (on your site) the cameras are layers of
  the same globe, switched along the bottom. Tap a camera's ring and its stream opens in a window over the globe (tap the window to
  make it bigger, swipe it for the next camera, its cross closes it); tap a satellite for its card; tap a place for its weather.
- **Mix, a new world.** The band and 300 more sounds (16 drum kits, 16 tuned instruments, all struck, all made on the phone) as two
  decks of loops in a grid like Ableton's clips: tap a loop and it comes in on the next bar. Each deck has its pitch, nudges and
  sync; a crossfader between them; 16 pads to play, and to record into a loop that keeps playing; effects to sweep with a finger
  (filter and echo), a stutter to hold, a brake. Nothing on it can play louder than the band (measured).
- **Smoke, harder and clearer.** In a level the smoke now waits for you to build, then you let it go, and the tank runs dry after a
  few seconds: if the rings are not full by then, change something and let it go again. Each jet carries about half the smoke it did
  and a ring fills only with a jet streaming through it. Walls now turn the smoke along them instead of swallowing it. One source sweeps
  to and fro, and some rings drift. All 24 levels are new, each ring placed where the smoke really goes with the solution and not
  without it. Three stars now also want a third of the tank left.
- **Is it real?** On your site, yes: the cameras are live YouTube streams; the wind, jet streams, temperature, pressure, waves,
  lightning and aurora come from NOAA as each is published (the wind every 6 hours, the lightning every few minutes); the clouds
  from EUMETSAT every 3 hours; the rain from NASA about four hours behind; the fires from NASA's satellites; the radar from
  RainViewer; the satellites from their latest published orbits. The artifact is a snapshot of 10 Nov.

Tested by machine. Not seen from here: the real cameras, and how the mixer sounds through a phone's speaker.

12 Nov 2026, evening, after "Make this so much better!! The smoke game needs to be better the videos need to be better, the
weather needs to be better" and your choices (lots of levels; every camera playing, full screen, better places, many more; live
clouds and rain, any place up close, dramatic storms, more layers; artifact and site both):

- **Smoke is a game of 24 levels.** Six chapters, each bringing a new piece: walls, fans, prisms (smoke that passes through takes
  their colour), drains, tunnels (smoke goes in one end and out the other), then all of them together. Up to three stars a level for
  using the fewest pieces. The levels button opens a map of all 24; each opens when the one before is solved, and every third one
  brings a player into the band, the guitar with the last. Every level is now checked as a phone really runs it: the old first
  puzzle would have filled its ring by itself on an iPhone (the smoke lasts longer there than in the test browser), now none does.
- **The videos fill the screen** (on your site), 86 cameras in eight themes: animals, volcanoes, space, cities, the sea, night skies,
  mountains, things that move. Swipe for the next; the small Earth in the corner opens a map of every camera in the theme. Only
  cameras on the air are shown, and when a camera's stream has moved, the site finds the new one by searching YouTube.
- **The weather** (on your site): new layers from NOAA's weather model: the jet streams ten kilometres up, the temperature, the
  pressure with its highs and lows, the height of the waves. The clouds and the rain drift with the real wind. Tap any place for its
  card: the weather there now, the next 24 hours, three days, and the last hour of rain radar. Tap a storm and the Earth flies to it:
  its spiral turning the way it turns, as wide as it is strong, and where its motion is carrying it. In the artifact a tapped place
  now gets its name (the nearest town) and storms can be seen up close too; the layers, forecast, radar and cameras need the site,
  since an artifact cannot reach weather services or video.

Tested by machine. Not seen from here: the real cameras, the real radar and forecast, and the real weather model's files (only a
sample of the same format).

## 13 Nov 2026: one Earth, Mix, Smoke's tank and new walls
- Worlds: `smoke`, `earth`, `mix` (`WORLDS` in `20-ui.js`; `OLDHASH` sends `#wind`, `#orbit`, `#live` to the Earth and `#drift`,
  `#loom`, `#bloom`, `#band` to Smoke). The "Now" chip is gone with Orbit's world. A world may take the circles' taps (`CUR.dot`).
- `12-wind.js` is the Earth: its layers `LYK` are `sats cams wind jet heat pressure waves clouds rain sun` (`LYN`, `LYI`; the row
  scrolls when it is wider than the phone); it runs `ORBIT.layer` and, in the hosted build, `LIVEW.layer`; a tap goes to a camera's
  ring, then a satellite (20 px), then a storm or a fire, then the place; `flyTo` turns the Earth to a camera; zoom 0.16 to 3.2 (out to
  the geostationary ring); the footer's height is measured every frame (`footH`) so the stage never runs under a row that has grown.
- `13-orbit.js` `layer`: `LAY` dims the satellites over the weather (brightness 0.42, size 0.8, trails 0.32); `clock` keeps them in
  the present. `14-live.js` is a layer with a window (`winGeo`: bottom right, 58% of the stage's width; a tap: across the stage; a
  swipe across: east or west; its cross: closed); `body.camw` hides the full-screen video's shading.
- `15-mixsnd.js` (`MIXS`) and `16-mix.js` (`MIX`, `MIXON`): see README, Architecture. `03-audio.js`: `stemsStart` stands aside while
  the mixer has the band. `t_levels.js` measures the mixer (`MIX.offline`). The decks' sync is a nudge whose end is set on the
  players' own speed (`ne`, `settle`), so the beat it lands on is exact however late the page's timers run.
- `11-drift.js`: in a level the smoke waits for the release button (`go`, `release`, `stopRun`; `RUN`, `TANK`, `TANK0` from the level's
  `tank`, `RT`, `EMPTYT`, `OUTT`): sources breathe only while it runs and the tank holds smoke; 2.5 s after it runs dry the run ends,
  the rings empty and the readout says so. Built fans, drains and tunnels stand still until the release. `LP`: `ink` 0.07 (was 0.14),
  `fk` 4, `f0` 0.04. Moving parts: a source's sweep (`src[5]` degrees, `src[6]` seconds), a ring's drift (`cups[3..5]`), a fixed fan
  by turns (`wind[4]` on, `wind[5]` off; no level uses it: a fan blowing by turns let the jet straighten and fill the ring between gusts), all on the run's own clock (`moveParts`, `windOn`). Stars: `starsFor(n, par, left)`. Walls:
  the pressure sees them (`div`, `prs`, `grad` read `uObs`), and advection across one keeps what the place had instead of nothing.
  Test hooks: `release`, `stop`, `scan`, `rec`, `recGet`, `nodraw`. The hand is hidden in a level (it moved the water, never the ink).
- `tools/t_place.js`, `tools/place_rings.py`, `tools/set_levels.py`: placing rings by measurement (README, Architecture).
- Tests: `t_play.js` (Earth and Mix with real touches), `t_hosted.js` (the cameras' layer and window), `t_published.js`, `t_misc.js`,
  `t_gov.js` (the paced world is Mix now), `t_smoke.js` (release, the tank, running dry).

## 12 Nov 2026: Smoke's levels, Live full screen, the weather model
- `11-drift.js`: `LEVELS` 24 in `CH` chapters; the tank `B` (aspect 0.64) with `bx`/`by`, `KS`/`KR`/`KP` scaling speeds and sizes;
  level water `LP` (buoyancy 0.3, fading 0.6 and 0.8 a second by the water's own time); prisms (`tint` pass), tunnels (`tun` pass, a
  pull and a push); `STARS` in `localStorage` `lc.smoke.stars`; the map (`pathNodes`, `pathDraw`, `pathTap`, "play freely");
  `JOIN` every third level; test hooks `setLevels`, `fixdt`, `phys`, `fastdye`, `path`, `pathNodes`, `stars`, `put` for every piece.
  A drain in a level also stops the water (`snk` mode 3, the velocity damped where the drain eats ink). Fixed walls drawn 18 px
  thick into the obstacle grid, the tank's 14 (built walls stay 10): a jet pressing on a thin one seeped through it.
- Wind and Orbit: a finger down up to 600 ms (was 320) and not moved is a tap, so a slow frame passing the lifting on late does not
  turn a tap into nothing (the hints' ghost fingers keep 320). `t_play.js`: the reading may start with the nearest town; the pinch
  starts from the whole Earth (a storm tapped just before brings it close). `t_hosted.js`: the map is opened where stand-in cameras
  are on the air and tapped once it is at rest. `sh tools/check.sh all` passes but for one check, and that one is the data: the
  snapshot in `data/` is still 10 Nov's (this update did not refresh it), so the space station's orbit is days old, not hours.
- `tools/t_design.js` plays levels from a file as a 60-frame phone; `t_smoke.js` rewritten for the map, stars and new pieces.
- `08-grib.js` GRIB2 reader, checked against ecCodes by `tools/t_grib.js` (`g2ref.py`, `g2ref2.py` make the reference; pygrib's
  sample files). `09-cities.js` from Natural Earth by `tools/gen_cities.py`.
- `06-live.js`: `WX`, `wxGet` (`/api/gfs/<field>`), `highsLows`. `07-globe.js`: `uWx` (temperature, waves, isobars), `uWindF` (the
  clouds and rain drift by a two-phase flow along the wind). `12-wind.js`: eight layers (`LYK`), `wxBuild` (`isobars`: marching
  squares on a canvas), the place card (`placeCard`, `cardDraw`, `chart24`, `radarDraw`), storms up close (`FOC`, spirals, the
  motion line), place names.
- `14-live.js` rewritten: the video fills the screen (cover, a slow look across held upright), the Earth in a clipped corner window
  (`body.livev #gl` `clip-path`), the map (`mapOpen`), themes (`#themes`), `/api/live` eight at a time, a stream that will not play
  passed over after twelve seconds.
- `worker.js`: 86 `CAMS` with themes `t` and searches `s`; `ytNow` checks embedding, searches what is live (`ytSearch`, `NOT`), shares
  a fetch budget; `/api/live`, `/api/gfs/<field>` (`gfsField`: index, byte range, S3 then NOMADS), `/api/wx`, feed `radar`.
- `hostmock.mjs` fakes YouTube search, GFS (`mkgfs.py`), Open-Meteo and RainViewer; `t_hosted.js` checks all of it.

## For the owner (10 Nov, 13:30)
10 Nov 2026, 13:30, after "More more more!!!! ... I want the satellites animated in orbit. I want many many more videos" and your
choice of "Real time, flowing trails":

- **The satellites stream round the Earth.** Each one keeps its real place this second and now has a trail of its last nine minutes,
  with light running along it towards the satellite, so the whole swarm visibly flows in its orbits. Pinch in to see them close.
  The ×60 chip still makes them fly.
- **29 live cameras instead of 10** (on your Cloudflare site): Kilauea, Vancouver, Las Vegas, Jackson Hole, Satellite Beach, Times
  Square, planes over Maho Beach, Rio's Christ the Redeemer, Amsterdam, Venice, St Peter's in Rome, Etna, two more African waterholes,
  the northern lights in Lapland, Singapore, Hong Kong, Sydney Harbour and Auckland join the ten from before. Swipe to go round the
  world west to east, or tap a mark on the globe. A camera that is off the air is passed over.

Tested by machine only: the cameras could not be watched from here.

## 10 Nov 2026, 13:30: satellite trails, 29 cameras
- `13-orbit.js`: trails. Each body has `2*TN` entries (`TN`=4 pieces) in the list the chip solves, `k` running 0 at the body to 1
  at the far end, drawn as lines by `TVS`/`TFS` (from `VS` with one Kepler step fewer; `TFS` fades the trail and runs a band of light
  towards the body, phase `uPh`, held still under reduced motion). Nine minutes long in real time, fourteen at speed. The bodies are
  drawn from a list of their own (`HB`, `satH`): reading every eighth entry would need a stride over WebGL's limit of 255 bytes.
  (Drawing copies with `ANGLE_instanced_arrays` was tried first: the headless browser drew Orbit at 2 frames a second, against 8 now
  and 13 without trails.) "Now" returns to the present over a fixed second and a half of the clock (`ret={t0,from}`), not by frames.
- `worker.js`: `CAMS` from 10 to 29, west to east; `c` may be a channel's UC id as well as a handle. `t_hosted.js` expects 25 or more.

## For the owner (12:50)
10 Nov 2026, early afternoon, after "I have no idea what any of that first page does. Makes no sense." and "There nothing there yet!":

- **Smoke says what it is.** The line at the top now reads "real smoke, worked out as it moves: push it with a finger, tap for a
  drop", then "build walls, fans and drains with the tools below, or play the puzzles". The tools moved from the right-hand edge to
  a row along the bottom, each with its name: hand, wall, fan, drain, puzzles, again.
- **Each puzzle says what to do:** which puzzle it is, "fill each ring with smoke of its colour", a one-line clue, how full each ring
  is, and what you can still build.
- **The puzzles are real puzzles now.** The first one solved itself within a second (its smoke blew straight into its ring), and
  smoke leaked through walls. Walls now hold, and a ring fills only while smoke of its colour, and nothing else, streams through it.
  Every puzzle was played here with nothing built (no ring fills) and with a solution (every ring fills). Five passed; the two that
  could not be made fair were taken out, so solving a puzzle now brings one or two players in, the guitar still last.
- **Your Cloudflare site is up.** The first build after the Deploy button never reported back; a fresh one, started by a push to
  `adamthabo/live-culture`, went live at 11:38. This update is there too.

Tested by machine only.

## 10 Nov 2026, early afternoon: Smoke in plain words, walls that hold, five puzzles that need building
- Smoke's readout (`hud` in `11-drift.js`): outside the puzzles it says what the world is and what a finger does; in a puzzle: which
  puzzle and the goal, its clue (`LEVELS[i].tip`), each ring's fill, what can still be built; on solving, who joins.
- `#tools` moved from the right-hand edge into the footer (`body.html`, `style.css`): a row of labelled pills like Wind's `#lyr`
  (hand, wall, fan, drain, puzzles, again), tight enough for five on a phone. `toolsSync` measures the stage again when the row
  changes height. Fans built in a puzzle are drawn plain (they breathe no ink there).
- Walls hold: the advection pass (`adv`) reads the wall grid (`uObs`) and carries nothing across a wall. A jet moves up to 17 pixels
  a step and used to jump the 10-pixel walls, so smoke leaked through shelves.
- Rings: filled by the water's own time (`simT`), not the clock's (a slow phone or the headless browser filled them faster than the
  smoke moved), at `FILLK*(match - FILL0)` = `8*(match - .025)` a second, so a stream fills a ring in 1 to 8 seconds and drift empties
  it; judged by the colour of everything in the ring taken together (`sample`), so another colour in it spoils it and a white ring
  takes cyan and amber in streaks. Drains swallow more (most of a jet that passes over one).
- Puzzles, remade around the jets (smoke that only drifts is too faint to carry far): 1 a jet blowing past its ring, turned up by a
  wall; 2 a column rising beside its ring, pushed over by a fan; 3 a jet over a low ring, sent down by a fan; 4 a jet pushed off its
  ring by another rising across it, which a lid stops; 5 two columns brought together by two fans into a white ring. `JOIN` gives
  players in ones and twos: shekere; djembe; talking drum and agogo; balafon and kora; electric guitar.
- `tools/t_puzzles.js` (new, slow, not in `check.sh`): every puzzle with nothing built fills no ring, and with its solution
  (`LEVELS[i].sol`) fills every ring. `t_smoke.js` builds puzzle 1's solution with real touches. Test hooks: `levels`, `put`,
  `nowin`, `trace`. The design trials and what failed are in `ROADMAP.md`.
- The Cloudflare copy: `wrangler.toml` says `workers_dev = true`; its README says what to do when the address shows "There is
  nothing here yet".

## For the owner (earlier)
10 Nov 2026, late morning, after "needs to be more realistic ... Real time. That's the most important part":

- **Real time lives on your Cloudflare.** A Claude artifact cannot fetch anything live, so the live version is the same site served
  from your own Worker: one tap on the Deploy button in `adamthabo/hello/live-culture`. There the satellites' orbits, the wind, the
  clouds, the rain, the aurora, the lightning, the fires and the storms are read as they change, and a fourth world, **Live**, shows
  camera streams from interesting places in a window over the Earth.
- **The satellites are in real time** in both: Orbit opens on the present, second for second. Turning two fingers still winds time;
  the chip brings it back.
- **Wind has layers you can switch:** wind, clouds, rain, sun. (Clouds and rain only on the live version.)
- **Smoke is a game now.** The smoke rises. At the right edge: walls, fans, drains, and seven puzzles: each source breathes coloured
  smoke, each cup wants its colour; build to fill them. Every puzzle solved brings one more player into the band, the guitar last.
  Two fingers turning make a whirlpool.

Tested by machine only (here, the live sources and YouTube were played by stand-ins).

## 10 Nov 2026, late morning: real-time Orbit, Wind's layers, Smoke's machine and puzzles, the hosted version
- Orbit: `want=1` from the start; the two-finger turn no longer switches to x60; the hint is one finger turning the Earth; the chip
  reads "Now" whenever the view is not the present and "×60" when it is.
- Wind: `#lyr` row (`lyrBuild`, `lyrSync` in `12-wind.js`): wind, clouds, rain, sun; a switch shows only where its layer has data.
  `07-globe.js`: clouds (`uCld`), rain (`uRain`, NASA IMERG colours), the Sun's layer (`uSunK`: warm light on clear sunlit ground, the
  subsolar point, the 6, 12 and 18 degree dusk lines). With clouds on, the Earth is brighter and the wind's smoke lighter.
- Smoke (`11-drift.js`): buoyancy pass (`buo`); walls as an obstacle grid (`obs`, drawn from segments with round ends) masking the
  water and the ink (`msk`); fans (continuous pushes, ink outside puzzles); drains and whirlpools (`snk`); two-finger turning and
  pinching; seven puzzles (`LEVELS`), cups measured by reading the ink back small (`readBack`, `sample`), filled by matching colour;
  the band thins to two players in a puzzle and gains one per puzzle solved (`JOIN`), the band's own stirring is left out of puzzles,
  smoke carries further there; `#tools` column; progress kept in `localStorage`. `tools/t_smoke.js` added to the suite.
- Hosted version: `HOSTED` flag in `build.py` (`hosted/index.html`), `livePull()` and the raw-format parsers in `06-live.js`,
  `14-live.js` (Live world), `ORBIT.above()` and `ORBIT.iss()`, `cf/live-culture/worker.js` (relay, cameras, stream finder),
  `tools/hostmock.mjs` and `tools/t_hosted.js`. Pushed to `adamthabo/hello` (`live-culture/`) with a Deploy to Cloudflare button.

## 10 Nov 2026, morning: three worlds, the music as circles, the satellite card, fires and storms
- Removed: the Bloom world and the Band world (kept as `dev/archive/world-bloom.js`, `world-band.js`), the music switch. Old links
  `#bloom`, `#band`, `#loom`, `#drift` land on Smoke. Keys 1-3.
- Music: `#dotrow` in the footer of every world: `#bSound` (a note: the whole band; lit only while the sound runs) and nine player
  circles (`#dots`), dimmed while the music is off; a circle touched while off turns the music on with that player in. Every world's
  line-up is all nine. Smoke's hint now opens with a tap (the iPhone starts sound on a tap only).
- Wind: the finger smoke and its splat shader are gone. One finger turns (with coasting); a tap reads the place (`reading()`,
  three lines); two fingers slide and pinch. Fires (NASA FIRMS, `LIVE.fires`): embers over the globe and GL points drawn into the dye
  picture every frame, so the real wind carries their smoke. Storms (`LIVE.storms`, NOAA NHC and GDACS): a small turning wheel at
  each eye (anticlockwise north of the equator), its name beside it. A tap goes to a storm or a fire under the finger first.
  The readout counts the fires and names the storms.
- Orbit: the satellite card (`#card`): catalogue number, designator, launch, owner, site, status, type, perigee and apogee, tilt,
  period, now over (live), light (live), radar cross-section, standard magnitude, downlinks, epoch age. Catalogue from
  `data/satinfo.json` (new, read at the first tap). The Earth moves up for the card on a phone, left of it on a wide or turned screen.
- Data: `feed.py` fetches all 52 satvisor groups, 8 astrion groups and two more copies of the active list, the SATCAT, SatNOGS
  transmitters, standard magnitudes, the FIRMS fire list, NHC and GDACS storms. `gen_live.py` keeps each satellite's newest element
  set from any file and drops decayed objects; packs fires (10 bytes each) and storms (a short list). The space station's orbit
  was 15 days old in v14 (the active list it came from was stale); now under a day.
- Tests: `t_first`, `t_play` (Smoke; Wind turn, tap, fire, storm, pinch, lightning; Orbit card and its fit; the music circles),
  `t_misc` (fires and storms through the store, names cleaned; card fits at 360 x 640 and turned; circles big enough for a finger),
  `t_lock`, `t_gov`, `t_published` updated. All pass; levels unchanged (`LEVELS PASSED`, ten fingers 3.4 dB under the band).

## 9 Nov 2026, 22:15 ET: no harp, no universe, no earthquakes; the wind as smoke, every satellite, the aurora, lightning
Asked for (20:28 ET, after seeing the rebuild): "Some of this is excellent some not so much. The live data is useless, give me
something else, like live video feeds. Make this much more interesting. Harp is stupid. Smoke is cool, universe is meh. Can you
give me live satellite data? Keep working; you're getting there."
- Removed: Loom (the harp) and its plucked-string voice; the solar system; the earthquakes, their score and the single station.
- Drift renamed Smoke, his word for it. Old links land: #drift on Smoke, #earth on Wind, #loom on Bloom.
- New world Wind: NOAA GFS 10 m wind (run of 9 Nov 18:00 UTC) drives smoke over the globe; NOAA's OVATION aurora; GOES GLM
  lightning of the last half hour replayed over sixteen bars. One finger draws smoke into the real wind.
- New Orbit: 15,902 active satellites and 2,673 pieces of wreckage from their CelesTrak elements, solved in the vertex shader
  every frame; tails drawn as seen from the turning Earth; time x60 or the present; tap for a name.
- The globe moved to its own module (`07-globe.js`) with a smoke layer and an aurora layer; data handling to `06-live.js`.
- Data: `data/live.json` beside the page (914 KB), four store documents and a stamp for refreshes (none written yet: the page
  uses the file until a newer stamp appears). The old `feeds/quakes` and `feeds/iss` documents are still in the store, unused.
- Found on the way: this shell reaches only GitHub, so every feed is a public GitHub mirror (four found with the search API,
  listed in README); `git ls-tree -l` on a blobless clone fetches every blob one by one and must not be used.
- Said plainly to him: live video and the camera cannot work inside the artifact; it needs his own host. Offered, not done.
- Tested by machine: all five worlds at phone and desktop size; real multi-touch in each (draw, turn, pinch, wind time, tap a
  satellite, the Now button both ways); loudness; an older chip without half-float textures; a lost graphics context; reduced
  motion; a newer and a broken wind arriving through the store; old links; small phone; landscape; the held-back sound of an iPhone.
- Not tested: a real iPhone; any sound by ear.

## 9 Nov 2026, 18:45 ET: the first touch on an iPhone, and a switch that only says what can be heard
Not asked for; found while checking the published page. iOS starts no sound on a stroke, only on a plain tap, and Bloom (the
opening world) invites a stroke: its hint was one finger stroking. On his phone the likely first minute was light and silence under
a switch reading On, and a tap on that switch would have turned the music off: the state he called "confusing" on his portfolio site.
- The switch now reads On only while the sound is really running, and a touch on it does what it shows.
- The switch no longer pulses while the band loads (he asked for "the toggle twitch" to go on the portfolio site).
- While the music is asked for and held back, a ghost finger taps the middle of the world, wordlessly; it stops after four taps that free nothing.
- Bloom's hint opens with three taps (three rings of light) before its stroke.
- A ghost finger no longer stops the globe in Earth.
- New: `tools/t_lock.js` (a phone that holds the sound back), `tools/t_published.js` (the published bytes, used with no test hook).
- Feed refreshed to 9 Nov 23:36 UTC, in the page and in its store.
- Not tested: a real iPhone. The rule about strokes is WebKit's long-standing behaviour as I know it, not something measured here.

## 9 Nov 2026, evening ET: rebuilt from nothing
Asked for: "completely reshape what it does and how it behaves"; a playground with "images, sounds, music, dynamic live real
data, interactive interactions, gestural ideas"; and no more "loud trumpet noises".
- Reviewed every earlier request and log for this project first; the standing rules are in README.md.
- Audit of the old page: the saxophone played from three places (an automatic riff, on by default; every string pluck; every
  touch of the plate), straight into the output at up to +12 dB over the band. Removed with its eleven sample files. The horn
  stem (old player 8) removed from the band; its file is archived under `dev/archive/`, not loaded by anything.
- New page: one WebGL canvas and one 2D overlay shared by six worlds; a pointer layer for up to ten fingers with two-finger
  pinch and turn; wordless ghost-finger hints; per-world line-ups of the same band; deep links; keys.
- New touch voices, all computed (no samples, no oscillators): struck glass, kalimba, wooden bar, singing bowl, plucked
  string (Karplus-Strong, tuned within a cent), low skin drum, clay pot, shaker. One bus, one ceiling, measured.
- Real data: 5,044 stars and the constellation figures (XHIP via d3-celestial); planets, Moon, Sun from the clock (checked
  against astronomy-engine); NASA Blue Marble, city lights, relief and water; USGS M4.5+ week; the station from its TLE
  (checked against SGP4). The feed can be refreshed through the page's store without republishing.
- Tested by machine: every world at phone, small phone, landscape and desktop sizes; real multi-touch play in each; loudness
  through the page's actual signal path; a photo in Bloom and Drift; no half-float textures; a lost and restored graphics
  context; reduced motion; the viewer's save and store paths (mocked); 45 s unattended; the sound stopping when the page is put away;
  the governor on a slow machine and on a throttled one. Screenshots judged by eye.
- Not tested: a real iPhone; any sound by ear.
- Carried over from the page it replaces, after reading that page line by line: the frame governor (no judging before the first
  touch, trial steps, quality given back when the system sets the pace), a photo picker that accepts files with no stated type,
  a mouse button released outside the page, key-repeat guards, time-stamped names for saved pictures. The band's mixer was
  checked against it value by value: identical apart from the horn channel.
- Found and fixed on the way: a browser compressor adds about 14 dB of make-up gain (the first ceiling made the voices
  louder, not quieter); particles with inertia get flung out of a stirred region and leave holes (they now ride a
  divergence-free flow); ink added without limit burns to white; the plucked string was 6 to 23 cents sharp.

## Before the rebuild (6 to 8 Nov 2026), in brief
A "plate" picture developed by ten players through ten shader processes inside a window between two strings; a dark culture
around it; a flyable universe; touch modes; a data strip. Owner decisions from those days that still hold: no tiles; the
electronic look, not the organic one; taps play live, no looping; touch tones and on-screen rhythm were missed when lost;
the band untouched; "a universe" and "many modes for the music: sophisticated, tech"; "organic technology meets bioluminescence".
