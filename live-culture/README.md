# Live Culture, live

The same playground as the Live Culture artifact, served from your own Cloudflare Worker so it can read the world as it is now and show live video. The artifact can do neither: a Claude artifact may not fetch anything from another site or show outside video, so it carries a snapshot.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adamthabo/hello/tree/main/live-culture)

## Deploy

**One click:** press the button above, sign in to Cloudflare (the free plan is enough), keep the defaults and deploy. Your copy lives at `https://live-culture.<your-subdomain>.workers.dev`. Cloudflare makes a repository of its own for it in your GitHub account; anything pushed there later deploys by itself.

**Terminal:** `npx wrangler deploy` in this folder.

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
| Live cameras | YouTube live streams: the space station (Sen), the northern lights at Churchill (explore.org), Starbase (NASASpaceflight), Monterey Bay Aquarium, a waterhole in the Namib (NamibiaCam), Sakurajima, Mount Fuji, Shibuya | live |

In the Live world the window sits over the Earth, turned to where the camera is; the readout gives the place's hour by the Sun, the Sun's height, the wind there, the satellites above its horizon. Swipe for the next camera east or west, tap a mark on the globe to go there, spread two fingers to come closer. The cameras' own sound is never played: the band is the sound. A camera that is off the air is passed over; if YouTube's player cannot load at all, the satellites' pictures of the whole Earth are shown instead.

## What the Worker does and does not do

`worker.js` answers three kinds of request and nothing else:

- `/api/feed/<name>`: one source from its fixed list (`FEEDS`), fetched for the page and kept in memory for a few minutes. Each source lists where to get it, best first (the official source, then public mirrors); if all fail, the last good copy is served with its own time.
- `/api/cams`: the list of cameras (`CAMS`).
- `/api/yt/<camera>`: which video a camera is streaming now (streams restart and change their address).

It is not an open proxy: names outside its lists get a 404. It stores nothing. CelesTrak asks that the same list be fetched at most every two hours; the Worker keeps it that long.

**To add a camera:** copy a line in `CAMS`, give it a short id (a-z, 0-9, -), a name and place, its latitude and longitude, and either the stream's video id (`v`) or the channel's handle (`c`, without the @). Push; it deploys.

## The source

`dev/` holds the whole source of the page (it is the same as in the artifact's `dev/` folder): `python3 -I build.py` builds `app/index.html` (the artifact) and `hosted/index.html` (this one, with `HOSTED=1` and the Live world), and `sh tools/pack_hosted.sh` copies it into `public/`. `dev/docs/README.md` has the rules the owner set (no horns, nothing loud, the band is his, nothing about him on the page) and the tests. `node tools/hostmock.mjs` serves this version on one machine with the real `worker.js` answering and every source played from local files (fetched first with `python3 -I tools/feed.py`); `node tools/t_hosted.js` checks it.
