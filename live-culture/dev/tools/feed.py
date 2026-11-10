# Fetches what the page shows as "now": every satellite's orbit, the wind over the whole Earth, the aurora, and the lightning the
# weather satellites are seeing. The session shell can only reach GitHub, so each comes from a public GitHub mirror that someone
# else's scheduled job keeps fresh (credits in REFERENCES.md):
#   orbits     CelesTrak element sets            satvisorcom/satvisor-data            (its busy groups every few hours, the big "active"
#                                                                                      list only every week or two) and
#                                                astrion-tech/celestrak-mirror        (eight groups, a few times a day),
#                                                ztimson/satellites and PeanutButte7/satellite-globe-proxy (the whole active list, a
#                                                few times a day: these two are what keep nearly every orbit under a day old).
#              Every group of both is fetched, because the freshest orbit of a satellite may be in any of them: tools/gen_live.py keeps,
#              for each satellite, the one measured last.
#   wind       NOAA GFS, 10 m wind, 1 degree     aaronyooht/wingmate-wind-data        (each 6-hourly model run)
#   aurora     NOAA SWPC OVATION forecast        GefeiSHEN/NOAA-Aurora-Archive        (every few minutes)
#   lightning  NOAA GOES GLM, last 30 minutes    Meteoscience1/lightning-strikes-data (every 10 minutes)
#   fires      NASA FIRMS, the strongest fires   juvenile454/planetary-lens-live-data  (every 15 minutes)
#              seen from orbit in 24 hours
#   storms     tropical cyclones: NOAA NHC and   metacog-osint/elements               (hourly)
#              GDACS (EC JRC and UN OCHA)
#   catalogue  CelesTrak SATCAT (who launched what, when, from where, how big)   astrion-tech/celestrak-mirror (daily)
#              SatNOGS (radio transmitters) and standard magnitudes              satvisorcom/satvisor-data
# Everything is checked before it replaces what was there; a source that fails keeps its previous file, so a refresh never breaks the page.
# usage: python3 -I tools/feed.py        (from the folder that holds src/, data/, tools/)   then: python3 -I tools/gen_live.py
import json, os, re, sys, time, urllib.request, datetime
RAW = 'https://raw.githubusercontent.com/'
D = 'data/live/'
os.makedirs(D + 'tle', exist_ok=True)
GROUPS = ['active', 'stations', 'visual', 'starlink', 'oneweb', 'kuiper', 'qianfan', 'hulianwang', 'gps-ops', 'galileo', 'glo-ops', 'beidou',
          'geo', 'weather', 'goes', 'resource', 'planet', 'spire', 'science', 'radar', 'iridium-NEXT', 'globalstar', 'orbcomm', 'military',
          'amateur', 'argos', 'cubesat', 'dmc', 'education', 'engineering', 'eutelsat', 'geodetic', 'gnss', 'intelsat', 'last-30-days', 'musson',
          'nnss', 'noaa', 'other-comm', 'other', 'sarsat', 'satnogs', 'sbas', 'ses', 'tdrss', 'telesat', 'x-comm',
          'fengyun-1c-debris', 'cosmos-2251-debris', 'iridium-33-debris', 'cosmos-1408-debris']
# the second mirror's copies are kept beside the first's, as a-<group>.tle
ASTRION = ['geo', 'military', 'oneweb', 'resource', 'science', 'starlink', 'stations', 'weather']
# two more copies of the whole active list, kept as z-active.tle and p-active.tle
MORE = [('z-active', 'ztimson/satellites/master/satellites.tle'), ('p-active', 'PeanutButte7/satellite-globe-proxy/main/snapshots/active.tle')]
def get(url, tries=3):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'live-culture-feed'})
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            last = e; time.sleep(1.5 * (k + 1))
    raise last
def keep(path, body):
    open(path + '.tmp', 'wb').write(body); os.replace(path + '.tmp', path)
def tle_ok(l):
    if not re.match(r'^[12] [0-9A-Z .+\-]{66}[0-9]$', l): return False
    return sum(int(c) if c.isdigit() else (1 if c == '-' else 0) for c in l[:68]) % 10 == int(l[68])
report = {}; now = datetime.datetime.now(datetime.timezone.utc)

# ---- orbits ----
ok = 0; bad = []
for g, url in [(g, RAW + 'satvisorcom/satvisor-data/master/celestrak/tle/%s.tle' % g) for g in GROUPS] + [('a-' + g, RAW + 'astrion-tech/celestrak-mirror/main/tle/%s.tle' % g) for g in ASTRION] + [(g, RAW + u) for g, u in MORE]:
    try:
        b = get(url)
        lines = [l.rstrip('\r') for l in b.decode('ascii', 'replace').split('\n') if l.strip()]
        assert len(lines) % 3 == 0, 'lines not in threes'
        n = len(lines) // 3; good = sum(1 for i in range(n) if tle_ok(lines[i * 3 + 1]) and tle_ok(lines[i * 3 + 2]))
        assert good >= n * .98, 'checksums fail: %d of %d' % (n - good, n)
        if g.endswith('active'): assert n > 8000, 'the active list is short: %d' % n
        keep(D + 'tle/%s.tle' % g, b); ok += 1
    except Exception as e: bad.append('%s (%s)' % (g, e))
try:
    m = json.loads(get(RAW + 'satvisorcom/satvisor-data/master/manifest.json')); assert re.match(r'^\d{4}-\d\d-\d\dT', m['generatedAt'])
    keep(D + 'sat_manifest.json', json.dumps({'generatedAt': m['generatedAt']}).encode())
except Exception as e: bad.append('manifest (%s)' % e)
report['orbits'] = '%d of %d groups' % (ok, len(GROUPS) + len(ASTRION) + len(MORE)) + ('; kept old: ' + ', '.join(bad) if bad else '')

# ---- the catalogue: facts about each object ----
try:
    b = get(RAW + 'astrion-tech/celestrak-mirror/main/satcat/satcat.csv'); head = b[:200].decode('ascii', 'replace').split('\n')[0]
    assert head.startswith('OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE') and len(b) > 3000000, 'not the catalogue'
    keep(D + 'satcat.csv', b); report['catalogue'] = '%d bytes' % len(b)
except Exception as e: report['catalogue'] = 'kept old (%s)' % e
for nm in ('satnogs', 'stdmag'):
    try:
        b = get(RAW + 'satvisorcom/satvisor-data/master/catalog/%s.json' % nm); assert isinstance(json.loads(b), dict) and len(b) > 50000
        keep(D + nm + '.json', b)
    except Exception as e: report[nm] = 'kept old (%s)' % e

# ---- wind ----
try:
    b = get(RAW + 'aaronyooht/wingmate-wind-data/master/docs/wind-global-1deg.json'); w = json.loads(b)
    assert len(w) == 2
    for r in w:
        h = r['header']; assert h['nx'] == 360 and h['ny'] == 181 and h['la1'] == 90 and h['lo1'] == 0 and len(r['data']) == 65160
        assert all(isinstance(v, (int, float)) and -120 < v < 120 for v in r['data'][::97])
    assert w[0]['header']['parameterNumber'] == 2 and w[1]['header']['parameterNumber'] == 3
    ref = datetime.datetime.strptime(w[0]['header']['refTime'][:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=datetime.timezone.utc)
    assert (now - ref).total_seconds() < 4 * 86400, 'the model run is old: %s' % ref
    keep(D + 'wind.json', b); report['wind'] = 'GFS run of ' + ref.strftime('%Y-%m-%d %H:%MZ')
except Exception as e: report['wind'] = 'kept old (%s)' % e

# ---- aurora ----
try:
    idx = json.loads(get(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/OVATION/latest.json'))['snapshot']
    assert re.match(r'^OVATION/\d{4}/\d\d/\d\d/[0-9TZ\-a-f]+\.json$', idx['path']), idx['path']
    b = get(RAW + 'GefeiSHEN/NOAA-Aurora-Archive/main/' + idx['path']); a = json.loads(b)
    assert len(a['coordinates']) == 65160 and all(len(c) == 3 and 0 <= c[2] <= 100 for c in a['coordinates'][::53])
    assert re.match(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$', a['Forecast Time']) and re.match(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$', a['Observation Time'])
    keep(D + 'aurora.json', b); report['aurora'] = 'forecast for ' + a['Forecast Time']
except Exception as e: report['aurora'] = 'kept old (%s)' % e

# ---- lightning ----
try:
    b = get(RAW + 'Meteoscience1/lightning-strikes-data/main/recent_strikes.json'); s = json.loads(b)
    assert isinstance(s['strikes'], list) and isinstance(s['updated_at'], (int, float))
    assert all(-90 <= float(x['lat']) <= 90 and -180 <= float(x['lon']) <= 180 and x['time'] > 1e9 for x in s['strikes'][:400])
    keep(D + 'strikes.json', b)
    report['lightning'] = '%d flashes, list of %s' % (len(s['strikes']), datetime.datetime.fromtimestamp(s['updated_at'], datetime.timezone.utc).strftime('%Y-%m-%d %H:%MZ'))
except Exception as e: report['lightning'] = 'kept old (%s)' % e

# ---- fires: the strongest seen from orbit in the last 24 hours (NASA FIRMS; MODIS on Terra and Aqua, VIIRS on NOAA-20 and NOAA-21) ----
try:
    b = get(RAW + 'juvenile454/planetary-lens-live-data/main/data/fire-hotspots-v2.json'); f = json.loads(b)
    assert f['coverage'] == 'world' and isinstance(f['hotspots'], list) and len(f['hotspots']) >= 5 and f['generatedAtMillis'] > 1.6e12
    assert all(-90 <= float(x['lat']) <= 90 and -180.01 <= float(x['lon']) <= 180.01 and float(x['frp']) > 0 and x['time'] > 1.6e12 for x in f['hotspots'])
    assert (now.timestamp() * 1000 - f['generatedAtMillis']) < 3 * 86400000, 'the fire list is old'
    keep(D + 'fires.json', b); report['fires'] = '%d fires, list of %s' % (len(f['hotspots']), datetime.datetime.fromtimestamp(f['generatedAtMillis'] / 1000, datetime.timezone.utc).strftime('%Y-%m-%d %H:%MZ'))
except Exception as e: report['fires'] = 'kept old (%s)' % e

# ---- storms: the tropical cyclones turning now ----
for nm in ('nhc', 'gdacs'):
    try:
        b = get(RAW + 'metacog-osint/elements/main/data/%s.json' % nm); assert isinstance(json.loads(b)['records'], list)
        keep(D + nm + '.json', b)
    except Exception as e: report[nm] = 'kept old (%s)' % e
try:
    h = json.loads(get(RAW + 'metacog-osint/elements/main/data/health.json')); keep(D + 'haz_health.json', json.dumps({k: h[k] for k in ('nhc', 'gdacs') if k in h}).encode())
except Exception as e: report['storm times'] = 'kept old (%s)' % e

keep(D + 'fetched.json', json.dumps({'at': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'report': report}).encode())
for k, v in report.items(): print('%-10s %s' % (k, v))
missing = [f for f in ('wind.json', 'aurora.json', 'strikes.json') if not os.path.exists(D + f)] + ([] if any(os.path.exists(D + 'tle/%s.tle' % g) for g in ('active', 'z-active', 'p-active')) else ['an active list'])
if missing: print('MISSING', missing); sys.exit(1)
