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
- **The whole Earth (hosted version):** NOAA GOES-19 and GOES-18 ABI full-disk GeoColor, from NOAA NESDIS STAR (cdn.star.nesdis.noaa.gov).
- **Live cameras (hosted version):** YouTube live streams by Sen (the ISS), explore.org with Polar Bears International (Churchill),
  NASASpaceflight (Starbase), Monterey Bay Aquarium, NamibiaCam (Gondwana Collection Namibia), and streams of Sakurajima, Mount Fuji
  and Shibuya. Their sound is never played.
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
- **The fluid in Smoke:** Jos Stam, "Stable Fluids" (1999), with vorticity confinement, buoyancy, and obstacles as in GPU Gems
  (Mark Harris, "Fast Fluid Dynamics Simulation on the GPU", 2004, simplified to masking).
- **The smoke in Wind:** semi-Lagrangian advection (the same paper) in the real wind field; the way of showing wind owes to
  Cameron Beccario's earth.nullschool.net and to Refik Anadol's wind "data paintings".

## Type
Anybody (Etcetera Type Company) and JetBrains Mono, both SIL Open Font License, from Google Fonts.

## Ideas it leans on
teamLab's rooms that answer a hand. Ryoji Ikeda's exact, monochrome data. Refik Anadol's data as pigment. Cameron Beccario's
earth.nullschool.net. Rafael Lozano-Hemmer's pulses. (Bioluminescent plankton, behind the Bloom world, now archived.)
