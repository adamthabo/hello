# Writes app/data/zones.json: the war zones and the places cut off (no internet, no power) that the Earth's two layers of 15 Nov draw
# ("War zones and blacked out zones is good. Gaza, North Korea, Moscow, Beijing, etc.."), with what is known of each and where it came
# from, as it stood on the day this was run; and the ground Russia holds in Ukraine, from DeepStateMap's daily map.
# The shapes are Natural Earth's (public domain): whole countries (1:50m), or the provinces where the fighting is (1:10m), joined
# into one shape, made simpler (a few kilometres) and with no edge longer than a degree and a half, so they lie on the globe.
# The site's Worker (cf/live-culture/worker.js, /api/zones) serves the same file with two live parts added: DeepStateMap's map of the
# day, and the countries where IODA (Georgia Tech) has seen the internet go down in the last day.
# usage: python3 -I tools/gen_zones.py DL OUT   (DL: a directory holding the three Natural Earth GeoJSON files and deepstate.geojson;
#        OUT: app/data/zones.json). The facts below are checked by hand against their sources each time: see docs/REFERENCES.md.
import json, math, sys
from shapely.geometry import shape, Polygon, MultiPolygon, mapping
from shapely.ops import unary_union

DL, OUT = sys.argv[1], sys.argv[2]
ASOF = '2026-11-15'
WIKI = 'Wikipedia, list of ongoing armed conflicts (15 Nov)'
PULSE = 'Internet Society Pulse (15 Nov)'

# the wars with more than a thousand dead this year by Wikipedia's count (its 2026 column, 15 Nov), each where its fighting is now.
# where: c:<country>, su:<map subunit>, a1:<province code>. dead: that row's 2026 figure, for the whole conflict (some conflicts
# span several of these places: Gaza, Lebanon and Iran are all in one row). line: the latest, dated, with its source
WAR = [
  dict(id='ukraine', name='Ukraine', war='Russo-Ukrainian war', since='2014', dead=42286, where=['c:UKR'],
       line='7 to 10 Nov: Russian missiles and drones hit the power grid; outages in six regions', by='Ukrenergo (10 Nov)'),
  dict(id='sahel', name='The Sahel', war='Islamist insurgencies in the Sahel', since='2002', dead=18132, where=['c:MLI', 'c:BFA', 'c:NER'], line='', by=''),
  dict(id='gaza', name='Gaza', war='Arab-Israeli and Iran-Israel proxy wars', since='', dead=11144, where=['su:GAZ'],
       line='a ceasefire since 10 Oct 2025; Israeli strikes go on almost daily', by='AP (11 Nov)'),
  dict(id='lebanon', name='South Lebanon', war='Arab-Israeli and Iran-Israel proxy wars', since='', dead=11144, where=['a1:LBN-3060', 'a1:LBN-3059'], line='', by=''),
  dict(id='iran', name='Iran', war='the war with the United States and Israel', since='28 Feb 2026', dead=11144, where=['c:IRN'],
       line='US strikes on Qeshm Island by the Strait of Hormuz; 11 ships attacked in a week', by='Al Jazeera, UKMTO (7 Nov)'),
  dict(id='sudan', name='Darfur and Kordofan', war='Sudanese civil war', since='Apr 2023', dead=10179,
       where=['a1:SDN-881', 'a1:SDN-5858', 'a1:SDN-5859', 'a1:SDN-5856', 'a1:SDN-5857', 'a1:SDN-883', 'a1:SDN-882'],
       line='the army and its allies push against the RSF in West Kordofan', by='Sudan Tribune (8 Nov)'),
  dict(id='myanmar', name='Myanmar', war='Myanmar civil war', since='2021', dead=8348, where=['c:MMR'],
       line='state media: the army has taken a resistance headquarters and ten bases in the south', by='AP (10 Nov)'),
  dict(id='somalia', name='Somalia', war='Somali civil war', since='', dead=5601, where=['c:SOM'], line='', by=''),
  dict(id='mexico', name='Mexico', war='Mexican drug war', since='2006', dead=5547, where=['c:MEX'], line='', by=''),
  dict(id='ethiopia', name='Ethiopia', war='Ethiopian civil wars', since='', dead=5152, where=['c:ETH'], line='', by=''),
  dict(id='afghanistan', name='Afghanistan', war='Afghanistan-Pakistan war and insurgencies', since='', dead=5097, where=['c:AFG'],
       line='Pakistani air strikes in Kunar; the UN counts 1,100 civilian dead and wounded from the border fighting this year', by='AP (Nov)'),
  dict(id='yemen', name='Yemen', war='Yemeni civil war', since='2011', dead=4072, where=['c:YEM'], line='', by=''),
  dict(id='congo', name='East Congo', war='Kivu conflict (M23)', since='', dead=3467, where=['a1:COD-1898', 'a1:COD-1894'],
       line='the UN peacekeeping chief meets the new rebel coalition, M23 among it, in Goma', by='AP (3 Nov)'),
  dict(id='nigeria', name='Nigeria', war='civil conflicts in Nigeria', since='', dead=3400, where=['c:NGA'], line='', by=''),
  dict(id='ecuador', name='Ecuador', war='Ecuadorian conflict', since='', dead=2876, where=['c:ECU'], line='', by=''),
  dict(id='haiti', name='Haiti', war='Haitian conflict', since='2018', dead=2359, where=['c:HTI'], line='', by=''),
  dict(id='syria', name='Syria', war='aftermath of the Syrian civil war', since='', dead=1575, where=['c:SYR'], line='', by=''),
  dict(id='colombia', name='Colombia', war='Colombian conflict', since='1964', dead=1481, where=['c:COL'], line='', by=''),
  dict(id='cameroon', name='Cameroon', war='Cameroonian conflicts', since='', dead=1418, where=['a1:CMR-1477', 'a1:CMR-799', 'a1:CMR-1462'], line='', by=''),
  dict(id='pakistan', name='Northwest Pakistan', war='insurgencies in Pakistan', since='', dead=1110, where=['a1:PAK-1123', 'a1:PAK-1112', 'a1:PAK-1108'], line='', by=''),
]
# the places cut off. kind: closed (no open internet at all), cut (the internet switched off there), power (no power, or power by
# the hour), blocked (the internet there, but the big services shut out)
DARK = [
  dict(id='prk', name='North Korea', kind='closed', where=['c:PRK'],
       line='no open internet: a closed national network, and 1,024 internet addresses for the whole country', by='RIPE Labs, Wikipedia'),
  dict(id='gaza', name='Gaza', kind='power', where=['su:GAZ'],
       line='most people have no grid power: over 90% of the power plants and lines destroyed', by='World Bank, via AFP (4 Nov)'),
  dict(id='cuba', name='Cuba', kind='power', where=['c:CUB'],
       line='the whole grid has failed again and again this year; cuts of 30 hours and more are routine', by='AP (18 Sep)'),
  dict(id='ukraine', name='Ukraine', kind='power', where=['c:UKR'],
       line='after the strikes of 8 Nov, power by the hour in most regions', by="Ukraine's energy ministry (Nov)"),
  dict(id='balochistan', name='Balochistan, Pakistan', kind='cut', where=['a1:PAK-1108'],
       line='mobile internet suspended since 5 Aug 2025', by=PULSE),
  dict(id='kurdistan', name='Kurdistan Region, Iraq', kind='cut', where=['a1:IRQ-3046', 'a1:IRQ-3050', 'a1:IRQ-3242'],
       line='internet suspended in the region since 18 Feb 2025', by=PULSE),
  dict(id='annobon', name='Annobón, Equatorial Guinea', kind='cut', where=['pt:-1.43,5.63,14'],
       line='the island has had no internet since protests in Jul 2024', by=PULSE),
  dict(id='iran', name='Iran', kind='blocked', where=['c:IRN'],
       line='cut off for most of the first half of 2026; back since 27 May, with heavy restrictions', by='NetBlocks, AP'),
  dict(id='russia', name='Russia', kind='blocked', where=['c:RUS'],
       line='Facebook, Instagram, X and news sites blocked since Feb 2022', by=PULSE),
  dict(id='china', name='China', kind='blocked', where=['c:CHN'],
       line='Google, YouTube, WhatsApp, Instagram, Facebook, X, TikTok and more blocked', by=PULSE),
  dict(id='myanmar', name='Myanmar', kind='blocked', where=['c:MMR'],
       line='Facebook, X and Instagram blocked since Feb 2021', by=PULSE),
  dict(id='uganda', name='Uganda', kind='blocked', where=['c:UGA'],
       line='Facebook, WhatsApp and Messenger blocked since 17 Jan 2026', by=PULSE),
  dict(id='togo', name='Togo', kind='blocked', where=['c:TGO'],
       line='Facebook, Telegram and Signal blocked since 26 Jun 2025', by=PULSE),
]

def load(name):
    return json.load(open(DL + '/' + name, encoding='utf-8'))['features']
C = {f['properties']['ADM0_A3']: f for f in load('ne_50m_admin_0_countries.geojson')}
SU = {f['properties']['SU_A3']: f for f in load('ne_50m_admin_0_map_subunits.geojson')}
A1 = {f['properties']['adm1_code']: f for f in load('ne_10m_admin_1.geojson')}

def circle(lat, lon, km):
    pts = []
    for i in range(24):
        a = i / 24 * 2 * math.pi
        pts.append((lon + km / 111.32 / max(.2, math.cos(math.radians(lat))) * math.cos(a), lat + km / 111.32 * math.sin(a)))
    return Polygon(pts)

def geom(ref):
    k, v = ref.split(':', 1)
    if k == 'c': return shape(C[v]['geometry'])
    if k == 'su': return shape(SU[v]['geometry'])
    if k == 'a1': return shape(A1[v]['geometry'])
    if k == 'pt':
        la, lo, km = map(float, v.split(','))
        return circle(la, lo, km)
    raise ValueError(ref)

def densify(ring, step=1.5):
    out = []
    for i in range(len(ring) - 1):
        (x0, y0), (x1, y1) = ring[i], ring[i + 1]
        n = max(1, int(math.ceil(max(abs(x1 - x0), abs(y1 - y0)) / step)))
        for j in range(n):
            out.append((x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n))
    return out

def rings_of(g, tol):
    g = g.buffer(0).simplify(tol, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(g.geoms) if isinstance(g, MultiPolygon) else []
    polys = [p for p in polys if not p.is_empty]
    big = max((p.area for p in polys), default=0)
    out = []
    for p in sorted(polys, key=lambda p: -p.area):
        # (the small islands of a big country go; a small place keeps all of itself)
        if p.area < max((tol * 5) ** 2, big * .002) and p.area != big: continue
        r = densify(list(p.exterior.coords))
        flat = []
        for x, y in r: flat += [int(round(x * 100)), int(round(y * 100))]
        if len(flat) >= 6: out.append(flat)
    return out

def tol_for(g):
    return min(.14, max(.012, math.sqrt(g.area) / 70))

def lab_for(refs, g):
    if len(refs) == 1 and refs[0].startswith('c:'):
        p = C[refs[0][2:]]['properties']
        return [round(p['LABEL_Y'], 2), round(p['LABEL_X'], 2)]
    q = g.representative_point()
    return [round(q.y, 2), round(q.x, 2)]

def zone(z):
    g = unary_union([geom(r).buffer(0) for r in z['where']])
    o = {k: z[k] for k in z if k != 'where'}
    o['lab'] = lab_for(z['where'], g)
    o['p'] = rings_of(g, tol_for(g))
    return o

# the area of a shape in square kilometres (each part projected to an equal-area plane about its own middle)
def km2(g):
    R = 6371.0088
    def area(p):
        c = p.centroid; la0, lo0 = math.radians(c.y), math.radians(c.x)
        def laea(x, y):
            la, lo = math.radians(y), math.radians(x)
            k = math.sqrt(2 / (1 + math.sin(la0) * math.sin(la) + math.cos(la0) * math.cos(la) * math.cos(lo - lo0)))
            return (R * k * math.cos(la) * math.sin(lo - lo0), R * k * (math.cos(la0) * math.sin(la) - math.sin(la0) * math.cos(la) * math.cos(lo - lo0)))
        ext = Polygon([laea(x, y) for x, y in p.exterior.coords], [[laea(x, y) for x, y in i.coords] for i in p.interiors])
        return ext.area
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    return sum(area(p) for p in polys)

ds = shape(load('deepstate.geojson')[0]['geometry']).buffer(0)
front = dict(date=ASOF, by='DeepStateMap', km2=int(round(km2(ds), -2)), p=rings_of(ds, .01))
cc = {}
for f in C.values():
    p = f['properties']; a2 = p.get('ISO_A2_EH')
    if a2 and len(a2) == 2 and a2 != '-9': cc[a2] = [p['NAME'], round(p['LABEL_Y'], 1), round(p['LABEL_X'], 1)]
out = dict(v=1, asOf=ASOF, war=[zone(z) for z in WAR], dark=[zone(z) for z in DARK], front=front, cc=cc,
           src=dict(war=WIKI, dark=PULSE, shapes='Natural Earth', front='DeepStateMap, via cyterat/deepstate-map-data (GPL-3.0)'))
s = json.dumps(out, separators=(',', ':'), ensure_ascii=False)
open(OUT, 'w', encoding='utf-8').write(s)
n = sum(len(r) // 2 for z in out['war'] + out['dark'] for r in z['p'])
print('zones.json', len(s), 'bytes;', len(out['war']), 'war,', len(out['dark']), 'cut off,', n, 'points; front', front['km2'], 'km2,', sum(len(r) // 2 for r in front['p']), 'points;', len(cc), 'countries')
