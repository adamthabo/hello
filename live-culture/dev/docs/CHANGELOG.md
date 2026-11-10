# Changelog

## For the owner
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
