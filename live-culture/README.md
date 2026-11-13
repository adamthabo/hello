# Live Culture, live

The same playground as the Live Culture artifact, served from your own Cloudflare Worker so it can read the world as it is now and show live video. The artifact can do neither: a Claude artifact may not fetch anything from another site or show outside video, so it carries a snapshot.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adamthabo/hello/tree/main/live-culture)

## Deploy

**One click:** press the button above, sign in to Cloudflare (the free plan is enough), keep the defaults and deploy. Your copy lives at `https://live-culture.<your-subdomain>.workers.dev`. Cloudflare makes a repository of its own for it in your GitHub account; anything pushed there later deploys by itself.

**Terminal:** `npx wrangler deploy` in this folder.

**If the address says "There is nothing here yet":** no build has finished. In Cloudflare open Workers & Pages, then
live-culture: its latest build says whether it worked, and why not. Pushing any change to the repository starts a new build
(the first build after the Deploy button once never reported back, and a later push was once not picked up; the next push, even an empty commit, deployed in under a minute). A brand-new
workers.dev address can also take a few minutes to start answering.

Nothing to set up: no keys, no accounts, no settings. Every source it reads is public.

## What is live here

| What | Where it comes from | How fresh |
|---|---|---|
| Satellites | CelesTrak element sets for every working satellite and four clouds of wreckage, read again every three hours; positions worked out on the device every frame, in real time | the orbits: hours; the positions: now |
| Wind | NOAA GFS, 10 m wind, one value a degree (converted by github.com/aaronyooht/wingmate-wind-data) | each 6-hourly model run |
| Clouds | EUMETSAT's world cloud map from the geostationary satellites (made into a picture by Matt Eason, clouds.matteason.co.uk) | every 3 hours |
| Rain | NASA IMERG precipitation rate from the GPM satellites, drawn by NASA GIBS | the newest half hour, about 4 hours behind |
| Sun | worked out on the device: where it stands overhead, where it shines on clear ground, the bands of dusk | now |
| Aurora | NOAA SWPC OVATION forecast | every 5 minutes |
| Lightning | NOAA GOES GLM, the last half hour (github.com/Meteoscience1/lightning-strikes-data) | every 10 minutes |
| Fires | NASA FIRMS, the strongest of the last day (github.com/juvenile454/planetary-lens-live-data) | every 15 minutes |
| Storms | NOAA National Hurricane Center and GDACS (github.com/metacog-osint/elements) | hourly |
| The whole Earth | NOAA GOES-19 and GOES-18 full-disk GeoColor pictures | every 10 minutes |
| Heat | NOAA GFS, the temperature two metres up, from the newest run's analysis (one value a degree) | each 6-hourly run |
| Pressure | NOAA GFS, the air pressure at sea level: lines every 4 hPa, the highs and lows named | each 6-hourly run |
| Jet streams | NOAA GFS, the wind at 250 hPa, about ten kilometres up | each 6-hourly run |
| Waves | NOAA's wave model (GFS-Wave), the height of the sea's waves | each 6-hourly run |
| A place, up close | Open-Meteo's forecast for the place you tap: now, the next 24 hours, three days; the rain radar of the last hour or so from RainViewer, over a dark map by CARTO from OpenStreetMap | radar every 10 minutes |
| Live cameras | YouTube live streams, 84 of them, plus the two satellites' pictures, in eight kinds: animals (13: polar bears at Churchill, waterholes in Kenya, South Africa, Namibia and Zimbabwe, giant pandas, bird feeders, an eagle's nest, gorillas); volcanoes (8: Kilauea, Etna, Stromboli, Reykjanes, Sakurajima, Popocatépetl, Fuego, Merapi); space (7: the space station twice, Starbase twice, the launch pads, GOES-18 and GOES-19); cities (23, from Times Square and Bourbon Street to Shibuya, Tokyo Tower and Sydney Harbour); the sea (10: sea nettles, the kelp forest, sea otters, the open sea, whale sharks, a reef, Waikiki, the Space Coast, Bondi, Nazaré's big waves); night skies (7: northern lights at Churchill, Posio, Abisko, Tromsø, Yellowknife and Fairbanks, the sky over Maunakea); mountains (10: Fuji, the Matterhorn, the Jungfrau, the Dolomites, the Tatras, Old Faithful, Niagara, Banff, Kirkjufell, the Grand Canyon); planes, trains and ships (8: Maho Beach, LAX, La Grange, Ashland, the Panama Canal, the Bosphorus, Rotterdam, Hamburg) | live |

The clouds and the rain are moved by the wind on the device, between the pictures, so the weather never stands still. Tap any place on the Earth for its card; spread two fingers to come closer. Up close, a tropical storm shows its spiral and where it is headed.

In the Live world the camera fills the screen, and a small Earth in a corner shows where it is; tap the Earth for the map of every camera, tap a mark to go there. Swipe for the next camera east or west; the row of kinds picks animals, volcanoes, space and the rest. Left alone, the picture drifts slowly across the scene. The readout gives the place's hour by the Sun, the Sun's height, the wind there, the satellites above its horizon. The cameras' own sound is never played: the band is the sound. A camera that is off the air, or that YouTube will not let another site play, is passed over without being shown; if YouTube's player cannot load at all, the satellites' pictures of the whole Earth are shown instead.

## What the Worker does and does not do

`worker.js` answers these requests and nothing else:

- `/api/feed/<name>`: one source from its fixed list (`FEEDS`), fetched for the page and kept in memory for a few minutes. Each source lists where to get it, best first (the official source, then public mirrors); if all fail, the last good copy is served with its own time.
- `/api/cams`: the list of cameras (`CAMS`) and their kinds (`THEMES`).
- `/api/yt/<camera>`: which video a camera is streaming now (streams restart and change their address); `/api/live?ids=a,b,c` asks the same for up to eight cameras at once. A camera is found by its video addresses first, then by what its channel is streaming now, then by a search of what is live on YouTube (its title and its channel must match, and a film looped as a "live" stream is passed over).
- `/api/gfs/<field>`: one field of NOAA's GFS model, now (`t2m`, `mslp`, `jet`, `wave`). From NOAA's copy on Amazon's open data, then NOAA's own server; the run's index says where the field lies in the file, so only that part is fetched (a few hundred KB) and passed to the page as it is, GRIB2, for the page to read.
- `/api/wx?lat=&lon=`: the weather at one place from Open-Meteo, now and for the next three days.

Cloudflare's free plan gives a request fifty fetches and a few milliseconds of work: the Worker keeps within both (a request spends at most 46 fetches, what it finds is kept for a while, and the weather model is passed on, not read).

It is not an open proxy: names outside its lists get a 404. It stores nothing. CelesTrak asks that the same list be fetched at most every two hours; the Worker keeps it that long.

**To add a camera:** copy a line in `CAMS` (they run west to east, so a swipe goes round the world), give it a short id (a-z, 0-9, -), its kind (`t`), a name and place, its latitude and longitude, and a way to find the stream: its video ids (`v`, tried in order), its channel (`c`: its handle without the @, or its id beginning UC) and/or a search (`s`: the words, the title it must have, the channel it must come from). Push; it deploys. A camera that is off the air is passed over.

RainViewer's radar is free for personal use, up to zoom 7, and the card stays within that; the card credits Open-Meteo, RainViewer, OpenStreetMap and CARTO.

## The source

`dev/` holds the whole source of the page (it is the same as in the artifact's `dev/` folder): `python3 -I build.py` builds `app/index.html` (the artifact) and `hosted/index.html` (this one, with `HOSTED=1` and the Live world), and `sh tools/pack_hosted.sh` copies it into `public/`. `dev/README.md` has the rules the owner set (no horns, nothing loud, the band is his, nothing about him on the page) and the tests; `node tools/hostmock.mjs` serves this version on the machine with the real `worker.js` and stand-in sources, and `node tools/t_hosted.js` checks it.
