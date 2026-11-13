# test data for the hosted stand-in: a GFS file with its index (the real 2.5-degree sample, its fields named as NOAA's index names them),
# and a made-up wave-height file on a 1-degree grid (NaN over land, from the page's own picture of where the water is)
import sys, struct, shutil
import eccodes as ec
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
shutil.copy(src, out + 'gfs_atmos.grib2')
ec.codes_grib_multi_support_off()
want = {('2t', 'heightAboveGround', 2): 'TMP:2 m above ground', ('prmsl', 'meanSea', 0): 'PRMSL:mean sea level',
        ('u', 'isobaricInhPa', 250): 'UGRD:250 mb', ('v', 'isobaricInhPa', 250): 'VGRD:250 mb'}
lines, n = [], 0
with open(src, 'rb') as f:
    while True:
        h = ec.codes_grib_new_from_file(f)
        if h is None: break
        n += 1
        k = (ec.codes_get(h, 'shortName'), ec.codes_get(h, 'typeOfLevel'), ec.codes_get(h, 'level'))
        off = ec.codes_get(h, 'offset')
        lines.append('%d:%d:d=2026111212:%s:anl:' % (n, off, want.get(k, 'X%d:%s %s' % (n, k[1], k[2]))))
        if k == ('u', 'isobaricInhPa', 250): lines.append('%d.2:%d:d=2026111212:VGRD:250 mb:anl:' % (n, off))
        ec.codes_release(h)
open(out + 'gfs_atmos.idx', 'w').write('\n'.join(lines) + '\n')
print('atmos index', len(lines), 'lines;', sum(1 for l in lines if ':TMP:2 m' in l or 'PRMSL' in l or ':250 mb' in l), 'wanted')
# waves: 360 x 181, NaN on land (the water picture: bright is water)
im = Image.open(sys.argv[3]).convert('L').resize((360, 181))
px = im.load(); import math
vals = []
for j in range(181):
    la = 90 - j
    for i in range(360):
        lo = i if i < 180 else i - 360
        x = int(((lo + 180) % 360)); w = px[x % 360, j] > 128
        vals.append(1.0 + 4.5 * (1 - math.cos(math.radians(la))) ** 0.5 + 1.5 * math.sin(math.radians(lo * 3)) ** 2 if w else 9999.0)
h = ec.codes_grib_new_from_samples('GRIB2')
for k, v in [('discipline', 10), ('gridType', 'regular_ll'), ('Ni', 360), ('Nj', 181), ('latitudeOfFirstGridPointInDegrees', 90), ('longitudeOfFirstGridPointInDegrees', 0),
             ('latitudeOfLastGridPointInDegrees', -90), ('longitudeOfLastGridPointInDegrees', 359), ('iDirectionIncrementInDegrees', 1), ('jDirectionIncrementInDegrees', 1),
             ('parameterCategory', 0), ('parameterNumber', 3), ('typeOfFirstFixedSurface', 1), ('bitmapPresent', 1), ('missingValue', 9999.0), ('packingType', 'grid_simple'), ('bitsPerValue', 12)]:
    ec.codes_set(h, k, v)
ec.codes_set_values(h, vals)
with open(out + 'gfs_wave.grib2', 'wb') as f: ec.codes_write(h, f)
ec.codes_release(h)
open(out + 'gfs_wave.idx', 'w').write('1:0:d=2026111212:HTSGW:surface:anl:\n')
print('wave file written')
