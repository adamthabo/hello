# Sources and credits

## Data
- **Satellites:** CelesTrak (celestrak.org, Dr T. S. Kelso), general perturbations element sets: the "active" list and the groups
  used to colour it, plus four debris groups. Read through the public mirrors github.com/satvisorcom/satvisor-data (`celestrak/tle/`),
  github.com/astrion-tech/celestrak-mirror (`tle/`), github.com/ztimson/satellites and github.com/PeanutButte7/satellite-globe-proxy;
  for each satellite the newest element set among them.
- **What is on record about each satellite:** CelesTrak's satellite catalogue (SATCAT: catalogue number, international designator,
  owner, launch date and site, status, decay, radar cross-section), as mirrored by github.com/astrion-tech/celestrak-mirror
  (`satcat/satcat.csv`). Radio downlinks from the SatNOGS DB (Libre Space Foundation, CC BY-SA 4.0) and standard magnitudes, both as
  gathered by github.com/satvisorcom/satvisor-data (`catalog/satnogs.json`, `catalog/stdmag.json`).
- **Fires:** NASA FIRMS (Fire Information for Resource Management System): active fire detections from MODIS on Terra and Aqua and
  VIIRS on NOAA-20 and NOAA-21, the strongest of the last 24 hours, as gathered every 15 minutes by
  github.com/juvenile454/planetary-lens-live-data (`data/fire-hotspots-v2.json`). A detection is heat seen from orbit: gas flares
  and volcanoes are seen too.
- **Tropical storms:** NOAA National Hurricane Center (CurrentStorms) and GDACS, the Global Disaster Alert and Coordination System
  (European Commission Joint Research Centre and UN OCHA), as gathered hourly by github.com/metacog-osint/elements (`data/nhc.json`,
  `data/gdacs.json`).
- **Wind:** NOAA NCEP Global Forecast System, 10 m wind at 1 degree (public domain), as converted every model run by the public
  repository github.com/aaronyooht/wingmate-wind-data (`docs/wind-global-1deg.json`).
- **Aurora:** NOAA Space Weather Prediction Center, OVATION Prime 30-minute forecast (services.swpc.noaa.gov/json/ovation_aurora_latest.json;
  public domain), read through the archive github.com/GefeiSHEN/NOAA-Aurora-Archive (`OVATION/latest.json`).
- **Lightning:** NOAA GOES-16/18 Geostationary Lightning Mapper flashes of the last 30 minutes (public domain), as gathered every
  10 minutes by github.com/Meteoscience1/lightning-strikes-data (`recent_strikes.json`).
- **Clouds (hosted version):** EUMETSAT's world cloud map (infrared, 10.8 µm, from the geostationary satellites), made into a
  greyscale map every three hours by Matt Eason's Live Cloud Maps (clouds.matteason.co.uk, github.com/matteason/live-cloud-maps).
- **Rain (hosted version):** NASA GPM IMERG precipitation rate, half-hourly, as drawn by NASA GIBS (Global Imagery Browse Services).
- **The whole Earth (hosted version):** NOAA GOES-19 and GOES-18 ABI full-disk GeoColor, from NOAA NESDIS STAR (cdn.star.nesdis.noaa.gov);
  since 14 Nov, night, also laid onto the globe as the "live view", through the ABI fixed grid as NOAA's GOES-R Product User's Guide
  defines it (the satellite's height, the scan angles, the GRS80 ellipsoid).
- **Live cameras (hosted version):** YouTube live streams by Sen (the ISS), explore.org with Polar Bears International (Churchill),
  NASASpaceflight (Starbase), Monterey Bay Aquarium, NamibiaCam (Gondwana Collection Namibia), and streams of Sakurajima, Mount Fuji
  and Shibuya. Their sound is never played. On the Earth each is shown by YouTube's own picture of the stream (i.ytimg.com, through
  the Worker); in the artifact, which may show no outside picture, each opens on YouTube (the channel's live page, or YouTube's search
  for it among live streams).
- **Stars:** the Extended Hipparcos Compilation (XHIP; Anderson and Francis 2012) to magnitude 6, 5,044 stars, as packaged by
  d3-celestial (Olaf Frohn, BSD 3-Clause): `data/stars.6.json` in github.com/ofrohn/d3-celestial. Packed by `tools/gen_data.py` (6 bytes a star).
- **Sun and Moon:** the Astronomical Almanac's low-precision series. Coded in `src/05-astro.js`.
- **The ground up close (hosted version, since 14 Nov):** NASA Blue Marble: Next Generation (500 m), as drawn by NASA GIBS's WMS for
  the part of the Earth in view.
- **The Earth's pictures:** NASA Blue Marble (day), NASA Black Marble / Earth at Night (city lights), elevation and water mask,
  as shipped as example images in the npm package three-globe 2.45.6 (Vasco Asturiano, MIT). Resized and, for the lights,
  separated from the night picture by `tools/gen_earth.py`.
- **How an orbit is carried forward:** the secular J2 terms (Brouwer / Kozai), as in Vallado, "Fundamentals of Astrodynamics and
  Applications"; the same sums a two-line element set is defined for, without SGP4's periodic terms and drag.

- **The war zones (since 15 Nov):** which wars, and their dead in 2026: Wikipedia, "List of ongoing armed conflicts" (its 2026 column,
  read 15 Nov 2026; CC BY-SA), whose figures come from ACLED, UCDP and the press. The latest line of each, as checked that day: Ukrenergo
  via the press (strikes on the grid, 7 to 10 Nov), AP (Gaza, 11 Nov; Myanmar, 10 Nov; the Afghanistan-Pakistan border; the UN mission
  in Goma, 3 Nov), Al Jazeera with UKMTO (Qeshm Island and the ships in the Strait of Hormuz, 7 Nov), Sudan Tribune (West Kordofan,
  8 Nov). The ground Russia holds in Ukraine: DeepStateMap (deepstatemap.live), as copied each day to GitHub by
  cyterat/deepstate-map-data (GPL-3.0; the shape in `data/zones.json` is that file simplified, under the same licence).
- **The places cut off (since 15 Nov):** Internet Society Pulse's Shutdown Tracker (pulse.internetsociety.org/shutdowns: its nine
  ongoing shutdowns on 15 Nov 2026); North Korea's 1,024 internet addresses and its closed national network, Kwangmyong: RIPE Labs
  ("The Internet in North Korea"), Wikipedia; Gaza's power: the World Bank via AFP (4 Nov 2026); Cuba's grid: AP (18 Sep 2026);
  Ukraine's: its energy ministry (Nov 2026); Iran's shutdown and its return with restrictions: NetBlocks, AP (27 May 2026). On the
  site, live: IODA, Internet Outage Detection and Analysis (Georgia Tech; api.ioda.inetintel.cc.gatech.edu), its summary by country.
- **The shapes of the zones:** Natural Earth (naturalearthdata.com, public domain): admin-0 countries and map subunits at 1:50m (Gaza
  is a map subunit), admin-1 provinces at 1:10m. Joined and simplified with shapely (BSD).

## Checked against
- satellite.js 7.1.0 (SGP4): the space station's ground position within 15 km after a week and 37 km after two (`tools/test_astro.js`,
  for the single-satellite version in `05-astro.js`; `13-orbit.js` uses the same sums for every satellite).
- astronomy-engine 2.1.19 (Don Cross, MIT): the Sun within 0.01 degrees; sidereal time within 0.003 degrees.
Both are used only by `tools/test_astro.js`; neither is in the page.

## Sound
- **The band:** nine stems rendered from sampled acoustic instruments (MuseScore General soundfont, MIT), cut as seamless
  four-bar loops at 104 beats a minute. Unchanged from the original site apart from the horn stem being left out.
- **Touch voices:** computed in `src/03-audio.js`: sums of dying sine waves (glass, kalimba, wood, bowl) and three hand drums.
- **Mix's instruments (since 13 Nov):** recordings from the Versilian Community Sample Library (VCSL) by Versilian Studios and Sam
  Gossner (github.com/sgossner/VCSL), dedicated to the public domain (CC0 1.0): congas, quinto, tumba, bongos and cajon; shakers,
  claps, claves, a woodblock, a hi-hat, agogo; marimba, vibraphone, soft-mallet xylophone, glockenspiel, tubular chimes; an upright
  piano. Trimmed, levelled and joined into `snd/*.mp3` by `tools/snd/build_bank.py`; each note's pitch measured by
  `tools/snd/pitch2.py`. The loops were written for the band's own chords and swing.
- **The modes' instruments (since 15 Nov):** a drum kit (kick, snare, cross-stick, hi-hat closed, open and foot, ride, tambourine,
  cowbell, a brush on the snare), the TR-808's kick, snare, clap, hats and cowbell, fingered, slapped, picked and upright basses, a
  clavinet, an electric piano (Rhodes), a palm-muted and a clean electric guitar: from **FluidR3Mono_GM.sf3** as MuseScore ships it
  (github.com/musescore/MuseScore, tag 3.6.2, `share/sound/`), MIT licence. Its notice, which goes with any derivative work:
  "Fluid (R3) SoundFont, Copyright (c) 2000-2002, 2008 Frank Wen; released under the MIT license. Mono conversion (FluidR3Mono) by
  Michael Cowgill, Copyright 2014-17." Drawn out note by note from the soundfont (each note's pitch from its root key and tuning, and
  checked by its spectrum), trimmed, levelled and joined into `snd/*.mp3` by `tools/snd/build_modes.py`. Played with Mix's own piano,
  shaker and hand drums (VCSL, above). The patterns are written here, after the grooves each style is known for (the one drop and
  steppers, the funk backbeat with ghost notes, the shuffle, four on the floor with an acid line).
- **The fluid in Paint (Smoke until 15 Nov):** Jos Stam, "Stable Fluids" (1999), with vorticity confinement, buoyancy, and obstacles as in GPU Gems
  (Mark Harris, "Fast Fluid Dynamics Simulation on the GPU", 2004, simplified to masking).
- **The smoke in Wind (until 15 Nov):** semi-Lagrangian advection (the same paper) in the real wind field; the way of showing wind owes to
  Cameron Beccario's earth.nullschool.net and to Refik Anadol's wind "data paintings".

## Beats
Beat's 34 beats were read off seven short videos the owner sent on 17 Nov (the TikTok account superxeim, a series on the geometry of
rhythms, each beat drawn on a circle of its steps over a grid of them): the steps of every row from the grid, the tempo from each
video's own label, how long a step is from how fast its step counter goes. The rhythms themselves are traditional (the clave, the
tresillo, the bembé bell, teentaal's theka and the rest belong to their musics), and the way of drawing them follows Godfried
Toussaint's *The Geometry of Musical Rhythm* (2013), where the six timelines of the third video (son, rumba, bossa nova, shiko,
soukous, gahu) come from. Played on the page's own recordings (VCSL, CC0, and Fluid R3, MIT: above).

## Type
Anybody (Etcetera Type Company) and JetBrains Mono, both SIL Open Font License, from Google Fonts.

## Ideas it leans on
teamLab's rooms that answer a hand. Ryoji Ikeda's exact, monochrome data. Refik Anadol's data as pigment. Cameron Beccario's
earth.nullschool.net. Rafael Lozano-Hemmer's pulses. (Bioluminescent plankton, behind the Bloom world, now archived.)
