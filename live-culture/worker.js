// Live Culture, served from your own Cloudflare Worker.
//
// The page, its sounds and its pictures are the static files in ./public. This script answers only what starts with /api/:
//   /api/feed/<name>  one public data source from the list FEEDS below, fetched for the page and kept for a few minutes
//   /api/cams         the live cameras the page's Live world shows (CAMS below)
//   /api/yt/<camera>  which YouTube video one of those cameras is streaming now (streams restart and change their address)
//   /api/live?ids=    the same for up to eight cameras at once
//   /api/gfs/<field>  one field of NOAA's weather model, now (temperature, pressure, the jet streams, the waves), as GRIB2
//   /api/wx?lat=&lon= the weather at one place, now and for the next three days (Open-Meteo)
// Nothing else is forwarded and nothing is stored beyond a few minutes in memory. No keys, no accounts, nothing to set up.
//
// Every source is public. Each feed lists where to get it, best first: the official source, then public mirrors of it on GitHub.
// If every source of a feed fails, the last good copy is served, however old, with its own time (the page shows the data's time).
// Every picture is served from here, so the page may draw it onto the globe (a browser lets a page read only pictures from its own site).

const RAW = 'https://raw.githubusercontent.com/';
const CT = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP=';
const SV = RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/';
const UA = 'live-culture/1.0 (a personal page that reads public data a few times an hour)';

// name: how long a copy is good for (seconds), what it must look like, and where to get it
const FEEDS = {
  // every working satellite's orbit (CelesTrak asks that the same list be fetched no more than once every two hours)
  'tle-active': { ttl: 7200, kind: 'tle', min: 500000, src: [CT + 'active', RAW + 'ztimson/satellites/master/satellites.tle', RAW + 'PeanutButte7/satellite-globe-proxy/main/snapshots/active.tle', SV + 'active.tle'] },
  'tle-fengyun-1c-debris': { ttl: 43200, kind: 'tle', min: 2000, src: [CT + 'fengyun-1c-debris', SV + 'fengyun-1c-debris.tle'] },
  'tle-cosmos-2251-debris': { ttl: 43200, kind: 'tle', min: 2000, src: [CT + 'cosmos-2251-debris', SV + 'cosmos-2251-debris.tle'] },
  'tle-iridium-33-debris': { ttl: 43200, kind: 'tle', min: 1000, src: [CT + 'iridium-33-debris', SV + 'iridium-33-debris.tle'] },
  'tle-cosmos-1408-debris': { ttl: 43200, kind: 'tle', min: 200, src: [CT + 'cosmos-1408-debris', SV + 'cosmos-1408-debris.tle'] },
  // NOAA's GFS model: the wind ten metres up, one value a degree, each six-hourly run (as converted to JSON by a public repository)
  'wind': { ttl: 1800, kind: 'json', min: 100000, src: [RAW + 'aaronyooht/wingmate-wind-data/master/docs/wind-global-1deg.json'] },
  // NOAA SWPC: where the aurora is expected in the next half hour
  'aurora': { ttl: 300, kind: 'json', min: 100000, src: ['https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', 'aurora-archive'] },
  // the lightning of the last half hour, as NOAA's GOES satellites saw it
  'strikes': { ttl: 240, kind: 'json', min: 20, src: [RAW + 'Meteoscience1/lightning-strikes-data/main/recent_strikes.json'] },
  // NASA FIRMS: the strongest fires of the last day
  'fires': { ttl: 900, kind: 'json', min: 100, src: [RAW + 'juvenile454/planetary-lens-live-data/main/data/fire-hotspots-v2.json'] },
  // tropical storms: NOAA's National Hurricane Center, and GDACS (EC Joint Research Centre and UN OCHA) for the rest of the world
  'nhc': { ttl: 1800, kind: 'json', min: 10, src: [RAW + 'metacog-osint/elements/main/data/nhc.json'] },
  'gdacs': { ttl: 1800, kind: 'json', min: 10, src: [RAW + 'metacog-osint/elements/main/data/gdacs.json'] },
  // the clouds of the whole Earth from the geostationary satellites (EUMETSAT's world cloud map, every three hours, by Matt Eason)
  'clouds': { ttl: 3600, kind: 'jpeg', min: 50000, src: ['https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg'] },
  // the rain of the last half hour, measured from orbit (NASA IMERG, from the GPM constellation, as NASA GIBS draws it for the whole Earth).
  // IMERG's first estimate comes about four hours after the rain, so the newest half hour is looked for a few hours back, then GIBS's default
  'rain': { ttl: 1800, kind: 'png', min: 30000, src: ['imerg:4.5', 'imerg:5.5', 'imerg:7', 'imerg:default'] },
  // the whole Earth as two of NOAA's weather satellites see it now (GeoColor, a new picture every ten minutes)
  'goes-east': { ttl: 540, kind: 'jpeg', min: 50000, src: ['https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg'] },
  'goes-west': { ttl: 540, kind: 'jpeg', min: 50000, src: ['https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/1808x1808.jpg'] },
  // the rain radars of the world, as RainViewer gathers them: which pictures there are (the last two hours, every ten minutes)
  'radar': { ttl: 240, kind: 'json', min: 100, src: ['https://api.rainviewer.com/public/weather-maps.json'] },
};
const TYPE = { tle: 'text/plain; charset=utf-8', json: 'application/json', jpeg: 'image/jpeg', png: 'image/png' };
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/png&TRANSPARENT=TRUE&LAYERS=IMERG_Precipitation_Rate';

// The live cameras, in eight themes (t: wild, fire, space, city, sea, sky, land, move). kind 'yt': a YouTube stream, found by the video
// addresses in v (tried first), then the channels in c (whatever the channel is streaming now), then a search of what is live now
// (s: words to search for, the title it must have, the channel it must come from): streams restart and change their address, and a
// search finds the new one. kind 'img': a still from one of the feeds above. best: when the place looks best ('day', 'night', 'any').
// To add a camera: copy a line, give it a short id (a-z, 0-9, -), its theme and place, and a way to find its stream.
// the themes, in the order the page shows them
const THEMES = [['wild', 'animals'], ['fire', 'volcanoes'], ['space', 'space'], ['city', 'cities'], ['sea', 'the sea'], ['sky', 'night skies'], ['land', 'mountains'], ['move', 'planes, trains, ships']];
const NOT = '(music|relax|sleep|ambient|lofi|asmr|meditat|screensaver|compilation|highlight|timelapse|time-lapse|replay|recorded|4k video|drone)';
const CAMS = [
  // wild
  { id: 'polarbears', t: 'wild', kind: 'yt', name: 'Polar bears waiting for the ice', place: 'Churchill, Manitoba', lat: 58.75, lon: -93.9, v: ['3h3AN3V3vpQ', 'a8sBOIbE38o', 'gVySUhR6jlE'], s: ['polar bear cam explore.org live', 'polar bear', 'explore'], best: 'day' },
  { id: 'wapusk', t: 'wild', kind: 'yt', name: 'Cape Churchill', place: 'Wapusk National Park, Manitoba', lat: 58.78, lon: -93.2, s: ['cape churchill cam explore.org', 'cape (east|south|churchill)|wapusk', 'explore'], best: 'day' },
  { id: 'mpala', t: 'wild', kind: 'yt', name: 'A watering hole', place: 'Mpala, Kenya', lat: 0.29, lon: 36.9, s: ['african watering hole cam explore.org', 'watering hole|mpala', 'explore'], best: 'any' },
  { id: 'tembe', t: 'wild', kind: 'yt', name: 'Elephants at Tembe', place: 'Tembe Elephant Park, South Africa', lat: -26.95, lon: 32.45, s: ['africam tembe elephant park live', 'tembe', 'explore|africam'], best: 'any' },
  { id: 'olifants', t: 'wild', kind: 'yt', name: 'The Olifants River', place: 'Balule, South Africa', lat: -24.2, lon: 31.1, s: ['africam olifants river live', 'olifants', 'explore|africam'], best: 'day' },
  { id: 'djuma', t: 'wild', kind: 'yt', name: 'The Djuma waterhole', place: 'Sabi Sand, South Africa', lat: -24.8, lon: 31.6, c: ['djumacam'], s: ['djuma waterhole live cam', 'djuma', 'djuma|wildearth'], best: 'any' },
  { id: 'namib', t: 'wild', kind: 'yt', name: 'A waterhole in the Namib', place: 'Gondwana Namib Park, Namibia', lat: -24.86, lon: 15.95, v: ['ydYDqZQpim8'], c: ['NamibiaCam'], best: 'any' },
  { id: 'onguma', t: 'wild', kind: 'yt', name: 'A waterhole by Etosha', place: 'Onguma, Namibia', lat: -18.7417, lon: 17.03, v: ['yuIm1V7Ne7I'], s: ['onguma waterhole live', 'onguma', 'africam|explore|onguma'], best: 'day' },
  { id: 'hwange', t: 'wild', kind: 'yt', name: 'A waterhole in Hwange', place: 'Linkwasha, Zimbabwe', lat: -19.1167, lon: 26.9667, v: ['-rXriX4SiQk'], s: ['hwange waterhole live', 'hwange|linkwasha', 'wilderness|africam'], best: 'day' },
  { id: 'pandas', t: 'wild', kind: 'yt', name: 'Giant pandas', place: 'Sichuan, China', lat: 30.73, lon: 104.15, v: ['GfqxI5Fmu8s'], s: ['ipanda live giant panda 24/7', 'panda', 'ipanda'], best: 'day' },
  { id: 'feeders', t: 'wild', kind: 'yt', name: 'Winter bird feeders', place: 'Manitouwadge, Ontario', lat: 49.12, lon: -85.83, s: ['cornell lab feederwatch cam live', 'feederwatch|feeder', 'cornell'], best: 'day' },
  { id: 'decorah', t: 'wild', kind: 'yt', name: 'A bald eagle nest', place: 'Decorah, Iowa', lat: 43.3, lon: -91.78, s: ['decorah eagles live cam', 'decorah', 'explore|raptor'], best: 'day' },
  { id: 'gorillas', t: 'wild', kind: 'yt', name: 'Gorilla forest', place: 'North Kivu, DR Congo', lat: -0.2, lon: 28.9, s: ['gorilla forest corridor cam explore.org', 'gorilla', 'explore'], best: 'day' },
  // fire
  { id: 'kilauea', t: 'fire', kind: 'yt', name: 'Kilauea volcano', place: 'Hawaii Island', lat: 19.4069, lon: -155.2834, v: ['HggWKlZv9yk', 'Tz5tPqRRv1Y', 'gXKuUyKt8mc'], c: ['doinghawaii'], s: ['kilauea volcano live cam', 'k[iī]lauea|halema', 'usgs|hawaii|volcano'], best: 'any' },
  { id: 'etna', t: 'fire', kind: 'yt', name: 'Mount Etna', place: 'Sicily, Italy', lat: 37.751, lon: 14.9934, v: ['iVP1lcwtQwM', 'nIfISa7Oy5A'], s: ['etna live cam', 'etna', '.'], best: 'any' },
  { id: 'stromboli', t: 'fire', kind: 'yt', name: 'Stromboli', place: 'Aeolian Islands, Italy', lat: 38.79, lon: 15.21, s: ['stromboli live cam', 'stromboli', '.'], best: 'night' },
  { id: 'reykjanes', t: 'fire', kind: 'yt', name: 'The Reykjanes volcanoes', place: 'Iceland', lat: 63.88, lon: -22.45, s: ['iceland volcano live cam', 'reykjanes|sundhn|grindav|iceland|fagradals', '.'], best: 'any' },
  { id: 'sakurajima', t: 'fire', kind: 'yt', name: 'Sakurajima volcano', place: 'from Kagoshima, Japan', lat: 31.6035, lon: 130.5507, v: ['GSJwOX3gZsk'], s: ['sakurajima live camera', 'sakurajima|桜島', '.'], best: 'any' },
  { id: 'popo', t: 'fire', kind: 'yt', name: 'Popocatépetl', place: 'Puebla, Mexico', lat: 19.02, lon: -98.62, s: ['popocatepetl en vivo', 'popocat', '.'], best: 'any' },
  { id: 'fuego', t: 'fire', kind: 'yt', name: 'Volcán de Fuego', place: 'Guatemala', lat: 14.47, lon: -90.88, s: ['volcan de fuego en vivo', 'fuego', '.'], best: 'night' },
  { id: 'merapi', t: 'fire', kind: 'yt', name: 'Merapi volcano', place: 'Java, Indonesia', lat: -7.54, lon: 110.44, s: ['merapi live cam', 'merapi', '.'], best: 'any' },
  // space
  { id: 'iss', t: 'space', kind: 'yt', name: 'Earth from the space station', place: '', lat: 0, lon: 0, moving: 'iss', v: ['fO9e9jnhYK8'], c: ['sen'], s: ['iss live earth from space', 'space station|iss', 'sen|nasa'], best: 'any' },
  { id: 'nasa-iss', t: 'space', kind: 'yt', name: "NASA's camera on the space station", place: '', lat: 0, lon: 0, moving: 'iss', s: ['live video from the international space station official nasa', 'space station|iss', 'nasa'], best: 'any' },
  { id: 'starbase', t: 'space', kind: 'yt', name: 'Starbase', place: 'Boca Chica, Texas', lat: 25.997, lon: -97.156, c: ['NASASpaceflight'], s: ['starbase live', 'starbase|starship|boca chica', 'nasaspaceflight|labpadre'], best: 'any' },
  { id: 'labpadre', t: 'space', kind: 'yt', name: 'Starbase from the river', place: 'Boca Chica, Texas', lat: 25.99, lon: -97.18, s: ['labpadre starbase live', 'starbase|sapphire|rover|starship', 'labpadre'], best: 'any' },
  { id: 'canaveral', t: 'space', kind: 'yt', name: 'The launch pads', place: 'Cape Canaveral, Florida', lat: 28.48, lon: -80.57, s: ['cape canaveral launch pad live cam', 'cape canaveral|kennedy|space coast|launch', '.'], best: 'any' },
  { id: 'goes-west', t: 'space', kind: 'img', name: 'The Earth from GOES-18', place: '35,786 km above 137.2°W', lat: 0, lon: -137.2, img: 'goes-west', every: 600, by: 'NOAA GOES-18 · GeoColor · a new picture every 10 minutes', best: 'any' },
  { id: 'goes-east', t: 'space', kind: 'img', name: 'The Earth from GOES-19', place: '35,786 km above 75.2°W', lat: 0, lon: -75.2, img: 'goes-east', every: 600, by: 'NOAA GOES-19 · GeoColor · a new picture every 10 minutes', best: 'any' },
  // city
  { id: 'timessquare', t: 'city', kind: 'yt', name: 'Times Square', place: 'New York', lat: 40.758, lon: -73.9855, v: ['JQ_jwk_7OVE'], s: ['earthcam times square live', 'times square', 'earthcam'], best: 'any' },
  { id: 'neworleans', t: 'city', kind: 'yt', name: 'Bourbon Street', place: 'New Orleans', lat: 29.9575, lon: -90.0656, s: ['earthcam bourbon street live', 'bourbon', 'earthcam'], best: 'night' },
  { id: 'nashville', t: 'city', kind: 'yt', name: 'Broadway', place: 'Nashville, Tennessee', lat: 36.1612, lon: -86.7775, s: ['earthcam nashville live', 'nashville|broadway', 'earthcam'], best: 'night' },
  { id: 'keywest', t: 'city', kind: 'yt', name: 'Duval Street', place: 'Key West, Florida', lat: 24.5592, lon: -81.8035, s: ['earthcam key west live', 'key west|duval', 'earthcam'], best: 'any' },
  { id: 'vegas', t: 'city', kind: 'yt', name: 'The Las Vegas Strip', place: 'Las Vegas, Nevada', lat: 36.1177, lon: -115.1728, v: ['Y-dnxuExye0'], s: ['las vegas strip live cam', 'las vegas', '.'], best: 'night' },
  { id: 'jackson', t: 'city', kind: 'yt', name: 'Town square', place: 'Jackson Hole, Wyoming', lat: 43.4799, lon: -110.7624, v: ['1EiC9bvVGnk', 'BN7gzH-i-zo'], s: ['jackson hole town square live', 'jackson', '.'], best: 'day' },
  { id: 'vancouver', t: 'city', kind: 'yt', name: 'Vancouver harbour', place: 'Vancouver, British Columbia', lat: 49.2888, lon: -123.1111, c: ['VancouverCityViews'], best: 'any' },
  { id: 'rio', t: 'city', kind: 'yt', name: 'Christ the Redeemer', place: 'Rio de Janeiro, Brazil', lat: -22.9519, lon: -43.2105, v: ['L6hJiLs7c7o', 'WoVyNFnecwk', 'HrZO_GrUwZM', 'c0AZN6rz8Jk', '6QoLEltTzIM'], s: ['rio de janeiro live cam', 'rio de janeiro|cristo|copacabana', '.'], best: 'any' },
  { id: 'london', t: 'city', kind: 'yt', name: 'The Abbey Road crossing', place: 'London', lat: 51.532, lon: -0.1773, s: ['abbey road crossing live cam', 'abbey road', '.'], best: 'day' },
  { id: 'dublin', t: 'city', kind: 'yt', name: 'Temple Bar', place: 'Dublin, Ireland', lat: 53.3455, lon: -6.2642, s: ['earthcam temple bar dublin live', 'temple bar|dublin', 'earthcam'], best: 'any' },
  { id: 'paris', t: 'city', kind: 'yt', name: 'The Eiffel Tower', place: 'Paris', lat: 48.8584, lon: 2.2945, s: ['eiffel tower live cam paris', 'eiffel|paris', '.'], best: 'any' },
  { id: 'amsterdam', t: 'city', kind: 'yt', name: 'Amsterdam', place: 'the Netherlands', lat: 52.3731, lon: 4.8926, c: ['UCCbkDvw6wI4Z5VX3BhSuw7w'], s: ['amsterdam live cam', 'amsterdam|dam square', '.'], best: 'any' },
  { id: 'prague', t: 'city', kind: 'yt', name: 'Old Town Square', place: 'Prague, Czechia', lat: 50.0875, lon: 14.4213, s: ['prague old town square live cam', 'prague|praha', '.'], best: 'any' },
  { id: 'venice', t: 'city', kind: 'yt', name: 'Venice', place: 'Italy', lat: 45.438, lon: 12.3359, c: ['UCMpn1qLudF-zb4M4bqxLIbw'], s: ['venice grand canal live cam', 'venice|venezia|rialto', '.'], best: 'any' },
  { id: 'rome', t: 'city', kind: 'yt', name: "St Peter's Basilica", place: 'Rome, Italy', lat: 41.9022, lon: 12.4539, v: ['89d3tEaqImM'], s: ["st peter's square live cam", 'st\\.? ?peter|vatican|san pietro', '.'], best: 'any' },
  { id: 'dubai', t: 'city', kind: 'yt', name: 'Dubai Marina', place: 'Dubai', lat: 25.08, lon: 55.14, s: ['dubai marina live cam', 'dubai', '.'], best: 'night' },
  { id: 'singapore', t: 'city', kind: 'yt', name: 'Downtown Singapore', place: 'Singapore', lat: 1.2834, lon: 103.8607, v: ['rQ3VvxadJeo'], s: ['singapore marina bay live cam', 'singapore|marina bay', '.'], best: 'any' },
  { id: 'hongkong', t: 'city', kind: 'yt', name: 'Victoria Harbour from the Peak', place: 'Hong Kong', lat: 22.2759, lon: 114.1455, v: ['bNOWG3jcOlQ'], s: ['hong kong victoria harbour live cam', 'hong kong|victoria harbour', '.'], best: 'any' },
  { id: 'seoul', t: 'city', kind: 'yt', name: 'Seoul', place: 'South Korea', lat: 37.5665, lon: 126.978, s: ['seoul live cam', 'seoul|서울', '.'], best: 'any' },
  { id: 'shibuya', t: 'city', kind: 'yt', name: 'The Shibuya crossing', place: 'Tokyo, Japan', lat: 35.6595, lon: 139.7005, v: ['d1JuNg7knNo'], s: ['shibuya scramble crossing live camera', 'shibuya|渋谷', '.'], best: 'any' },
  { id: 'tokyotower', t: 'city', kind: 'yt', name: 'Tokyo Tower', place: 'Tokyo, Japan', lat: 35.6586, lon: 139.7454, s: ['tokyo tower live camera', 'tokyo tower|東京タワー', '.'], best: 'night' },
  { id: 'sydney', t: 'city', kind: 'yt', name: 'Sydney Harbour', place: 'Sydney, Australia', lat: -33.8568, lon: 151.2153, c: ['webcamsydney'], best: 'any' },
  { id: 'auckland', t: 'city', kind: 'yt', name: 'Viaduct Harbour', place: 'Auckland, New Zealand', lat: -36.8431, lon: 174.759, c: ['UCfNoVlW5-BHsoCKTGs_F0WQ'], best: 'any' },
  // sea
  { id: 'monterey', t: 'sea', kind: 'yt', name: 'Sea nettles', place: 'Monterey Bay Aquarium, California', lat: 36.6187, lon: -121.9025, v: ['gswNWtJlUco'], s: ['monterey bay aquarium jelly cam', 'jell|nettle', 'monterey'], best: 'any' },
  { id: 'kelp', t: 'sea', kind: 'yt', name: 'The kelp forest', place: 'Monterey Bay Aquarium, California', lat: 36.618, lon: -121.901, s: ['monterey bay aquarium kelp forest cam', 'kelp', 'monterey'], best: 'any' },
  { id: 'otters', t: 'sea', kind: 'yt', name: 'Sea otters', place: 'Monterey Bay Aquarium, California', lat: 36.6182, lon: -121.9015, s: ['monterey bay aquarium sea otter cam', 'otter', 'monterey'], best: 'day' },
  { id: 'openSea', t: 'sea', kind: 'yt', name: 'The open sea', place: 'Monterey Bay Aquarium, California', lat: 36.6184, lon: -121.9022, s: ['monterey bay aquarium open sea cam', 'open sea|tuna|sharks', 'monterey'], best: 'any' },
  { id: 'voyager', t: 'sea', kind: 'yt', name: 'Whale sharks', place: 'Georgia Aquarium, Atlanta', lat: 33.7634, lon: -84.3951, s: ['georgia aquarium ocean voyager live cam', 'ocean voyager|whale shark', 'georgia aquarium'], best: 'any' },
  { id: 'reef', t: 'sea', kind: 'yt', name: 'A tropical reef', place: 'Aquarium of the Pacific, Long Beach', lat: 33.762, lon: -118.1969, s: ['aquarium of the pacific tropical reef live', 'reef', 'aquarium of the pacific|explore'], best: 'any' },
  { id: 'waikiki', t: 'sea', kind: 'yt', name: 'Waikiki Beach', place: 'Honolulu, Hawaii', lat: 21.276, lon: -157.827, s: ['waikiki beach live cam', 'waikiki', '.'], best: 'day' },
  { id: 'satbeach', t: 'sea', kind: 'yt', name: 'The Space Coast', place: 'Satellite Beach, Florida', lat: 28.1761, lon: -80.5901, c: ['SatelliteBeachLive'], best: 'day' },
  { id: 'bondi', t: 'sea', kind: 'yt', name: 'Bondi Beach', place: 'Sydney, Australia', lat: -33.8915, lon: 151.2767, s: ['bondi beach live cam', 'bondi', '.'], best: 'day' },
  { id: 'nazare', t: 'sea', kind: 'yt', name: 'The big waves', place: 'Nazaré, Portugal', lat: 39.605, lon: -9.085, s: ['nazare live cam waves', 'nazar', '.'], best: 'day' },
  // sky
  { id: 'aurora-churchill', t: 'sky', kind: 'yt', name: 'Northern lights', place: 'Churchill, Manitoba', lat: 58.77, lon: -94.17, v: ['a0i1Kg6fROg'], s: ['northern lights cam explore.org churchill', 'northern lights|aurora', 'explore'], best: 'night' },
  { id: 'posio', t: 'sky', kind: 'yt', name: 'Northern lights', place: 'Posio, Lapland, Finland', lat: 66.1103, lon: 28.1663, v: ['_WtUWtodDVA'], s: ['lapland aurora live cam', 'aurora|northern lights|revontul', '.'], best: 'night' },
  { id: 'abisko', t: 'sky', kind: 'yt', name: 'The sky over Abisko', place: 'Lapland, Sweden', lat: 68.35, lon: 18.82, s: ['abisko aurora live cam', 'abisko', '.'], best: 'night' },
  { id: 'tromso', t: 'sky', kind: 'yt', name: 'The sky over Tromsø', place: 'Norway', lat: 69.65, lon: 18.96, s: ['tromsø aurora live cam', 'troms', '.'], best: 'night' },
  { id: 'yellowknife', t: 'sky', kind: 'yt', name: 'The sky over Yellowknife', place: 'Northwest Territories, Canada', lat: 62.45, lon: -114.37, s: ['yellowknife aurora live cam', 'yellowknife', '.'], best: 'night' },
  { id: 'fairbanks', t: 'sky', kind: 'yt', name: 'The sky over Fairbanks', place: 'Alaska', lat: 64.84, lon: -147.72, s: ['fairbanks alaska aurora live cam', 'fairbanks|alaska', '.'], best: 'night' },
  { id: 'maunakea', t: 'sky', kind: 'yt', name: 'The sky over Maunakea', place: 'Hawaii Island', lat: 19.82, lon: -155.47, s: ['maunakea live sky cam', 'mauna ?kea', '.'], best: 'night' },
  // land
  { id: 'fuji', t: 'land', kind: 'yt', name: 'Mount Fuji', place: 'from Fuji, Shizuoka, Japan', lat: 35.1382, lon: 138.6919, v: ['Sv9hcJ3k5h4'], s: ['mount fuji live camera', 'fuji|富士', '.'], best: 'day' },
  { id: 'matterhorn', t: 'land', kind: 'yt', name: 'The Matterhorn', place: 'Zermatt, Switzerland', lat: 45.9763, lon: 7.6586, s: ['zermatt matterhorn live cam', 'matterhorn|zermatt', '.'], best: 'day' },
  { id: 'jungfrau', t: 'land', kind: 'yt', name: 'The Jungfrau', place: 'Bernese Alps, Switzerland', lat: 46.5475, lon: 7.9851, s: ['jungfraujoch live cam', 'jungfrau', '.'], best: 'day' },
  { id: 'dolomites', t: 'land', kind: 'yt', name: 'The Dolomites', place: 'South Tyrol, Italy', lat: 46.6, lon: 11.9, s: ['dolomites live cam', 'dolomit|seceda|cortina|tre cime', '.'], best: 'day' },
  { id: 'tatras', t: 'land', kind: 'yt', name: 'The Tatras', place: 'Zakopane, Poland', lat: 49.232, lon: 19.982, s: ['kasprowy wierch live', 'kasprowy|zakopane|tatr', '.'], best: 'day' },
  { id: 'oldfaithful', t: 'land', kind: 'yt', name: 'Old Faithful', place: 'Yellowstone, Wyoming', lat: 44.4605, lon: -110.8281, s: ['old faithful geyser live', 'old faithful|yellowstone', '.'], best: 'day' },
  { id: 'niagara', t: 'land', kind: 'yt', name: 'Niagara Falls', place: 'Ontario and New York', lat: 43.0828, lon: -79.0742, s: ['niagara falls live cam', 'niagara', '.'], best: 'any' },
  { id: 'banff', t: 'land', kind: 'yt', name: 'Banff', place: 'Alberta, Canada', lat: 51.178, lon: -115.571, s: ['banff live cam', 'banff|lake louise', '.'], best: 'day' },
  { id: 'kirkjufell', t: 'land', kind: 'yt', name: 'Kirkjufell', place: 'Snæfellsnes, Iceland', lat: 64.9417, lon: -23.3061, s: ['kirkjufell live cam', 'kirkjufell', '.'], best: 'day' },
  { id: 'grandcanyon', t: 'land', kind: 'yt', name: 'The Grand Canyon', place: 'Arizona', lat: 36.0544, lon: -112.1401, s: ['grand canyon live cam', 'grand canyon', '.'], best: 'day' },
  // move
  { id: 'maho', t: 'move', kind: 'yt', name: 'Planes over Maho Beach', place: 'Sint Maarten, Caribbean', lat: 18.0391, lon: -63.1188, v: ['2IQmpCXbOmM', 'iSeH45R-8R0'], s: ['maho beach live cam', 'maho|sxm|princess juliana', '.'], best: 'day' },
  { id: 'lax', t: 'move', kind: 'yt', name: 'Planes at LAX', place: 'Los Angeles', lat: 33.9416, lon: -118.4085, s: ['lax airport live planes', 'lax|los angeles international', '.'], best: 'any' },
  { id: 'lagrange', t: 'move', kind: 'yt', name: 'Trains down Main Street', place: 'La Grange, Kentucky', lat: 38.4076, lon: -85.3789, v: ['_6qGHEi9trg', 'MDiY0SeyfGw', '1s9AHnu99d8'], s: ['virtual railfan la grange kentucky', 'la grange', 'virtual railfan'], best: 'any' },
  { id: 'ashland', t: 'move', kind: 'yt', name: 'Trains through Ashland', place: 'Ashland, Virginia', lat: 37.7593, lon: -77.4778, v: ['zys9cWMwfpY', 'BsZoTLiHA-s', 'VIwzSSGbxZw'], s: ['virtual railfan ashland virginia', 'ashland', 'virtual railfan'], best: 'any' },
  { id: 'panama', t: 'move', kind: 'yt', name: 'Ships in the Panama Canal', place: 'Miraflores Locks, Panama', lat: 9.016, lon: -79.593, s: ['panama canal live cam', 'panama canal|miraflores|canal de panam', '.'], best: 'day' },
  { id: 'bosphorus', t: 'move', kind: 'yt', name: 'Ships on the Bosphorus', place: 'Istanbul, Türkiye', lat: 41.08, lon: 29.05, s: ['bosphorus live cam ships', 'bosphorus|boğaz|bogaz|istanbul', '.'], best: 'any' },
  { id: 'rotterdam', t: 'move', kind: 'yt', name: 'The port of Rotterdam', place: 'the Netherlands', lat: 51.95, lon: 4.14, s: ['port of rotterdam live ships', 'rotterdam', '.'], best: 'any' },
  { id: 'hamburg', t: 'move', kind: 'yt', name: 'The port of Hamburg', place: 'Germany', lat: 53.5444, lon: 9.9667, s: ['hamburg harbour live cam ships', 'hamburg', '.'], best: 'any' },
];
// the order a swipe goes round the world: west to east
CAMS.sort((a, b) => a.lon - b.lon);

const MEM = new Map(); // what has been fetched, for as long as this copy of the Worker is awake (Cloudflare's cache does nothing on workers.dev)

function ok(kind, head, size, min) {
  if (size < min) return false;
  if (kind === 'jpeg') return head[0] === 0xff && head[1] === 0xd8;
  if (kind === 'png') return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const t = new TextDecoder().decode(head).replace(/^﻿/, '').trimStart();
  if (kind === 'json') return t[0] === '{' || t[0] === '[';
  if (kind === 'tle') return /\n1 [0-9 ]{5}[A-Z ] /.test(t) && t[0] !== '<';
  return false;
}

// a source as a URL, and the time its data is for when that is known
function where(src) {
  const m = /^imerg:(default|[\d.]+)$/.exec(src);
  if (!m) return { url: src, time: '' };
  if (m[1] === 'default') return { url: GIBS, time: '' };
  const t = Math.floor((Date.now() - parseFloat(m[1]) * 3600000) / 1800000) * 1800000, iso = new Date(t).toISOString().slice(0, 19) + 'Z';
  return { url: GIBS + '&TIME=' + iso, time: iso };
}
async function upstream(src) {
  if (src === 'aurora-archive') {
    // the same NOAA file, from a public archive that keeps every one: its index names the newest
    const r = await fetch(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/latest.json', { headers: { 'user-agent': UA } });
    if (!r.ok) throw new Error('index ' + r.status);
    const p = (await r.json()).snapshot.path;
    if (!/^OVATION\/\d{4}\/\d\d\/\d\d\/[0-9TZ\-a-f]+\.json$/.test(p)) throw new Error('odd path');
    return fetch(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/' + p, { headers: { 'user-agent': UA } });
  }
  return fetch(where(src).url, { headers: { 'user-agent': UA, accept: '*/*' } });
}

async function feed(name) {
  const f = FEEDS[name], now = Date.now(), m = MEM.get(name);
  if (m && now - m.at < f.ttl * 1000) return m;
  if (m && m.busy) return m;
  if (m) m.busy = true;
  try {
    for (const src of f.src) {
      try {
        const r = await upstream(src);
        if (!r.ok) continue;
        const body = await r.arrayBuffer();
        if (!ok(f.kind, new Uint8Array(body, 0, Math.min(400, body.byteLength)), body.byteLength, f.min)) continue;
        const w = where(src), v = { at: now, body, src: src === 'aurora-archive' ? 'NOAA SWPC (archive)' : w.url, time: w.time, mod: r.headers.get('last-modified') || '' };
        MEM.set(name, v);
        return v;
      } catch (e) { /* the next source */ }
    }
  } finally { if (m) m.busy = false; }
  return m || null;
}

// ---- the weather model: NOAA's GFS, its newest run's picture of now (the analysis), one field at a time ----
// From NOAA's copy on Amazon's open data, then NOAA's own server: each run has an index naming where in the file each field lies, so
// only the field asked for is fetched (a byte range, 100 to 600 KB), as GRIB2; the page reads it itself.
const GFSB = ['https://noaa-gfs-bdp-pds.s3.amazonaws.com/', 'https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/'];
const GF = {
  t2m: { w: 0, m: [':TMP:2 m above ground:anl:'] },            // the temperature two metres up
  mslp: { w: 0, m: [':PRMSL:mean sea level:anl:'] },          // the air pressure, brought down to sea level
  jet: { w: 0, m: [':UGRD:250 mb:anl:', ':VGRD:250 mb:anl:'] }, // the wind at 250 hPa, about ten kilometres up: the jet streams
  wave: { w: 1, m: [':HTSGW:surface:anl:'] },                 // the height of the sea's waves (NOAA's wave model, run with GFS)
};
function gfsFile(day, cyc, w) { return 'gfs.' + day + '/' + cyc + '/' + (w ? 'wave/gridded/gfswave.t' + cyc + 'z.global.0p25.f000.grib2' : 'atmos/gfs.t' + cyc + 'z.pgrb2.1p00.f000'); }
// the newest runs first: a run's analysis is out about three and a half hours after its hour
function gfsRuns() { const out = [], now = Date.now() - 3.4 * 3600000;
  for (let k = 0; k < 5; k++) { const t = new Date(Math.floor(now / 21600000) * 21600000 - k * 21600000), d = t.toISOString();
    out.push({ day: d.slice(0, 4) + d.slice(5, 7) + d.slice(8, 10), cyc: d.slice(11, 13), at: t.toISOString().slice(0, 19) + 'Z' }); }
  return out; }
async function gfsField(name) {
  const f = GF[name], key = 'gfs:' + name, m = MEM.get(key), now = Date.now();
  if (m && now - m.at < 45 * 60000) return m;
  if (m && m.busy) return m;
  if (m) m.busy = true;
  try {
    for (const run of gfsRuns()) for (const base of GFSB) {
      try {
        const url = base + gfsFile(run.day, run.cyc, f.w), ir = await fetch(url + '.idx', { headers: { 'user-agent': UA } });
        if (!ir.ok) continue;
        const lines = (await ir.text()).split('\n').filter(Boolean).map(l => { const p = l.split(':'); return { off: +p[1], txt: ':' + p.slice(3).join(':') }; });
        const parts = [];
        for (const want of f.m) {
          const k = lines.findIndex(l => l.txt.startsWith(want));
          if (k < 0) { parts.length = 0; break; }
          let e = k + 1; while (e < lines.length && lines[e].off === lines[k].off) e++;
          const r = [lines[k].off, e < lines.length ? lines[e].off - 1 : null];
          if (!parts.some(p => p[0] === r[0])) parts.push(r);
        }
        if (!parts.length) continue;
        const bufs = [];
        for (const r of parts) { const g = await fetch(url, { headers: { 'user-agent': UA, range: 'bytes=' + r[0] + '-' + (r[1] === null ? '' : r[1]) } });
          if (g.status !== 206 && g.status !== 200) throw new Error('range ' + g.status);
          const ab = new Uint8Array(await g.arrayBuffer()); if (ab.length < 100 || ab[0] !== 71 || ab[1] !== 82) throw new Error('not grib'); bufs.push(ab); }
        const n = bufs.reduce((a, x) => a + x.length, 0), body = new Uint8Array(n); let o = 0; for (const x of bufs) { body.set(x, o); o += x.length; }
        const v = { at: now, body: body.buffer, src: base, time: run.at };
        MEM.set(key, v);
        return v;
      } catch (e) { /* the next copy, or the run before */ }
    }
  } finally { if (m) m.busy = false; }
  return m || null;
}

// ---- YouTube: which video a camera is showing now ----
const YTUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
// B: what one request may still spend (Cloudflare allows a Worker fifty fetches a request)
async function ytPage(path, B) {
  if (B) { if (B.n <= 0) throw new Error('budget'); B.n--; }
  const r = await fetch('https://www.youtube.com/' + path, { headers: { 'user-agent': YTUA, 'accept-language': 'en-US,en;q=0.8', cookie: 'CONSENT=YES+cb; SOCS=CAI' } });
  return r.ok ? await r.text() : '';
}
// the videos live now that a search of YouTube finds (its "Live" filter): id, title, channel
async function ytSearch(q, B) {
  const key = 'ys:' + q, m = MEM.get(key), now = Date.now();
  if (m && now - m.at < 20 * 60000) return m.v;
  const t = await ytPage('results?search_query=' + encodeURIComponent(q) + '&sp=EgJAAQ%253D%253D', B);
  const out = [];
  let i = 0;
  while (out.length < 20 && (i = t.indexOf('"videoRenderer":{"videoId":"', i)) >= 0) {
    const id = t.substr(i + 28, 11), w = t.substr(i, 7000); i += 28;
    if (!/^[\w-]{11}$/.test(id)) continue;
    const ti = /"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/.exec(w), ch = /"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/.exec(w);
    const live = w.includes('BADGE_STYLE_TYPE_LIVE_NOW') || w.includes('"style":"LIVE"');
    if (live) out.push({ id, title: ti ? JSON.parse('"' + ti[1] + '"') : '', ch: ch ? JSON.parse('"' + ch[1] + '"') : '' });
  }
  if (t) MEM.set(key, { at: now, v: out });
  return out;
}
// what a watch page says: on the air now, and whether it may be played on another site
function ytSays(t) {
  if (!t) return null;
  const title = /<meta name="title" content="([^"]*)"/.exec(t), ch = /"ownerChannelName":"((?:[^"\\]|\\.)*)"/.exec(t);
  return { live: t.includes('"isLiveNow":true'), off: t.includes('"isLiveNow":false') || t.includes('"playabilityStatus":{"status":"ERROR"') || t.includes('"status":"LOGIN_REQUIRED"'),
    embed: !t.includes('"playableInEmbed":false'), title: title ? title[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '', ch: ch ? JSON.parse('"' + ch[1] + '"') : '' };
}
// which video a camera is showing now: { id, live, title, ch }. live: true (on the air), false (not), null (YouTube did not say: the
// page tries the first address on the list)
async function ytNow(cam, B) {
  const key = 'yt:' + cam.id, m = MEM.get(key), now = Date.now();
  if (m && now - m.at < (m.v.id ? 15 : 6) * 60000) return m.v;
  let out = { id: null, live: null }, said = false;
  try {
    for (const id of cam.v || []) {
      const k = ytSays(await ytPage('watch?v=' + id, B));
      if (!k) continue;
      said = true;
      if (k.live && k.embed) { out = { id, live: true, title: k.title, ch: k.ch }; break; }
    }
    if (!out.id) for (const c of cam.c || []) {
      // a handle (sen), or a channel's own id (UC and 22 more) for channels that have no handle
      const t = await ytPage((/^UC[\w-]{22}$/.test(c) ? 'channel/' + c : '@' + c) + '/live', B);
      const v = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(t), k = ytSays(t);
      if (t) said = true;
      if (v && k && k.live && k.embed) { out = { id: v[1], live: true, title: k.title, ch: k.ch }; break; }
    }
    if (!out.id && cam.s) {
      // a search for what is live now: the first with the title and the channel asked for, and none of the looped films posing as cameras
      const [q, tr, cr] = cam.s, T = new RegExp(tr, 'i'), C = new RegExp(cr, 'i'), N = new RegExp(NOT, 'i');
      const hits = await ytSearch(q, B);
      if (hits.length) said = true;
      for (const h of hits) if (T.test(h.title) && C.test(h.ch) && !N.test(h.title)) {
        // the search does not say whether it may be played elsewhere: the watch page does
        const k = ytSays(await ytPage('watch?v=' + h.id, B));
        if (k && k.live && !k.embed) continue;
        out = { id: h.id, live: true, title: h.title, ch: h.ch }; break;
      }
    }
    if (!out.id && said) out = { id: null, live: false };
  } catch (e) { if (out.id) { MEM.set(key, { at: now, v: out }); return out; } return { id: null, live: null }; }
  MEM.set(key, { at: now, v: out });
  return out;
}

const CORS = { 'access-control-allow-origin': '*' };
function json(o, maxAge) {
  return new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + maxAge, ...CORS } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), p = url.pathname;
    if (!p.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Only GET', { status: 405, headers: CORS });
    let m;
    if ((m = /^\/api\/feed\/([a-z0-9\-]+)$/.exec(p)) && FEEDS[m[1]]) {
      const f = FEEDS[m[1]], v = await feed(m[1]);
      if (!v) return new Response('Not available just now', { status: 503, headers: { 'retry-after': '120', ...CORS } });
      const h = { 'content-type': TYPE[f.kind], 'cache-control': 'public, max-age=' + Math.min(f.ttl, 600), 'x-source': v.src, 'x-fetched': new Date(v.at).toISOString(), ...CORS };
      if (v.mod) h['last-modified'] = v.mod;
      if (v.time) h['x-time'] = v.time;
      return new Response(request.method === 'HEAD' ? null : v.body, { headers: h });
    }
    if ((m = /^\/api\/gfs\/([a-z0-9]+)$/.exec(p)) && GF[m[1]]) {
      const v = await gfsField(m[1]);
      if (!v) return new Response('Not available just now', { status: 503, headers: { 'retry-after': '300', ...CORS } });
      return new Response(request.method === 'HEAD' ? null : v.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=1800', 'x-time': v.time, 'x-source': v.src, ...CORS } });
    }
    // the weather at one place, now and for the next days (Open-Meteo: the national weather services' models), kept ten minutes
    if (p === '/api/wx') {
      const la = +url.searchParams.get('lat'), lo = +url.searchParams.get('lon');
      if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180)) return json({ error: 'where?' }, 60);
      const key = 'wx:' + la.toFixed(1) + ',' + lo.toFixed(1), m = MEM.get(key), now = Date.now();
      if (m && now - m.at < 600000) return json(m.v, 600);
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + la.toFixed(3) + '&longitude=' + lo.toFixed(3) +
          '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day' +
          '&hourly=temperature_2m,precipitation,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset&forecast_days=4&timezone=auto', { headers: { 'user-agent': UA } });
        if (!r.ok) throw new Error('open-meteo ' + r.status);
        const v = await r.json();
        if (MEM.size > 400) for (const k of MEM.keys()) if (k.startsWith('wx:')) MEM.delete(k);
        MEM.set(key, { at: now, v });
        return json(v, 600);
      } catch (e) { return new Response('Not available just now', { status: 503, headers: { 'retry-after': '120', ...CORS } }); }
    }
    if (p === '/api/cams') return json({ cams: CAMS.map(({ c, s, ...k }) => k), themes: THEMES }, 600);
    // several cameras at once (the page asks for a theme's worth as it goes): no more than eight, each as /api/yt/ would answer
    if (p === '/api/live') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(x => /^[a-z0-9\-]{1,24}$/.test(x)).slice(0, 8), out = {};
      const B = { n: 46 };
      await Promise.all(ids.map(async id => { const cam = CAMS.find(x => x.id === id && x.kind === 'yt'); if (cam) out[id] = await ytNow(cam, B); }));
      return json(out, 300);
    }
    if ((m = /^\/api\/yt\/([a-z0-9\-]+)$/.exec(p))) {
      const cam = CAMS.find(x => x.id === m[1] && x.kind === 'yt');
      if (!cam) return json({ error: 'no such camera' }, 60);
      return json(await ytNow(cam, { n: 46 }), 300);
    }
    return new Response('Not found', { status: 404, headers: CORS });
  },
};
