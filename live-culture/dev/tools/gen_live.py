# Packs what tools/feed.py fetched into the one file the page reads at start (app/data/live.json) and into the documents a refresh
# writes to the page's store (data/db_*.json: the same four things, one document each, plus a small stamp that says how new each is).
#   sats     every active satellite and four clouds of wreckage: 20 bytes each (see REC below), names in one string
#   wind     360 x 181 pairs of bytes: east and north wind in steps of 40/127 m/s, rows from the north pole down, columns from 0 E
#   aurora   360 x 181 bytes: NOAA's chance of aurora, 0 to 100, same layout
#   strikes  6 bytes a flash: latitude and longitude in hundredths of a degree, seconds before the list's own time
#   fires    10 bytes a fire: latitude and longitude in hundredths of a degree, its radiative power in megawatts, minutes before the
#            list's own time, which satellite saw it (a place in the list "sats"), and how sure the detection is (0 to 100)
#   storms   the tropical cyclones turning now, as a short list
# usage: python3 -I tools/gen_live.py      (after tools/feed.py)
import json, os, re, struct, base64, datetime, math, glob, csv
D = 'data/live/'
def iso(dt): return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
def b64(b): return base64.b64encode(bytes(b)).decode()
fetched = json.load(open(D + 'fetched.json'))
asof = datetime.datetime.strptime(fetched['at'], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)
asof_ms = asof.timestamp() * 1000.0

# ---------------- satellites ----------------
def tle_ok(l):
    if not re.match(r'^[12] [0-9A-Z .+\-]{66}[0-9]$', l): return False
    return sum(int(c) if c.isdigit() else (1 if c == '-' else 0) for c in l[:68]) % 10 == int(l[68])
_read = {}
def read(g):
    if g not in _read: _read[g] = read1(g)
    return _read[g]
def read1(g):
    p = D + 'tle/%s.tle' % g
    if not os.path.exists(p): return []
    L = [l.rstrip('\r') for l in open(p, encoding='ascii', errors='replace').read().split('\n') if l.strip()]
    out = []
    for i in range(0, len(L) - 2, 3):
        nm, l1, l2 = L[i], L[i + 1], L[i + 2]
        if not (tle_ok(l1) and tle_ok(l2)): continue
        try:
            yy = int(l1[18:20]); doy = float(l1[20:32]); yr = 2000 + yy if yy < 57 else 1900 + yy
            ep = (datetime.datetime(yr, 1, 1, tzinfo=datetime.timezone.utc).timestamp() + (doy - 1) * 86400.0) * 1000.0
            inc = float(l2[8:16]); raan = float(l2[17:25]); ecc = float('0.' + l2[26:33].strip()); argp = float(l2[34:42]); ma = float(l2[43:51]); n = float(l2[52:63])
        except Exception: continue
        if not (0.2 < n < 17.8 and 0 <= ecc < 0.9 and 0 <= inc <= 180): continue
        if abs(ep - asof_ms) > 45 * 86400000: continue
        out.append({'id': l1[2:7].strip(), 'name': re.sub(r'[^0-9A-Za-z .\-()/+&\']', '', nm)[:24].strip(), 'ep': ep, 'inc': inc, 'raan': raan, 'ecc': ecc, 'argp': argp, 'ma': ma, 'n': n})
    return out
def ids(*gs):
    # a group's members, from either mirror's copy of it
    s = set()
    for g in gs: s |= set(x['id'] for x in read(g)) | set(x['id'] for x in read('a-' + g))
    return s
# the kinds, as the page colours them (see GROUPS in src/13-orbit.js): the first that fits wins
G_OTHER, G_STARLINK, G_ONEWEB, G_NEWMEGA, G_NAV, G_GEO, G_WATCH, G_STATION, G_COMM, G_DEBRIS, G_MIL = range(11)
member = [(G_STATION, ids('stations')), (G_STARLINK, ids('starlink')), (G_ONEWEB, ids('oneweb')), (G_NEWMEGA, ids('kuiper', 'qianfan', 'hulianwang')),
          (G_NAV, ids('gps-ops', 'galileo', 'glo-ops', 'beidou', 'gnss', 'sbas')), (G_WATCH, ids('weather', 'goes', 'noaa', 'resource', 'planet', 'spire', 'science', 'radar', 'dmc')),
          (G_COMM, ids('iridium-NEXT', 'globalstar', 'orbcomm')), (G_MIL, ids('military')), (G_GEO, ids('geo'))]
bright = ids('visual')
DEB = ['fengyun-1c-debris', 'cosmos-2251-debris', 'iridium-33-debris', 'cosmos-1408-debris']
ALL = sorted(os.path.basename(p)[:-4] for p in glob.glob(D + 'tle/*.tle'))
# The same satellite is in several groups, and the groups are refreshed at very different rates (the mirror's big "active" list can be
# two weeks old while its "starlink" and "stations" are hours old). So: for each satellite, the orbit measured last, whichever file it is in.
best = {}
for g in ALL:
    for x in read(g):
        o = best.get(x['id'])
        if o is None or x['ep'] > o['ep']: best[x['id']] = x
# who is counted: everything on the active list, and anything in another group that the catalogue calls working; nothing that has come down
cat = {}
if os.path.exists(D + 'satcat.csv'):
    for r in csv.DictReader(open(D + 'satcat.csv', encoding='utf-8', errors='replace')):
        cat[(r['NORAD_CAT_ID'] or '').strip().zfill(5)] = r
def working(i): r = cat.get(i.zfill(5)); return bool(r) and r['OBJECT_TYPE'] == 'PAY' and (r['OPS_STATUS_CODE'] or '') in ('+', 'P', 'B', 'S', 'X')
def down(i): r = cat.get(i.zfill(5)); return bool(r) and bool((r['DECAY_DATE'] or '').strip())
def med(g):
    e = sorted(x['ep'] for x in read(g)); return e[len(e) // 2] if len(e) > 8000 else 0
ACT = max(('active', 'z-active', 'p-active'), key=med)      # the copy of the active list measured last says who is active
who = set(x['id'] for x in read(ACT))
for g in ALL:
    if g in DEB or g.endswith('active'): continue
    who |= set(x['id'] for x in read(g) if working(x['id']))
gone = set(i for i in who if down(i)); who -= gone
sats = {}
for i in who:
    x = dict(best[i]); g = G_OTHER
    for gid, s in member:
        if i in s: g = gid; break
    x['g'] = g; x['fl'] = 1 if i in bright else 0; sats[i] = x
for k, g in enumerate(DEB):
    for x in read(g):
        if x['id'] in sats or down(x['id']): continue
        x = dict(best[x['id']]); x['g'] = G_DEBRIS; x['fl'] = (k + 1) << 4; x['name'] = ''; sats[x['id']] = x
# the ones worth a name and a note come first, the big constellations last (a slow phone draws only the front of the list)
rank = {G_STATION: 0, G_NAV: 2, G_GEO: 3, G_WATCH: 4, G_COMM: 5, G_MIL: 6, G_OTHER: 7, G_NEWMEGA: 8, G_ONEWEB: 9, G_DEBRIS: 10, G_STARLINK: 11}
order = sorted(sats.values(), key=lambda x: (0 if x['g'] == G_STATION else 1 if x['fl'] & 1 else rank[x['g']] + 1, x['id']))
buf = bytearray(); names = []
for x in order:
    buf += struct.pack('<ffHHHHHBB', x['n'], (x['ep'] - asof_ms) / 60000.0, int(round(x['ecc'] * 65535)), int(round(x['inc'] / 180.0 * 65535)),
                       int(round(x['raan'] / 360.0 * 65536)) % 65536, int(round(x['argp'] / 360.0 * 65536)) % 65536, int(round(x['ma'] / 360.0 * 65536)) % 65536, x['g'], x['fl'])
    nm = x['name']
    # the big constellations number their satellites: only the number is kept
    m = re.match(r'^(STARLINK|ONEWEB|KUIPER)-(\d+)$', nm)
    names.append(m.group(2) if (m and x['g'] in (G_STARLINK, G_ONEWEB, G_NEWMEGA)) else nm)
assert len(order) > 8000 and len(buf) == 20 * len(order)
try: gen = json.load(open(D + 'sat_manifest.json'))['generatedAt'][:19] + 'Z'
except Exception: gen = iso(asof)
counts = {}
for x in order: counts[x['g']] = counts.get(x['g'], 0) + 1
ages = sorted((asof_ms - x['ep']) / 86400000.0 for x in order)
fresh = '%d measured within a day, %d within three, %d older than a week (oldest %.0f days); %d left out as come down' % (sum(1 for a in ages if a < 1), sum(1 for a in ages if a < 3), sum(1 for a in ages if a > 7), ages[-1], len(gone))
S = {'asOf': iso(asof), 'src': 'CelesTrak', 'gen': gen, 'n': len(order), 'rec': 20, 'day': sum(1 for a in ages if a < 1), 'b64': b64(buf), 'names': '\n'.join(names),
     'ids': b64(b''.join(struct.pack('<I', int(x['id'])) for x in order))}

# ---------------- what is known about each of them: the catalogue ----------------
# One 20-byte record per object, in the order of its catalogue number: number (4), launch day counted from 1 Jan 1957 (2), the launch's
# number in its year (2), the piece of that launch as a number (A=1, B=2, ... AA=27) (2), owner and launch site as places in two lists (1, 1),
# kind and status (1), brightness in tenths of a magnitude + 100, 0 if unknown (1), radar size in square metres (4, a float; 0 unknown),
# and two spare. Radio transmitters (SatNOGS) for those that have them: at most three each.
OWN = {'US': 'United States', 'CIS': 'Russia (and the former USSR)', 'PRC': 'China', 'FR': 'France', 'JPN': 'Japan', 'IND': 'India', 'UK': 'United Kingdom', 'ESA': 'European Space Agency',
       'GER': 'Germany', 'IT': 'Italy', 'ITSO': 'Intelsat', 'ISS': 'International Space Station partners', 'CA': 'Canada', 'SPN': 'Spain', 'SKOR': 'South Korea', 'ORB': 'ORBCOMM',
       'CHBZ': 'China and Brazil', 'GLOB': 'Globalstar', 'ARGN': 'Argentina', 'AUS': 'Australia', 'ISRA': 'Israel', 'SES': 'SES', 'EUTE': 'Eutelsat', 'TURK': 'Turkey', 'ROC': 'Taiwan',
       'FIN': 'Finland', 'SEAL': 'Sea Launch', 'IRAN': 'Iran', 'UAE': 'United Arab Emirates', 'O3B': 'O3b Networks', 'BRAZ': 'Brazil', 'POL': 'Poland', 'NOR': 'Norway', 'SING': 'Singapore',
       'GREC': 'Greece', 'LUXE': 'Luxembourg', 'NZ': 'New Zealand', 'INDO': 'Indonesia', 'SWTZ': 'Switzerland', 'NETH': 'Netherlands', 'SWED': 'Sweden', 'DEN': 'Denmark', 'BEL': 'Belgium',
       'SAUD': 'Saudi Arabia', 'THAI': 'Thailand', 'MALA': 'Malaysia', 'MEX': 'Mexico', 'EUME': 'EUMETSAT', 'IM': 'Inmarsat', 'AB': 'Arabsat', 'AC': 'AsiaSat', 'NATO': 'NATO', 'EGYP': 'Egypt',
       'SAFR': 'South Africa', 'NIG': 'Nigeria', 'ALG': 'Algeria', 'KAZ': 'Kazakhstan', 'UKR': 'Ukraine', 'CZCH': 'Czechia', 'HUN': 'Hungary', 'POR': 'Portugal', 'CHLE': 'Chile', 'VENZ': 'Venezuela',
       'COL': 'Colombia', 'PER': 'Peru', 'PAKI': 'Pakistan', 'VTNM': 'Vietnam', 'RP': 'Philippines', 'BGD': 'Bangladesh', 'NKOR': 'North Korea', 'LTU': 'Lithuania', 'EST': 'Estonia', 'LAT': 'Latvia',
       'BELA': 'Belarus', 'AZER': 'Azerbaijan', 'QAT': 'Qatar', 'KWT': 'Kuwait', 'MOR': 'Morocco', 'ETH': 'Ethiopia', 'KEN': 'Kenya', 'RWA': 'Rwanda', 'ANG': 'Angola', 'BUL': 'Bulgaria',
       'ROM': 'Romania', 'AUT': 'Austria', 'IRE': 'Ireland', 'SLO': 'Slovenia', 'SVK': 'Slovakia', 'CRO': 'Croatia', 'MNG': 'Mongolia', 'NPL': 'Nepal', 'LKA': 'Sri Lanka', 'TBD': 'not yet assigned', 'NICO': 'New ICO', 'RASC': 'RascomStar', 'STCT': 'Singapore and Taiwan', 'ASRA': 'Austria', 'ECU': 'Ecuador', 'BOL': 'Bolivia', 'FRIT': 'France and Italy',
       'IRAQ': 'Iraq', 'TMMC': 'Turkmenistan and Monaco', 'LAOS': 'Laos', 'PERU': 'Peru', 'MA': 'Morocco', 'JOR': 'Jordan', 'GRSA': 'Greece and Saudi Arabia', 'SVN': 'Slovenia', 'HRV': 'Croatia',
       'DJI': 'Djibouti', 'BWA': 'Botswana', 'BHR': 'Bahrain', 'SLB': 'Solomon Islands', 'MNE': 'Montenegro', 'ORB': 'ORBCOMM', 'EUME': 'EUMETSAT'}
SITE = {'AFETR': 'Cape Canaveral, Florida', 'AFWTR': 'Vandenberg, California', 'PLMSC': 'Plesetsk, Russia', 'TYMSC': 'Baikonur, Kazakhstan', 'TAISC': 'Taiyuan, China', 'FRGUI': 'Kourou, French Guiana',
        'JSC': 'Jiuquan, China', 'SRILR': 'Sriharikota, India', 'XICLF': 'Xichang, China', 'TANSC': 'Tanegashima, Japan', 'VOSTO': 'Vostochny, Russia', 'WSC': 'Wenchang, China', 'RLLB': 'Mahia, New Zealand',
        'KYMSC': 'Kapustin Yar, Russia', 'WLPIS': 'Wallops Island, Virginia', 'KSCUT': 'Uchinoura, Japan', 'YSLA': 'the Yellow Sea', 'DLS': 'Dombarovsky, Russia', 'SEAL': 'a ship at sea (Sea Launch)',
        'ERAS': 'an aircraft, Eastern Range', 'WRAS': 'an aircraft, Western Range', 'HGSTR': 'Hammaguir, Algeria', 'NSC': 'Naro, South Korea', 'KODAK': 'Kodiak, Alaska', 'SCSLA': 'the South China Sea',
        'STARB': 'Starbase, Texas', 'YAVNE': 'Palmachim, Israel', 'SVOBO': 'Svobodny, Russia', 'SEMLS': 'Semnan, Iran', 'SNMLP': 'San Marco platform, Kenya', 'SMTS': 'Shahrud, Iran', 'SUBL': 'a submarine',
        'YUN': 'Sohae, North Korea', 'KWAJ': 'Kwajalein Atoll', 'ANDSP': 'Andoya, Norway', 'WOMRA': 'Woomera, Australia', 'CAS': 'an aircraft, Canary Islands', 'JJSLA': 'Jeju, South Korea', 'TTMTR': 'Baikonur, Kazakhstan'}
TYPE = {'PAY': 1, 'R/B': 2, 'DEB': 3}
STAT = {'+': 1, 'P': 2, 'B': 3, 'S': 4, 'X': 5, 'D': 6, '-': 7}
def piece(p):
    n = 0
    for c in p:
        if 'A' <= c <= 'Z': n = n * 26 + (ord(c) - 64)
    return min(n, 65535)
want = set(int(x['id']) for x in order); info = {}; owners = ['']; sites = ['']
def idx(lst, v):
    if v not in lst: lst.append(v)
    return min(lst.index(v), 255)
try: mag = json.load(open(D + 'stdmag.json'))
except Exception: mag = {}
if cat:
    for r in cat.values():
        try: nid = int(r['NORAD_CAT_ID'])
        except Exception: continue
        if nid not in want: continue
        m = re.match(r'^(\d{4})-(\d{3})([A-Z]{1,3})$', r['OBJECT_ID'] or ''); ld = re.match(r'^(\d{4})-(\d\d)-(\d\d)$', r['LAUNCH_DATE'] or '')
        day = (datetime.date(int(ld.group(1)), int(ld.group(2)), int(ld.group(3))) - datetime.date(1957, 1, 1)).days if ld else 0
        try: rcs = max(0.0, float(r['RCS'])) if r['RCS'] else 0.0
        except Exception: rcs = 0.0
        mg = mag.get(str(nid)); mb = max(1, min(255, int(round(float(mg) * 10)) + 100)) if isinstance(mg, (int, float)) else 0
        own = OWN.get(r['OWNER'], re.sub(r'[^A-Z0-9/]', '', r['OWNER'] or '')[:8]); site = SITE.get(r['LAUNCH_SITE'], re.sub(r'[^A-Z0-9]', '', r['LAUNCH_SITE'] or '')[:8])
        info[nid] = struct.pack('<IHHHBBBBfH', nid, max(0, min(65535, day)), int(m.group(2)) if m else 0, piece(m.group(3)) if m else 0, idx(owners, own), idx(sites, site),
                                TYPE.get(r['OBJECT_TYPE'], 0) | (STAT.get(r['OPS_STATUS_CODE'], 0) << 4), mb, rcs, 0)
tx = {}
try:
    for k, v in json.load(open(D + 'satnogs.json')).items():
        if not k.isdigit() or int(k) not in want: continue
        rows = []
        for t in (v.get('tx') or [])[:12]:
            if isinstance(t, list) and len(t) >= 3 and isinstance(t[1], (int, float)) and 1e5 < t[1] < 1e11:
                rows.append([re.sub(r'[^0-9A-Za-z .\-()/+&,:]', '', str(t[0]))[:40], int(t[1]), re.sub(r'[^0-9A-Za-z .\-/]', '', str(t[2] or ''))[:12]])
        if rows: tx[k] = rows[:3]
except Exception: tx = {}
INFO = {'v': 1, 'asOf': iso(asof), 'src': 'CelesTrak SATCAT; SatNOGS; standard magnitudes', 'n': len(info), 'rec': 20, 'b64': b64(b''.join(info[k] for k in sorted(info))), 'owners': owners, 'sites': sites, 'tx': tx}
json.dump(INFO, open('app/data/satinfo.json', 'w'), separators=(',', ':'))

# ---------------- wind ----------------
w = json.load(open(D + 'wind.json'))
U, V = w[0]['data'], w[1]['data']
wb = bytearray(360 * 181 * 2); top = 0.0
for k in range(65160):
    u, v = float(U[k]), float(V[k]); top = max(top, math.hypot(u, v))
    wb[k * 2] = max(0, min(255, int(round(u / 40.0 * 127)) + 128)); wb[k * 2 + 1] = max(0, min(255, int(round(v / 40.0 * 127)) + 128))
ref = w[0]['header']['refTime'][:19] + 'Z'
W = {'asOf': ref, 'src': 'NOAA GFS', 'nx': 360, 'ny': 181, 'max': round(top, 1), 'b64': b64(wb)}

# ---------------- aurora ----------------
a = json.load(open(D + 'aurora.json'))
ab = bytearray(360 * 181); amax = 0
for lon, lat, val in a['coordinates']:
    lon = int(lon) % 360; lat = int(lat); val = max(0, min(100, int(round(val))))
    if -90 <= lat <= 90: ab[(90 - lat) * 360 + lon] = val; amax = max(amax, val)
A = {'asOf': a['Forecast Time'], 'obs': a['Observation Time'], 'src': 'NOAA SWPC', 'nx': 360, 'ny': 181, 'max': amax, 'b64': b64(ab)}

# ---------------- lightning ----------------
s = json.load(open(D + 'strikes.json'))
at = float(s['updated_at']); rows = []
for x in s['strikes']:
    try: la, lo, t = float(x['lat']), float(x['lon']), float(x['time'])
    except Exception: continue
    if not (-90 <= la <= 90 and -180 <= lo <= 180): continue
    age = at - t
    if age < 0 or age > 7200: continue
    rows.append((age, la, lo))
rows.sort(reverse=True); rows = rows[:6000]
sb = bytearray()
for age, la, lo in rows: sb += struct.pack('<hhH', int(round(la * 100)), int(round(lo * 100)), int(round(age)))
span = int(round(rows[0][0])) if rows else 0
L = {'asOf': iso(datetime.datetime.fromtimestamp(at, datetime.timezone.utc)), 'src': 'NOAA GOES GLM', 'n': len(rows), 'span': span, 'b64': b64(sb)}

# ---------------- fires ----------------
# NASA FIRMS: the strongest fires seen from orbit in the last 24 hours (the mirror keeps those above 150 megawatts, at most 400).
# A detection is heat, not a confirmed wildfire: gas flares and volcanoes are seen too.
F = None
try:
    f = json.load(open(D + 'fires.json')); fat = float(f['generatedAtMillis']); fs = []; fb = bytearray(); rows = []
    for x in f['hotspots']:
        try: la, lo, frp, t = float(x['lat']), float(x['lon']), float(x['frp']), float(x['time'])
        except Exception: continue
        if not (-90 <= la <= 90 and -180.01 <= lo <= 180.01 and frp > 0): continue
        age = (fat - t) / 60000.0
        if age < -10 or age > 3 * 1440: continue
        sat = re.sub(r'[^0-9A-Za-z \-]', '', str(x.get('satellite') or ''))[:24]
        try: cp = float(x.get('confidencePercent')) if x.get('confidencePercent') is not None else {'h': 100.0, 'n': 60.0, 'l': 20.0}.get(str(x.get('confidence')), 0.0)
        except Exception: cp = 0.0
        rows.append((frp, la, max(-180.0, min(180.0, lo)), max(0.0, age), sat, cp))
    rows.sort(reverse=True); rows = rows[:400]
    for frp, la, lo, age, sat, cp in rows:
        if sat not in fs: fs.append(sat)
        fb += struct.pack('<hhHHBB', int(round(la * 100)), int(round(lo * 100)), min(65535, int(round(frp))), min(65535, int(round(age))), min(255, fs.index(sat)), max(0, min(100, int(round(cp)))))
    assert len(rows) >= 5
    F = {'asOf': iso(datetime.datetime.fromtimestamp(fat / 1000.0, datetime.timezone.utc)), 'src': 'NASA FIRMS', 'n': len(rows), 'rec': 10, 'min': float(f.get('minFrpMw') or 0), 'hours': int(f.get('windowHours') or 24), 'sats': fs, 'b64': b64(fb)}
except Exception as e: print('fires      left out (%s)' % e)

# ---------------- storms ----------------
# The tropical cyclones turning now. NOAA's National Hurricane Center gives its storms' present strength; GDACS (EC Joint Research
# Centre and UN OCHA) lists the rest of the world's, with the highest wind each has reached so far, not its present wind.
T = None
try:
    def clean(v, n=40): return re.sub(r'[^0-9A-Za-z .\-]', '', str(v or ''))[:n].strip()
    st = []
    for r in json.load(open(D + 'nhc.json'))['records']:
        try:
            mv = re.match(r'^\s*(\d+)\s+at\s+(\d+)\s*kt', str(r.get('movement') or ''))
            st.append({'name': clean(r['name']).title(), 'cls': clean(r.get('classification'), 6).upper(), 'lat': round(float(r['lat']), 2), 'lon': round(float(r['lon']), 2), 'kmh': round(float(r['intensity_kt']) * 1.852),
                       'peak': 0, 'hpa': int(float(r['pressure_mb'])) if r.get('pressure_mb') else 0, 'mov': [int(mv.group(1)) % 360, round(int(mv.group(2)) * 1.852)] if mv else None, 'at': clean(r['updated'], 20).replace(' ', ''), 'by': 'NOAA NHC'})
        except Exception: continue
    for r in json.load(open(D + 'gdacs.json'))['records']:
        try:
            if r.get('type') != 'TC' or not r.get('current'): continue
            la, lo = float(r['lat']), float(r['lon']); to = datetime.datetime.strptime(r['to'][:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=datetime.timezone.utc)
            if (asof - to).total_seconds() > 60 * 3600: continue
            if any(abs(s['lat'] - la) < 3 and abs(((s['lon'] - lo + 540) % 360) - 180) < 3 for s in st):
                continue
            m = re.match(r'^Tropical Cyclone ([A-Z][A-Z\-]*?)-\d\d$', str(r.get('name') or '')); n2 = re.match(r'^Tropical Cyclone (\d\d)-', str(r.get('name') or ''))
            st.append({'name': m.group(1).title() if m else ('no. ' + n2.group(1) if n2 else 'unnamed'), 'cls': '', 'lat': round(la, 2), 'lon': round(lo, 2), 'kmh': round(float(r['severity_value'])) if str(r.get('severity_unit')) == 'km/h' else 0,
                       'peak': 1, 'hpa': 0, 'mov': None, 'at': iso(to), 'by': 'GDACS'})
        except Exception: continue
    try: sat_ = json.load(open(D + 'haz_health.json'))['gdacs']['last_ok']
    except Exception: sat_ = iso(asof)
    T = {'asOf': sat_, 'src': 'NOAA NHC; GDACS', 'list': st[:12]}
except Exception as e: print('storms     left out (%s)' % e)

live = {'v': 1, 'sats': S, 'wind': W, 'aurora': A, 'strikes': L}
if F: live['fires'] = F
if T: live['storms'] = T
KINDS = [k for k in ('sats', 'wind', 'aurora', 'strikes', 'fires', 'storms') if k in live]
os.makedirs('app/data', exist_ok=True)
json.dump(live, open('app/data/live.json', 'w'), separators=(',', ':'))
for k in KINDS: json.dump(live[k], open('data/db_%s.json' % k, 'w'), separators=(',', ':'))
json.dump({k: live[k]['asOf'] for k in KINDS}, open('data/db_stamp.json', 'w'))
print('satellites %d (%s)' % (len(order), ', '.join('%d:%d' % (g, c) for g, c in sorted(counts.items()))), '| elements as fetched', S['asOf'])
print('           ' + fresh)
print('wind       run of %s, strongest %.1f m/s' % (W['asOf'], top))
print('aurora     forecast for %s, peak %d%%' % (A['asOf'], amax))
print('lightning  %d flashes over %d min, list of %s' % (L['n'], span // 60, L['asOf']))
if F: print('fires      %d, strongest %d MW, list of %s, seen by %s' % (F['n'], max(r[0] for r in rows), F['asOf'], ', '.join(F['sats'])))
if T: print('storms     %s' % ('; '.join('%s %s km/h%s (%s)' % (s['name'], s['kmh'], ' at most' if s['peak'] else '', s['by']) for s in T['list']) or 'none'))
print('catalogue  %d of %d found, %d with radio, %d bytes' % (len(info), len(order), len(tx), os.path.getsize('app/data/satinfo.json')))
print('live.json  %d bytes | store documents: %s' % (os.path.getsize('app/data/live.json'), ', '.join('%s %d' % (k, os.path.getsize('data/db_%s.json' % k)) for k in KINDS)))
