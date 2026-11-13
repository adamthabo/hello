# reference values from ECMWF's ecCodes, for checking the page's own GRIB2 reader
import sys,json,math
import eccodes as ec
out=[]
ec.codes_grib_multi_support_on()
for path in sys.argv[1:]:
    with open(path,'rb') as f:
        n=0
        while True:
            h=ec.codes_grib_new_from_file(f)
            if h is None: break
            n+=1
            try:
                if ec.codes_get(h,'gridType')!='regular_ll' or ec.codes_get(h,'packingType') not in ('grid_simple','grid_complex','grid_complex_spatial_differencing'):
                    continue
                ni=ec.codes_get(h,'Ni');nj=ec.codes_get(h,'Nj')
                ec.codes_set(h,'missingValue',9.999e20)
                v=ec.codes_get_values(h)
                # ecCodes gives the values in the file's scanning order; turn them to north-to-south rows, west to east
                jpos=ec.codes_get(h,'jScansPositively');ineg=ec.codes_get(h,'iScansNegatively');jcons=ec.codes_get(h,'jPointsAreConsecutive')
                rows=[list(v[r*ni:(r+1)*ni]) for r in range(nj)] if not jcons else [[v[c*nj+r] for c in range(ni)] for r in range(nj)]
                if jpos: rows=rows[::-1]
                if ineg: rows=[r[::-1] for r in rows]
                flat=[x for r in rows for x in r]
                vals=[None if x>9e20 else x for x in flat]
                ok=[x for x in vals if x is not None]
                step=max(1,len(vals)//400)
                out.append({'file':path.split('/')[-1],'n':n,'pack':ec.codes_get(h,'packingType'),'short':ec.codes_get(h,'shortName'),'ni':ni,'nj':nj,
                  'miss':len(vals)-len(ok),'min':min(ok) if ok else None,'max':max(ok) if ok else None,'mean':sum(ok)/len(ok) if ok else None,'step':step,'sample':vals[::step]})
            finally:
                ec.codes_release(h)
            if n>=12: break
print(json.dumps(out))
