# Live Culture: working notes

Live Culture is a published Claude artifact: three worlds to play in (Smoke, Wind, Orbit), with one band playing under all of them,
and the same page served live from the owner's own Cloudflare Worker, where it reads every source as it changes and has a fourth
world, Live (camera streams). It was rebuilt from nothing on 9 Nov 2026 after the owner said he hated the previous version, reshaped
the same evening after his first look, and twice more on 10 Nov (his words are under "Hard rules").

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
5. **Few controls, no words of instruction.** What a world does is shown by a ghost finger doing it, not by text.
   The readout line states facts (counts, places, times), never tells anyone what to do.
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
   to build in (walls, fans, drains, smoke that rises, whirlpools) with seven puzzles, each of which brings one more player into the
   band. Real time is the hosted version: say so plainly rather than dressing up the snapshot.

## What the page is

One screen. The world fills it edge to edge; top left its name and a few lines of live readings; top right a photo button in
Smoke, a save button where the viewer can take a file, "Now" in Orbit; at the right-hand edge in Smoke its tools; along the bottom
Wind's layers (in Wind), the music (a note for the whole band and nine circles, one a player) and under it the worlds. The band
starts with the first touch anywhere.

**The first touch on an iPhone.** iOS starts no sound on a stroke, only on a plain tap (a touch that lifts where it landed; this is
how WebKit has behaved since iOS 9, and it could not be tried here). So a first touch that is a stroke asks for the music and gets
silence. Until a tap comes, the note stays unlit (nothing can be heard), every touch tries again, and a ghost finger taps the middle
of the world (`tapCue` in `20-ui.js`); Smoke's own hint opens with a tap for the same reason. If four taps do not free the sound
the page stops asking. `node tools/t_lock.js` plays such a phone.

| World | What it is | Hands | Its own sound |
|---|---|---|---|
| Smoke | a real fluid (GPU stable fluids) with ink that rises like smoke; a photo becomes the ink and remembers itself. A machine to build in: walls stop the water and the ink, fans push it (and breathe ink), drains swallow it. Seven puzzles: fixed sources breathe coloured smoke and each cup wants its colour (a white cup wants cyan and amber mixed); build a few walls, fans and drains to fill every cup; each solved brings one more player into the band (shekere, djembe, talking drum, agogo, balafon, kora, the electric guitar last) | the tools at the right: the hand (drag: push, ink; tap: a drop; stay: a spring), wall (drag: a straight wall whose ends join others; tap one: away), fan (drag: where and which way; tap one: away), drain (tap), the puzzles, and "again"; two fingers turning: a whirlpool, closing: pull the water in, opening: throw it out. In a puzzle the hand moves the water but leaves no ink | glass notes, nine rows; a thump for a wall, a kalimba note for a fan, a bowl for a drain, glass for each cup filled, a bowl and two glass notes for a puzzle solved |
| Wind | layers that can be switched along the bottom: the wind, the clouds, the rain, the Sun (the clouds and the rain only where the page is served live). The globe (Blue Marble, city lights, the real day/night line) wrapped in the real wind shown as smoke (NOAA's GFS 10 m wind carrying thousands of small plumes); the strongest fires of the last day (NASA FIRMS) as embers, their smoke carried off by the same wind; the tropical storms turning now, by name; the aurora where NOAA expects it; the last half hour's lightning as the GOES satellites saw it | one finger: turn the Earth (it coasts); tap a place: its wind, the Sun's height, the hour by the Sun, the aurora, lightning near (tap a fire or a storm: what is known of it); two fingers: slide to turn, pinch to come closer | glass notes by latitude; a soft shaker tick for each lightning flash (the half hour replayed over sixteen bars) |
| Orbit | every working satellite (about 15,900) and four wreckage clouds (about 2,700 pieces) round the Earth, each solved from its published orbit by the graphics chip every frame, in real time; real stars behind; the Earth lit for the moment shown | one finger: turn; pinch: travel out to the geostationary ring; two fingers turning: wind time (one turn = 90 min; it goes on at its own pace from there); tap a satellite: its card; the chip: "Now" back to the present when time is wound, "×60" to run it fast | glass when the two space stations and a dozen Earth-watching satellites cross between sunlight and shadow; a glass note on a tap |

**The satellite card** (`cardBuild`, `cardLive` in `13-orbit.js`): name; kind, status and owner; catalogue number and international
designator; launch date and site and years up; perigee and apogee, tilt and period (from the element set); where it is over now, its
height and speed, sunlit or in shadow (worked out every quarter second); radar cross-section and standard brightness; radio downlinks
(SatNOGS); the epoch of its element set and how long ago that was. The catalogue part comes from `data/satinfo.json` (published next
to the page, about 570 KB, read at the first tap; 20 bytes an object, layout in `tools/gen_live.py`). On a wide or a turned screen
the card stands at the right and the Earth moves over; on a phone it lies above the circles and the Earth moves up.

| Live (hosted version only) | live camera streams from interesting places in a window over the Earth, which turns to where each camera is; the readout gives the place's hour by the Sun, the Sun's height, the wind there, the satellites above its horizon (counted from every published orbit) and how far the space station is; the space station's own camera moves with it; when YouTube's player cannot load, NOAA's GOES pictures of the whole Earth | swipe: the next camera east or west; tap a mark on the globe: that camera; two fingers: closer | a bowl note when a camera comes on |

Deep links: `#smoke #wind #orbit`, and `#live` in the hosted version (old links still land: `#drift`, `#bloom`, `#loom` and `#band`
on Smoke, `#earth` on Wind). Keys: 1-3 worlds (1-4 hosted), space music, arrows in Wind, Orbit and Live, N in Orbit.
Smoke keeps the number of puzzles solved in the viewer's own browser (`localStorage`, `lc.smoke.solved`); nothing else is kept.

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
   `data/live.json` and `data/satinfo.json`. They land under a folder `$W`.
3. Arrange: `cd $W/dev && mkdir -p app/_fonts app/data shots && cp fonts/* app/_fonts/ && cp -r ../audio ../img app/ && cp ../data/*.json app/data/`
4. `sh tools/check.sh` builds `app/index.html` (the page) and `app/local.html` (the same with a skeleton and the test hook `window.__lc`).
5. Tests need the page served: `sh tools/serve.sh &` (port 8757), and for `test_astro.js` only: `cd tools && npm install`.
6. `sh tools/check.sh all`. Headless Chromium draws with software (about 5-60 frames a second depending on the world): judge looks from
   screenshots in `shots/`, not from speed. `node tools/t_hero.js phone 2 10 2` gives a phone-sharp picture of world 2 after 10 s.

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
- `06-live.js` `LIVE`: the six data sets, `liveTake()` (checks and unpacks one; every name that will be shown is cut down to letters,
  digits and a few marks), `liveLoad()` (reads `data/live.json`, then watches the store's stamp); `SATINFO`, `satInfo(id)` the catalogue.
- `07-globe.js` `GLOBE`: the Earth drawn by ray in one fragment shader (day, night lights, relief, sea glint, air), with two optional
  layers: a smoke picture and the aurora grid. Shared by Wind and Orbit. `GLOBE.at(x,y,g)` gives the latitude and longitude under a finger.
- `11-drift.js` (the world called Smoke), `12-wind.js`, `13-orbit.js` the three worlds. Each is an object with any of:
  `enter leave resize down move up hover gesture wheel key seq step tick draw hud ghost gl dbg`.
  The two worlds taken out on 10 Nov are in `dev/archive/`: `world-bloom.js` (`BLOOM`) and `world-band.js` (`BANDW`). To bring one
  back: put it in `src/` as `10-bloom.js` or `15-band.js`, add it to `mods` in `build.py`, add its row to `WORLDS` in `20-ui.js` (the
  rows that were there are in the v14 source of `20-ui.js` in this artifact's history), and rerun every test.
  Wind: the smoke lives in a 1024 x 512 picture of the unrolled Earth (512 x 256 on slower phones); each frame every place takes what the
  real wind is bringing it (semi-Lagrangian, speeded up about 30,000 times), fed by small fixed "fires" that each burn a few seconds,
  by a haze where the wind is strong, and by the real fires (each a point drawn into the picture every frame, `P.pts`). The storms are
  drawn over the globe; a tap goes to the storm's eye or the fire under the finger before the place.
  Orbit: two vertices a satellite in one static buffer (the body, and the same body a little earlier for its tail); the vertex shader
  solves Kepler's equation; the angles are brought forward to a new base time every ten hours of shown time so the numbers stay small.
- `20-ui.js` the worlds table, pointers (real fingers `PT`, ghost fingers `GP`, a hovering mouse), two-finger gestures, the hints, the
  music's note and circles (`swSync`, `dotsBuild`), the photo, saving, keys.
- `21-main.js` the frame loop and start.

Conventions: everything that moves uses `dt`; GLSL ES 1.00 only; `[hidden]` via `el.hidden`; a world's GL state never leaks into the next
(`glAttrOff()` first, blend and scissor switched back off); free what you replace (`glFree`).
Reduced motion: no hints, no band-driven motion, the worlds hold still until touched; the wind moves slowly; Orbit stays in the present.

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
- Higher notes are played softer (`tilt()`: 3 dB per octave around E4).
- If you change a voice or a gain in `INSTDEF`, rerun both. If you add a voice, it must be struck.

Not measurable here and therefore unknown: how it sounds to an ear, and how an iPhone speaker (which drops everything below about 250 Hz) shifts the balance.

## Hosted version (Cloudflare)

In the owner's repository `adamthabo/hello`, folder `live-culture/` (never in `adamthabo/edge-desk`, his trading app). Its README has
the Deploy to Cloudflare button; deploying makes a repository of its own in his GitHub (`live-culture`) from which Cloudflare's
Workers Builds deploys every push, and the page lives at `https://live-culture.<his subdomain>.workers.dev`. Pushed on 10 Nov 2026;
whether he has deployed it is not known here.

- `worker.js`: the page is static (`public/`); the Worker answers only `/api/feed/<name>` (a fixed list of public sources, each with
  mirrors to fall back on, kept in memory for minutes: Cloudflare's cache does nothing on workers.dev), `/api/cams` (the cameras) and
  `/api/yt/<camera>` (which video a camera streams now). No keys, no settings, nothing stored. The user agent names no one.
- The page built with `HOSTED=1` (`build.py` writes `hosted/index.html`; `sh tools/pack_hosted.sh` copies it and the pictures, the
  sounds and the snapshot into the Worker's `public/`). It starts from the published snapshot, then `livePull()` in `06-live.js` reads
  every source through the Worker on its own clock (aurora and lightning every 5 minutes, fires 15, wind, storms and rain 30, clouds
  60, orbits 3 hours), unpacks each raw format itself (`pWind`, `pAurora`, `pStrikes`, `pFires`, `pStorms`, `pTLE`) and takes it only
  when it is newer. The live orbit list is laid over the snapshot (`satsMerge`): each satellite keeps its kind, takes the newer
  element set; satellites launched since join at the end, kinded by name.
- Sources it adds beyond the artifact's: CelesTrak directly (then the mirrors), NOAA SWPC directly, the clouds (EUMETSAT world cloud
  map via clouds.matteason.co.uk, 3-hourly), the rain (NASA IMERG precipitation rate from NASA GIBS WMS, the newest half hour that has
  data, about four hours back), NOAA GOES-19 and GOES-18 full-disk GeoColor pictures, and YouTube streams.
- The Live world is `src/14-live.js` (in the hosted build only). The cameras are listed in `worker.js` (`CAMS`); to add one, copy a
  line. Streams found on 10 Nov: Sen's 4K camera on the ISS, explore.org's northern lights camera at Churchill, NASASpaceflight's
  Starbase, Monterey Bay Aquarium's sea nettles, NamibiaCam's waterhole, Sakurajima, Mount Fuji, Shibuya. None could be checked from
  here (the session reaches only GitHub): the Worker finds which are on the air and the page passes over the rest.
- Testing here: `node tools/hostmock.mjs` (port 8758) runs the real `worker.js` with every upstream played from local files and a few
  made-up YouTube pages; `node tools/t_hosted.js` checks the live reading, the clouds and rain on the globe, the merged orbits, and the
  Live world with a stand-in for YouTube's player (and without it). What it cannot check: the real sources' answers from Cloudflare,
  YouTube's player, and the look of the real clouds and rain.
- To update the live copy after a change: build, `sh tools/pack_hosted.sh`, and push the folder's contents to his `live-culture`
  repository (Workers Builds deploys it); keep `hello/live-culture/` the same.
