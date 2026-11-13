# Live Culture: working notes

Live Culture is a published Claude artifact: three worlds to play in (Smoke, Earth, Mix), with one band playing under all of them,
and the same page served live from the owner's own Cloudflare Worker, where it reads every source as it changes and the Earth has one
more layer, live cameras. It was rebuilt from nothing on 9 Nov 2026 after the owner said he hated the previous version, reshaped
the same evening after his first look, three times more on 10 Nov, on 12 Nov and on 13 Nov (his words are under "Hard rules").

Artifact: https://claude.ai/artifact/PCzaFJH2vjXe4Kv8KK4Xic (publish to this URL only; never make a second artifact)

## Hard rules (from the owner, in his words where quoted; do not bend them)

1. **No horns. No saxophone. No trumpet-like, blown, bowed or held sound of any kind. Nothing loud. No harp.**
   "I HATE the loud trumpet noises and I don't know how many times I've told you that." Earlier: "remove the annoying horn
   sounds you've added when you touch the screen", and no "whiny synth sounds". And of the first rebuild: "Harp is stupid."
   The saxophone samples are deleted from the artifact. The band's horn stem is out of the page (kept only as
   `dev/archive/band-horns-stem.mp3` in case he ever asks for it back; do not bring it back otherwise). The harp world (Loom)
   and its plucked-string voice are deleted; do not bring back a harp or anything harp-like.
   Everything a hand plays is struck and dies away. No tone is made by an oscillator.
   `node tools/t_levels.js` must print `LEVELS PASSED` before any publish that touches sound: nothing a hand can play, not
   even ten fingers hammering every voice at once, may come out as loud as the band. See "Sound levels" below.
2. **The band is his.** Nine recorded stems, their gains `SG`, the mixer chain, the master `OUTG=.3`, the loop, the build-up
   from two players to nine with the electric guitar last, and "on with the first touch": exactly as on the original site
   (he listened and said "make it exactly the same"). Every world now has all nine; who plays is the visitor's choice on the row of
   circles. Nothing ever changes a level.
3. **Nothing about him.** No name, no biography, no photos of his, no project categories, no links to his sites. Pictures are
   made here, are public data (NASA, the star catalogue), or are the viewer's own photo, which never leaves the device.
4. **No tiles, no grids of image blocks.** He prefers the electronic look (thin light on black, condensed type, small mono
   readouts). An organic restyle (serif type, pebble buttons) was tried once and rejected: do not retry it.
5. **Few controls, each with its name, and one plain line saying what a world is.** This rule first said "no words of
   instruction" and left a ghost finger to show what to do. His fourth look (10 Nov, 11:15) overruled that: "I have no idea what
   any of that first page does. Makes no sense." So every tool carries its name (Smoke: hand, wall, fan, drain, puzzles, again),
   and the readout of a world opens with one plain line of what it is and what a finger does there ("real smoke, worked out as it
   moves: push it with a finger, tap for a drop"); a puzzle's readout says what to do and how far along it is. Then facts (counts,
   places, times). Keep the words few and plain: no paragraphs, no pop-ups, no tour. The ghost finger still shows the first touch.
   **The music is a row of small circles, not a switch.** Of the switch and the Band world he said (10 Nov) "I don't particularly
   like the music interface"; on his portfolio site he had asked for little track circles and called a toggle confusing. So: one
   note for the whole band, then nine circles, one a player. The note never moves by itself and is never lit over silence; while
   the music is off the nine are dimmed, and touching one turns the music on with that player in it.
6. **It must work on his iPhone,** in the Claude app. Test at phone size; keep per-frame work bounded; respect the governor `QL`.
7. **Never the "↗" arrow** (or any external-link icon) on anything.
8. **Never publish a broken page.** `sh tools/check.sh all` must end with `ALL CHECKS PASSED`.
9. **Real data must be something that moves and that a hand can play with, never a readout.** Of the first rebuild (a week of
   earthquakes as dots and a score, the planets, the space station) he said: "The live data is useless, give me something else,
   like live video feeds", "universe is meh", "Can you give me live satellite data?", and "Smoke is cool" (his word for the
   fluid world, which is why it is called Smoke now). So: the wind is smoke, the satellites are a swarm, the lightning flashes.
   Do not add a feed that only shows numbers or dots.
10. **What his second look (10 Nov) settled.** "Wind - interesting but the interaction of fingers makes it less interesting": no
   drawing in Wind; a finger turns the Earth and a tap reads a place. "More weather would could be interesting if it was done really
   well": weather is added only when it is real and well made (so far the fires and the tropical storms; clouds and rain wait for the
   hosted version, which can reach the sources). "The first blob part make no sense": the world of glowing organisms (Bloom) is
   gone; its code is kept as `dev/archive/world-bloom.js` in case he meant only its opening flashes. "Make the satellite selection
   bring up more data on each satellite. Real data": a tapped satellite brings up its record, every line of it published fact.
   "Simulate for now, but prepare for cloudfare deployment. Find more live feeds and def give me live video feeds from interesting
   places": the artifact keeps its snapshot; the hosted version (below) is where live video and live data go.
11. **What his third look (10 Nov, 09:50) settled:** "Nah, needs to be more realistic. The satellites should be in real time. The
   wind should have more layers, rain, sun, clouds. Real time. That's the most important part. The smoke is cool, but more effects in
   that section. Much more interesting and interactively cool. Like video games, building systems, puzzles, etc." So: Orbit opens on
   the present, second for second, and nothing winds it by itself (the hint turns the Earth instead); Wind has layers he can switch
   (wind, clouds, rain, sun), the clouds and the rain only in the hosted version (they cannot reach the artifact); Smoke is a machine
   to build in (walls, fans, drains, smoke that rises, whirlpools) with puzzles, each of which brings more of the band in (seven
   puzzles at first; five since noon on 10 Nov, when only five passed the test of not solving themselves). Real time is the hosted version: say so plainly rather than dressing up the snapshot.

12. **What his fourth look (10 Nov, 11:15 to 13:05) settled.** "I have no idea what any of that first page does. Makes no sense":
   rule 5 changed (names on the tools, one plain line saying what a world is). Then "More more more!!!! ... I want the satellites
   animated in orbit. I want many many more videos. I want just more better." Asked whether Orbit should open sped up or in real
   time, he chose "Real time, flowing trails": the satellites stay where they are this second, each with a trail of its last
   minutes along which light runs; the ×60 chip still flies them. The Live world went from 10 cameras to 29.

13. **What his fifth look (12 Nov, 20:11) settled.** "Make this so much better!! The smoke game needs to be better the videos need to
   be better, the weather needs to be better." Asked what better meant, he chose: for Smoke, "Lots of levels" (20+ levels that get
   harder, stars for using fewer pieces, new parts unlocked as you go); for the videos all four of "Every camera plays", "Full-screen
   video", "Better places", "Many more cameras" (browsable by theme); for the weather all four of "Live clouds and rain", "Zoom into any
   place", "Dramatic storms", "More layers, like Windy"; and he uses the artifact and the site "Both equally". So: Smoke is a game of 24
   levels in six chapters (a new piece each: wall, fan, prism, drain, tunnel, then all together) with stars; Live fills the screen, has
   86 cameras in eight themes and a map, and the Worker finds each camera's stream by search when its address has changed; Wind has the
   weather model's own layers (the jet streams, temperature, pressure, waves), clouds and rain that drift with the wind, a card for any
   place tapped (the weather now and for three days, and the rain radar), and storms seen up close. The artifact cannot reach weather
   services or video, so the layers, the card's forecast and radar, and the cameras are on the site only; say so plainly.

14. **What his sixth look (13 Nov, 11:40) settled.** "Some is good, I like the videos and I like the weather, but is it real? Put them
   all on the same globe as satélites and make that just a layer. Make a music dj mixer page with pitch control hundreds of other
   samples and ability to abeloton live the music and make it way more fun and interactive. And then make the smoke game clearer and
   work better. The game should also be harder and more fun." Asked, he chose for the mixer all four of "Clip grid, like Ableton", "Two
   decks and a crossfader", "Drum pads", "Effects to sweep"; of the smoke game he said "Too much smoke makes filling the holes too easy";
   for harder, "Tougher puzzles", "Moving parts", "Limited smoke"; for the cameras, "Window over the globe". So: Wind and Orbit are one
   world, Earth, where the weather, the satellites and (on the site) the cameras are layers of one globe, switched along the bottom; a
   camera's ring on the globe opens its window over the Earth; the satellites stay in the present (winding time and the ×60 chip went
   with Orbit's own world). Mix is a new world: the band and a machine of 300 sounds as two decks of
   loops started on the bar, a grid like Ableton Live's clips, each deck with its pitch, nudges and sync, a crossfader, sixteen pads to
   play and record into loops, and effects to sweep. In Smoke a level's smoke waits to be let go and its tank runs dry; a jet carries
   about half the ink it did and a ring fills only with a jet streaming through it; walls turn the water along them; a source sweeps
   and rings drift; the 24 levels are new and every ring was placed where the measured smoke goes. His question "is
   it real" was answered: the site's data is real and as fresh as each source (listed under "Live data"); the artifact's is a snapshot.

## What the page is

One screen. The world fills it edge to edge; top left its name and a few lines of live readings; top right a photo button in
Smoke and a save button where the viewer can take a file; along the bottom Smoke's tools (in Smoke) or the Earth's layers (in
the Earth; on the site also the cameras' themes), each with its name, the music (a note for the whole band and nine circles, one a
player) and under it the worlds. The band starts with the first touch anywhere. In Mix the mixer's own controls fill the middle.

**The first touch on an iPhone.** iOS starts no sound on a stroke, only on a plain tap (a touch that lifts where it landed; this is
how WebKit has behaved since iOS 9, and it could not be tried here). So a first touch that is a stroke asks for the music and gets
silence. Until a tap comes, the note stays unlit (nothing can be heard), every touch tries again, and a ghost finger taps the middle
of the world (`tapCue` in `20-ui.js`); Smoke's own hint opens with a tap for the same reason. If four taps do not free the sound
the page stops asking. `node tools/t_lock.js` plays such a phone.

| World | What it is | Hands | Its own sound |
|---|---|---|---|
| Smoke | a real fluid (GPU stable fluids) with ink that rises like smoke; a photo becomes the ink and remembers itself. A machine to build in: walls stop the water and the ink, fans push it (and breathe ink), prisms give the smoke passing through their colour, drains swallow it, tunnels take what goes in one end out of the other. And a game of 24 levels in six chapters, each bringing a piece (walls, fans, prisms, drains, tunnels, then all together): fixed sources breathe coloured jets inside a tank of fixed shape, and each ring wants its colour (a white ring wants cyan and amber together); a ring fills only while smoke of its colour, and nothing else, streams through it, so no level solves itself. The smoke waits until it is let go (the release button; it becomes stop) and then runs from a tank of a few seconds (`tank`); when the tank has run dry and the rings are not full, the level says so and waits for a change and another release. A source may sweep and rings may drift (and a fixed fan may blow by turns, though no level uses that now). Stars: three for the fewest pieces known to work (`par`) with a third of the tank left, two for one more piece or less smoke left, one otherwise. A map of the levels (one row a chapter, a line through them all); each level opens when the one before is solved; every third level solved brings a player in (the shekere, the djembe, the talking drum, the agogo, the balafon, the kora), the electric guitar with the last | the tools along the bottom, each named: the hand (drag: push, ink; tap: a drop; stay: a spring), wall (drag: a straight wall whose ends join others; tap one: away), fan (drag: where and which way), prism (tap; tap one: away), drain (tap), tunnel (drag from where the smoke goes in to where it comes out; tap an end: away), release (in a level: let the smoke go; stop), levels (the map; on it "play freely"), "again"; two fingers turning: a whirlpool, closing: pull the water in, opening: throw it out. In a level the hand moves the water but leaves no ink | glass notes, nine rows; a thump for a wall, a kalimba note for a fan, glass for a prism, a bowl for a drain and two for a tunnel, glass for each ring filled, a bowl and a glass note a star for a level solved |
| Earth | one globe with its layers switched along the bottom. The weather: the wind near the ground or the jet streams ten kilometres up (one or the other), the temperature, the pressure (isobars every 4 hPa, the highs and lows), the waves, the clouds, the rain, the Sun (all but the wind and the Sun only where the page is served live: NOAA's GFS read from its GRIB2 files on the device). The clouds and the rain drift with the real wind. The globe (Blue Marble, city lights, the real day/night line) wrapped in the real wind shown as smoke (NOAA's GFS 10 m wind carrying thousands of small plumes); the strongest fires of the last day (NASA FIRMS) as embers, their smoke carried off by the same wind; the tropical storms turning now, by name; the aurora where NOAA expects it; the last half hour's lightning as the GOES satellites saw it. The satellites: every working satellite (about 15,900) and four wreckage clouds (about 2,700 pieces), each solved from its published orbit by the graphics chip every frame, in real time, each with a trail of its last nine minutes along which light runs; dimmed a little over the weather. The cameras (on the site only): a ring on the globe for each of 86 live cameras in eight themes (bright: on the air now) | one finger: turn the Earth (it coasts); tap a place: its name (the nearest town), wind, the Sun's height, the hour by the Sun, the aurora, lightning near, and where served live the model's temperature, pressure and waves there and a card: the weather now and for three days (Open-Meteo) and the last hour of rain radar (RainViewer); tap a storm: the Earth turns to it and comes close; tap a fire: what is known of it; tap a satellite: its card; tap a camera's ring: its window opens over the Earth (the stream; a tap on it: bigger or smaller; a swipe across it: the next camera east or west in the theme; its cross: closed) and the Earth turns to the camera; two fingers: slide to turn, pinch to come closer or travel out to the geostationary ring | glass notes by latitude; a soft shaker tick for each lightning flash (the half hour replayed over sixteen bars); glass when the two space stations and a dozen Earth-watching satellites cross between sunlight and shadow; a bowl note when a camera comes on |
| Mix | a DJ's mixer for the band and a machine of 300 more sounds, all struck: two decks of loops in a grid like Ableton Live's clips. Deck A is the band: its nine players, each with six loops cut from its own recording (the whole loop, its halves, one bar, one beat, half speed). Deck B is the machine: drums, percussion, bass, keys, bells and the pads, each with six loops written for it, played from 16 drum kits of 16 sounds and sixteen tuned instruments, all struck or plucked (marimba, vibraphone, glockenspiel, xylophone, kalimba, steel pan, piano, electric piano, celesta, gamelan, handpan, music box, upright bass, clavinet, glass, bells), every sound made on the device. A loop tapped starts on the next bar, in time with its deck; a row's number starts the row | tap a loop: in on the next bar (blinking while it waits; tap it again: out at the bar); a row's number: the whole row; "stop": a deck's column or all of it; each deck: pitch (±16%, by ear), nudge (held: a little faster or slower, to bring the beats together), sync (to the other deck's speed and beat), a filter (darker or thinner); the crossfader between them; the band's circles bring a player in or out on deck A; pads: 16, played with fingers, in kits chosen with the arrows; "rec" records them into a loop of deck B (each hit put on the nearest sixteenth), one bar or two, which then plays and is kept in this browser; effects: a pad to sweep with a finger (left darker, right thinner, up more echo), a stutter held (the last beat, half or quarter beat again and again), a brake for each deck, stop all | the band's own stems; the machine's sounds; nothing held or blown, and never louder than the band (measured: `t_levels.js`). Leaving Mix, whoever played on deck A plays on in the band, in step |
**The satellite card** (`cardBuild`, `cardLive` in `13-orbit.js`, shown in the Earth): name; kind, status and owner; catalogue number and international
designator; launch date and site and years up; perigee and apogee, tilt and period (from the element set); where it is over now, its
height and speed, sunlit or in shadow (worked out every quarter second); radar cross-section and standard brightness; radio downlinks
(SatNOGS); the epoch of its element set and how long ago that was. The catalogue part comes from `data/satinfo.json` (published next
to the page, about 570 KB, read at the first tap; 20 bytes an object, layout in `tools/gen_live.py`). On a wide or a turned screen
the card stands at the right and the Earth moves over; on a phone it lies above the circles and the Earth moves up.

Deep links: `#smoke #earth #mix` (old links still land: `#drift`, `#bloom`, `#loom` and `#band` on Smoke, `#wind`, `#orbit` and
`#live` on the Earth). Keys: 1-3 worlds, space music, arrows in the Earth. Kept in the viewer's own browser (`localStorage`), and
nothing else: Smoke's stars (`lc.smoke.stars`) and the loops recorded on Mix's pads (`lc.mix.pads`).

## Live data: what is live, what is a snapshot

- **Worked out on the device every frame from its clock, never stale:** where every satellite is (each orbit is carried forward
  from its published elements with the Earth's bulge turning it: the J2 secular terms, the same sums as before, within 15 km of
  SGP4 after a week for the space station), the Sun's overhead point and so the day/night line, the Moon, the turning of the stars.
- **A snapshot that goes stale unless refreshed:** the orbits themselves (good for days; a week-old set is still right to the eye),
  the wind (NOAA issues it every 6 hours), the aurora (changes over minutes to hours), the lightning (the last 30 minutes before
  it was fetched), the fires (the last 24 hours), the storms. The page cannot reach the internet (the artifact sandbox blocks every
  fetch to another host). It reads `data/live.json`, published next to the page, and watches one small document in its own store,
  `feeds/stamp` (`db` capability; everyone may read, only the owner and editors may write): `{sats, wind, aurora, strikes, fires,
  storms}` as times. When a stamp is newer than what the page has, it fetches that one document (`feeds/<kind>`) and it takes over
  at once, in every open copy. The readouts always show the data's own time. (The store has never been written: the page runs on
  the published file. Two old documents, `feeds/quakes` and `feeds/iss`, are left over from the first rebuild and unused.)
- **The freshest orbit of each satellite.** The mirrors' big "active" lists are refreshed at different rates (one was two weeks old
  on 10 Nov while its Starlink list was hours old), so `feed.py` fetches every group from four mirrors and `gen_live.py` keeps, for
  each satellite, the element set measured last, wherever it is, and leaves out anything the catalogue says has come down. On
  10 Nov about four in five orbits were under a day old; the space station's under a day.
- **Not possible inside the artifact at all:** live video (the sandbox blocks every outside image, video and frame) and the phone's
  camera, microphone and tilt (this account has no capability for them). He asked for live video feeds from interesting places and
  said "prepare for cloudfare deployment": see "Hosted version".

### Where the data comes from (the session shell reaches only GitHub, so each is a public GitHub mirror kept fresh by its owner's job)

| What | Source | Mirror (raw.githubusercontent.com) | Mirror refreshes |
|---|---|---|---|
| orbits | CelesTrak element sets | `satvisorcom/satvisor-data` `master/celestrak/tle/<group>.tle` (52 groups); `astrion-tech/celestrak-mirror` `main/tle/<group>.tle` (8 groups); `ztimson/satellites` `master/satellites.tle` and `PeanutButte7/satellite-globe-proxy` `main/snapshots/active.tle` (the whole active list) | hours to two weeks, by group |
| catalogue | CelesTrak SATCAT | `astrion-tech/celestrak-mirror` `main/satcat/satcat.csv` (6.8 MB) | daily |
| radio | SatNOGS DB transmitters | `satvisorcom/satvisor-data` `master/catalog/satnogs.json` | daily |
| brightness | standard magnitudes (McCants' list and others, as gathered by satvisor) | `satvisorcom/satvisor-data` `master/catalog/stdmag.json` | rarely |
| wind | NOAA GFS 10 m wind, 1 degree | `aaronyooht/wingmate-wind-data` `master/docs/wind-global-1deg.json` | each 6-hourly run |
| aurora | NOAA SWPC OVATION | `GefeiSHEN/NOAA-Aurora-Archive` `main/OVATION/latest.json` then the path it names | every few minutes |
| lightning | NOAA GOES-16/18 GLM | `Meteoscience1/lightning-strikes-data` `main/recent_strikes.json` | every 10 minutes |
| fires | NASA FIRMS (MODIS on Terra and Aqua, VIIRS on NOAA-20 and -21): the strongest 400 of the last 24 hours, over 150 MW | `juvenile454/planetary-lens-live-data` `main/data/fire-hotspots-v2.json` | every 15 minutes |
| storms | NOAA National Hurricane Center (present strength); GDACS, EC JRC and UN OCHA (the rest of the world; its figure is the highest wind reached so far) | `metacog-osint/elements` `main/data/nhc.json`, `gdacs.json`, `health.json` | hourly |

If a mirror dies: `tools/feed.py` keeps the previous file and says so; find another with the GitHub search API
(`https://api.github.com/search/repositories?q=...+pushed:>DATE`), which the shell can reach. `git clone --depth 1 --filter=blob:none
--no-checkout` then `git ls-tree -r --name-only HEAD` lists a repo without downloading it (never `ls-tree -l`: it fetches every blob).

### Refreshing (a few minutes, from any session)

1. Get the source (next section), then in the folder that holds `src/`, `data/`, `tools/`:
   `python3 -I tools/feed.py && python3 -I tools/gen_live.py`
   (`feed.py` checks everything it fetches: checksums on every orbit line, grid sizes, ranges, dates. `gen_live.py` writes
   `app/data/live.json`, `app/data/satinfo.json` and `data/db_<kind>.json` for sats, wind, aurora, strikes, fires, storms and stamp.)
2. Write the store with the `ArtifactData` tool, `url` above, collection `feeds`: `set` each kind from its `data/db_*.json`
   (`file_path`), and **last** `stamp` from `data/db_stamp.json` (the page fetches a document only when the stamp says it is newer,
   so the stamp must not arrive first). `get` a document first to learn its `version` for `if_version` if it already exists.
   `sats` is about 750 KB: send it in a call of its own. No publish is needed; open pages update live. (The catalogue,
   `satinfo.json`, changes slowly and is not in the store: republish it now and then.)
3. If also publishing the page, publish the fresh `app/data/live.json` and `app/data/satinfo.json` as `data/live.json` and `data/satinfo.json`.

The owner has not asked for this to run on a schedule (it was offered on 9 Nov). Do not create a scheduled task for it unless he
says so; he has run out of usage on scheduled work before, so keep any schedule sparse (the wind only changes every 6 hours).

## Getting the source into a fresh session

1. `Artifact` `list`, `scope: "files"`, `url` above.
2. `Artifact` `read` with `paths`: every path under `dev/` (`dev/archive/` only if you need the old worlds), plus `audio/*`, `img/*`,
   `data/live.json` and `data/satinfo.json`. They land under a folder `$W`. An artifact no longer takes a new `.py` file, so the
   Python tools added since 12 Nov (`gen_cities.py`, `g2ref.py`, `g2ref2.py`, `mkgfs.py`) are only in the repositories' `dev/tools/`
   (adamthabo/live-culture); the ones from before are in both, `build.py` kept up to date in place.
3. Arrange: `cd $W/dev && mkdir -p app/_fonts app/data shots && cp fonts/* app/_fonts/ && cp -r ../audio ../img app/ && cp ../data/*.json app/data/`
4. `sh tools/check.sh` builds `app/index.html` (the page) and `app/local.html` (the same with a skeleton and the test hook `window.__lc`).
5. Tests need the page served: `sh tools/serve.sh &` (port 8757), and for `test_astro.js` only: `cd tools && npm install`.
6. `sh tools/check.sh all`. Headless Chromium draws with software (about 5-60 frames a second depending on the world): judge looks from
   screenshots in `shots/`, not from speed. `node tools/t_hero.js phone 2 10 2` gives a phone-sharp picture of world 2 after 10 s.
7. After changing Smoke's puzzles, its water or its rings: `node tools/t_puzzles.js` (about twenty minutes: each puzzle with nothing
   built, then with its own solution, `LEVELS[i].sol`). Not part of `check.sh`.

## Publishing

`Artifact` publish with `url`, `file_path: $W/dev/app/index.html`, and `files` mapping every changed source to its `dev/...`
path (give `.md`, `.py`, `.sh`, `.html` fragments `contentType: "text/plain"`) and `data/live.json`, `data/satinfo.json` to their
`app/data/` files when the data changed. Files not passed are kept; `null` removes one. Do not pass `icon`.
Omit `capabilities` to keep them (`downloads`, and `db` with rules `[{path:"",read:"view",write:"admin"}]`); if you must restate
them, restate both. Read the artifact once before the first publish of a session or the publish is refused.
Never publish `app/local.html`, `app/_fonts`, `app/_check.js`, `shots/`, `wav/`, `raw/`, `data/live/` or any test photo.

After every publish, check the bytes that were published, not the local build: `Artifact` `read` with `path: "index.html"`, copy
the file it saves to `app/published.html`, then `node tools/t_published.js` (the server running). It opens that page with no test
hook, uses each world the way a person would, and must end with `PUBLISHED OK`. Delete `app/published.html` afterwards. (The
governor is live in this test and the headless browser draws slowly, so Smoke usually reports its coarsest water: not a fault.)

## Architecture (one page, one script, no libraries)

`build.py` joins `src/head.html`, `style.css`, `body.html` and the modules below into `app/index.html`.

- `00-data.js` generated by `tools/gen_data.py`: `STARS_B64` (5,044 stars: RA, Dec, magnitude, colour index) and `BAND_DATA`
  (each player's note onsets and loudness envelope, read off the stems).
- `01-core.js` helpers, the scale (`pent`, E minor pentatonic), the stage `STG` (the part of the screen the chrome leaves free), a small matrix kit,
  and the governor: `QL` 0, 1 or 2 sets how many organisms, how fine the water and the smoke, how many satellites, and how fine the canvas
  (2, 1.5 or 1.25 device pixels a point). It was carried over from the page this one replaced and is worth keeping as it is: it judges
  nothing before the first touch (a framed page can be held to half speed until then), a step down is a two-second trial, and if the step
  bought no speed (a phone in low-power mode runs everything at thirty frames a second) the quality is given back. `tools/t_gov.js` checks all three.
- `02-gl.js` one WebGL1 canvas shared by all worlds: programs, targets, image textures (mipmaps where sizes allow), context loss and return.
- `04-band.js` the band's state: who is in (`ON`), each world's line-up (`SC`), every onset as it sounds (`BD.hits`, `BD.flow`), the sixteenth-note step.
- `03-audio.js` Web Audio: the stems and the original mixer; the touch voices (`SYN`, plain arrays worked out once), their bus, its ceiling
  (`lim` then `post`, see below), `tone()` and `hit()`; the iPhone unlock; `soundLive()` (it can be heard) and `soundHeld()` (asked for, not
  yet allowed); `seqPump` tells the current world about each sixteenth a little ahead of time.
- `05-astro.js` the sky from the clock: Sun, Moon, sidereal time (and, unused now, the planets and a single-satellite propagator that
  `tools/test_astro.js` checks against astronomy-engine and SGP4; `13-orbit.js` uses the same sums for every satellite).
- `08-grib.js` `GRIB`: a reader for GRIB2, the format the weather models are published in (regular latitude/longitude grids; simple
  packing, and complex packing with and without spatial differencing; bitmaps and missing values; several fields in one message, as
  NOAA packs each wind's two parts). `node tools/t_grib.js` checks it against ECMWF's ecCodes on real NOAA files (the reference values
  are made with `pip install eccodes eccodeslib`; the files are pygrib's sample data). `GRIB.at(m, lat, lon)` reads a value at a place.
- `09-cities.js` `CITIES`: Natural Earth's 1,251 populated places (public domain), for "35 km from Boston"; made by `tools/gen_cities.py`.
- `06-live.js` `LIVE`: the six data sets, `liveTake()` (checks and unpacks one; every name that will be shown is cut down to letters,
  digits and a few marks), `liveLoad()` (reads `data/live.json`, then watches the store's stamp); `SATINFO`, `satInfo(id)` the catalogue.
- `07-globe.js` `GLOBE`: the Earth drawn by ray in one fragment shader (day, night lights, relief, sea glint, air), with two optional
  layers: a smoke picture and the aurora grid. `GLOBE.at(x,y,g)` gives the latitude and longitude under a finger.
- `11-drift.js` (the world called Smoke), `12-wind.js` (the Earth), `16-mix.js` (Mix) the three worlds. Each is an object with any of:
  `enter leave resize down move up hover gesture wheel key seq step tick draw hud ghost gl dbg`. Since 13 Nov the satellites
  (`13-orbit.js`, `ORBIT`) and the cameras (`14-live.js`, `LIVEW`, in the hosted build only) are not worlds but layers the Earth
  runs: each has `layer: {on, off, tick, draw, pick, hud}` (the cameras also `hit`, `up` for their window, `open`, `close`, `flyTo`),
  and the Earth turns them on and off from its row of layers, hands them its globe (`g`) every frame, draws them over its own, and
  offers them a tap first (a camera's ring, then a satellite within 20 pixels, then a storm or a fire, then the place). Over the
  weather the satellites are dimmed (`LAY`). Mix is DOM controls over the canvas (`#mix`, placed under the readout each frame).
  The two worlds taken out on 10 Nov are in `dev/archive/`: `world-bloom.js` (`BLOOM`) and `world-band.js` (`BANDW`). To bring one
  back: put it in `src/` as `10-bloom.js` or `15-band.js`, add it to `mods` in `build.py`, add its row to `WORLDS` in `20-ui.js` (the
  rows that were there are in the v14 source of `20-ui.js` in this artifact's history), and rerun every test.
  Smoke: stable fluids on the GPU (velocity at 128 cells across a phone, ink at 512), buoyancy by the ink's density. Walls are
  drawn into a grid at the water's size (`obs`) that masks the water and the ink (`msk`) and that the advection reads (`uObs`):
  nothing is carried across a wall in one step, or a fast jet jumps a 10-pixel wall; where the way back crosses a wall the place
  keeps what it had (until 13 Nov it took nothing, which ate the smoke of every jet that met a wall). Since 13 Nov the pressure sees
  the walls too (`div`, `prs`, `grad`: a wall's cell takes the pressure of the water against it, and the water beside a wall loses
  only the part of its speed that goes into it), so a jet that meets a wall slides along it instead of stopping dead and spreading.
  Measured on the first level: before, a jet turned by a wall came away with a third of the smoke a straight jet carries. A prism is a pass over the ink (`tint`: inside it
  the ink takes its colour, as bright as it was); a tunnel is a pass that moves the ink in one mouth into the other, place for place
  (`tun`), with a pull at one end and a push out of the other. Rings are measured from the ink read back at 64 across (`readBack`,
  `sample`: density times how close the colour, taken all together, is) and fill by the water's own time at `LP.fk*(match - LP.f0)`.
  A level is played in a tank of fixed shape (`B`, width 0.64 of its height, fitted into the stage; its places are fractions of the
  tank, and its speeds and sizes scale with it), so it plays the same on any screen. A level's water is its own (`LP`): smoke rises a
  third as much, it and the water fade sooner, and it fades by the water's own time, not the clock's. That last matters: a phone
  stepping the water sixty times a second keeps smoke far longer than the headless test browser did, and the old first puzzle would
  have filled its ring with nothing built on a real phone. Now any frame rate plays a level the same, only slower or faster.
  Each level has its solution (`LEVELS[i].sol`). `node tools/t_design.js levels.json [first] [last] [seconds]` plays levels from a
  file (stepping as a 60-frame phone: `fixdt`) with nothing built (no ring may pass half) and with their solutions (every ring
  must fill), and any `bad` builds listed; `node tools/t_puzzles.js` does the same for the levels in the page. Slow: two to four
  minutes a level. Change a level, the water or the rings: run them. Since 13 Nov the rings are placed by measurement: a level is
  drafted without rings but with `want` (the rings' colours) and its solution; `node tools/t_place.js drafts.json [first] [last]
  out.json` lets each draft's smoke go with its solution built and with nothing built and records what a ring of each colour would get
  at 400 points of the tank every quarter second (the page takes the readings itself: `rec`, `recGet`; the water is worked out but
  not shown: `nodraw`; about five minutes a level here, two at a time); `python3 tools/place_rings.py drafts.json out.json ...
  [--fk --f0 --k] [--write levels.json]` then tries every point as a ring by the page's own rule and lists the places where the
  solution fills it soonest while nothing built stays well short (and its neighbours do too, so a ring a little off still behaves),
  and can try other settings of the water without running it again; `python3 tools/set_levels.py levels.json` writes the chosen
  levels into the source. Then `t_design.js` plays them for real. Levels that failed: two jets head on (their rising plume
  filled both rings), a ring above a jet (smoke rises into it), anything carried by drift alone, a fixed fan far from the jet it
  should bend, a jet sheltered from a fixed fan near it (the fan's flow comes round the shelter), an intruder whose colour is near
  the ring's (a ring judges the colour of all the smoke in it together). In a level a
  drain stops the water as well as eating the ink (`snk` mode 3): a drain that only ate the ink left a jet's push to shove the other
  smoke aside, and a jet ran on through it, faded, which looked wrong.
  Wind: the smoke lives in a 1024 x 512 picture of the unrolled Earth (512 x 256 on slower phones); each frame every place takes what the
  real wind is bringing it (semi-Lagrangian, speeded up about 30,000 times), fed by small fixed "fires" that each burn a few seconds,
  by a haze where the wind is strong, and by the real fires (each a point drawn into the picture every frame, `P.pts`). The storms are
  drawn over the globe; a tap goes to the storm's eye or the fire under the finger before the place.
  The satellites (`13-orbit.js`): eight vertices a satellite in one static buffer (its trail in four pieces, from the body to the same body nine minutes
  earlier, light running along it), and the bodies alone in a second (a stride of eight would pass WebGL's 255-byte limit); the vertex shader
  solves Kepler's equation; the angles are brought forward to a new base time every ten hours of shown time so the numbers stay small.
- `15-mixsnd.js` `MIXS`: Mix's machine of sounds, every one made on the device into a buffer, struck and dying away (no oscillator):
  16 drum kits of 16 roles (kick to snap, each kit its own tuning, length and grit), 16 tuned instruments sampled at a few notes each
  and played between them by speed, and the loops written for them (drums, percussion, bass, keys, bells; six each). Made a few at a
  time in the background (`want`, `pump`) so the page never stalls.
- `16-mix.js` `MIX`: the mixer. `TR` the tracks (the band's nine on deck A, the machine's six on deck B), `DK` the decks (each its own
  beat clock: `beats(t) = bRef + (t - tRef) * BPS * rate * (1 + nudge)`, re-anchored whenever the speed changes). Every 25 ms
  `pump` schedules what falls in the next 160 ms (1.2 s while the page is hidden): a band loop is its stem played from the loop's place, looping; a machine loop is its
  hits as one-shot buffers. Launches wait for the deck's next bar. Its sound goes through the page's own buses: deck A into the band's
  (so the band sounds as it always does), deck B, the pads and the echo into the bus every hand-played sound goes into (with its
  ceiling), so nothing on Mix can come out louder than the band: `t_levels.js` measures deck B at its busiest, with the echo up, and
  ten fingers on the pads (`MIX.offline` builds the decks on an offline context). Entering Mix hands the band's usual loops over to
  deck A where they are, without a gap; leaving hands them back on deck A's beat.
- `20-ui.js` the worlds table, pointers (real fingers `PT`, ghost fingers `GP`, a hovering mouse), two-finger gestures, the hints, the
  music's note and circles (`swSync`, `dotsBuild`), the photo, saving, keys.
- `21-main.js` the frame loop and start.

Conventions: everything that moves uses `dt`; GLSL ES 1.00 only; `[hidden]` via `el.hidden`; a world's GL state never leaks into the next
(`glAttrOff()` first, blend and scissor switched back off); free what you replace (`glFree`).
Reduced motion: no hints, no band-driven motion, the worlds hold still until touched; the wind moves slowly; the satellites stay in the present.

## Sound levels (measured, not guessed)

The previous version's saxophone was measured at 9 to 12 dB **louder than the whole band** per note, and it played by itself
every loop and again on every touch. That is the failure this section exists to prevent.

- The touch voices share one bus: `toy` gain, a 7.2 kHz low-pass, a compressor used as a ceiling (`TOYLIM`: threshold -27 dB,
  ratio 14), then `post`. A browser's compressor silently adds make-up gain (+13.9 dB at these settings in Chromium);
  `post` takes it back out, and `limCalibrate()` measures the real figure on the device once after load instead of trusting the constant.
- `node tools/t_levels.js` renders the band and the voices through the page's real graph offline and compares loudest half-seconds.
  As published on 10 Nov: one note played as hard as possible sits 7 to 12 dB under the full band (the shaker 21 under);
  the lightning's ticks with fast glass on top sit 6.5 under; ten fingers hammering every voice at once sits 3.4 dB under.
  (The room's echo is random, so runs differ by half a dB or so.)
- `node tools/t_spec.js` shows the same per octave.
- Mix (13 Nov): deck B, the pads and the echo play into the same bus as the touch voices, so the same ceiling holds them; deck A is
  the band's own stems at the band's own gains (`SG`). `t_levels.js` renders deck B at its busiest (its fullest drum, bass, keys and
  bells loops together), the same with the echo all the way up, ten fingers on the pads (every kit, a hit every 30 ms), and all of
  that at once; each must stay under the full band like everything else a hand plays. Measured on 13 Nov: deck B at its busiest
  2.1 dB under the full band, with the echo up 1.9, the pads 2.0, all at once 2.0 (the ceiling holds them all at about the same
  level); ten fingers on the touch voices 3.8 under.
- Higher notes are played softer (`tilt()`: 3 dB per octave around E4).
- If you change a voice or a gain in `INSTDEF`, rerun both. If you add a voice, it must be struck.

Not measurable here and therefore unknown: how it sounds to an ear, and how an iPhone speaker (which drops everything below about 250 Hz) shifts the balance.

## Hosted version (Cloudflare)

In the owner's repository `adamthabo/hello`, folder `live-culture/` (never in `adamthabo/edge-desk`, his trading app). Its README has
the Deploy to Cloudflare button; deploying makes a repository of its own in his GitHub (`live-culture`) from which Cloudflare's
Workers Builds deploys every push, and the page lives at `https://live-culture.adamthabo.workers.dev`. He pressed the button on
10 Nov at 11:12; the first build never reported back and the address showed Cloudflare's "There is nothing here yet" (his words:
"There nothing there yet!", "Yeah, it's empty why"). A push to `adamthabo/live-culture` started a build that deployed at 11:38.
Each build reports to GitHub as the check run "Workers Builds: live-culture" on the pushed commit: that is how to see from here
whether a push went live (`gh api repos/adamthabo/live-culture/commits/<sha>/check-runs`). The session cannot open workers.dev.
A push is now and then not picked up (no check run after a few minutes, 10 Nov 13:51): an empty commit pushed after it starts
the build at once.

- `worker.js`: the page is static (`public/`); the Worker answers only `/api/feed/<name>` (a fixed list of public sources, each with
  mirrors to fall back on, kept in memory for minutes: Cloudflare's cache does nothing on workers.dev; `radar` is RainViewer's list of
  radar pictures), `/api/cams` (the cameras and their themes), `/api/yt/<camera>` and `/api/live?ids=` (which video a camera, or up to
  eight, streams now), `/api/gfs/<t2m|mslp|jet|wave>` (one field of NOAA's GFS, its newest run's analysis: the run's index names the
  byte range, which is fetched from NOAA's copy on Amazon's open data, then NOAA's own server; served as GRIB2, read on the device), and
  `/api/wx?lat=&lon=` (Open-Meteo's weather for one place, now and for three days). No keys, no settings, nothing stored. The user
  agent names no one. Free Cloudflare plans allow fifty fetches a request and ten milliseconds of work: the camera lookups share a
  budget of 46 (`B`), and nothing heavy is parsed in the Worker (the GRIB is passed through as bytes).
- How a camera's stream is found (`ytNow`): the video addresses in `v`, each checked on its watch page (on the air, and allowed to be
  played on another site: `"playableInEmbed"`); then the channels in `c` (`/@handle/live`); then a search of what is live now (`s`:
  words, the title it must have, the channel it must come from; looped films posing as cameras, `NOT`, are passed over). The page asks
  for a theme's cameras eight at a time and shows only those on the air; a stream that will not play here (the player's error, or no
  picture in twelve seconds) is passed over for ten minutes.
- The page built with `HOSTED=1` (`build.py` writes `hosted/index.html`; `sh tools/pack_hosted.sh` copies it and the pictures, the
  sounds and the snapshot into the Worker's `public/`). It starts from the published snapshot, then `livePull()` in `06-live.js` reads
  every source through the Worker on its own clock (aurora and lightning every 5 minutes, fires 15, wind, storms and rain 30, clouds
  60, orbits 3 hours), unpacks each raw format itself (`pWind`, `pAurora`, `pStrikes`, `pFires`, `pStorms`, `pTLE`) and takes it only
  when it is newer. The live orbit list is laid over the snapshot (`satsMerge`): each satellite keeps its kind, takes the newer
  element set; satellites launched since join at the end, kinded by name.
- Sources it adds beyond the artifact's: CelesTrak directly (then the mirrors), NOAA SWPC directly, the clouds (EUMETSAT world cloud
  map via clouds.matteason.co.uk, 3-hourly), the rain (NASA IMERG precipitation rate from NASA GIBS WMS, the newest half hour that has
  data, about four hours back), NOAA GOES-19 and GOES-18 full-disk GeoColor pictures, and YouTube streams.
- The cameras are `src/14-live.js` (in the hosted build only): until 13 Nov a world of their own (Live), full screen; since then a
  layer of the Earth (his words: "Put them all on the same globe as satélites and make that just a layer", and he chose "Window over
  the globe"): a ring on the globe for each camera of the theme, and a tapped ring opens the stream in a window over the Earth (at the
  bottom right; a tap on it: across the stage, and back; a swipe across it: the next camera east or west; its cross: closed). The
  cameras are listed in `worker.js` (`CAMS`, sorted west to east as it loads); to add one, copy a line with its theme `t`. 86 cameras in eight themes since 12 Nov (found by web search; none could
  be watched from here). Before that, 29 cameras since 10 Nov, 13:30 (his words: "I want many many more videos"):
  the ISS (Sen), Kilauea, Vancouver, Monterey's sea nettles, Las Vegas, Jackson Hole, Starbase, Churchill's aurora, Satellite Beach,
  Times Square, Maho Beach, Rio's Christ the Redeemer, Amsterdam, Venice, St Peter's, Etna, three African waterholes (Namib, Onguma,
  Hwange), Posio's aurora in Lapland, Singapore, Hong Kong, Sakurajima, Fuji, Shibuya, Sydney, Auckland, and the two GOES pictures.
  Found by web search on 10 Nov; none could be checked from here (the session cannot reach YouTube, workers.dev, or play video): the
  Worker asks YouTube which are on the air and the page passes over the rest. Video ids change when a stream restarts: give a channel
  (`c`, a handle or a UC id) where one is known.
- Testing here: `node tools/hostmock.mjs` (port 8758) runs the real `worker.js` with every upstream played from local files, a few
  made-up YouTube pages (a search, a looped film, a stream that may not be embedded), GFS (pygrib's 2.5-degree GFS sample with an index
  in NOAA's form, and a made-up wave file: `tools/mkgfs.py`), Open-Meteo and RainViewer made up in their shapes; `node tools/t_hosted.js` checks the live reading, the clouds and rain on the globe, the merged orbits, and the
  cameras' layer and window with a stand-in for YouTube's player (and without it). What it cannot check: the real sources' answers from Cloudflare,
  YouTube's player, and the look of the real clouds and rain.
- To update the live copy after a change: build, `sh tools/pack_hosted.sh`, and push the folder's contents to his `live-culture`
  repository (Workers Builds deploys it); keep `hello/live-culture/` the same.
