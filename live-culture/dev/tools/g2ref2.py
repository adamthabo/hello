import sys,json
import eccodes as ec
out=[]
for path in sys.argv[1:]:
    with open(path,'rb') as f:
        n=0
        while n<3:
            h=ec.codes_grib_new_from_file(f)
            if h is None: break
            n+=1
            ec.codes_set(h,'missingValue',9.999e20);v=ec.codes_get_values(h)
            step=max(1,len(v)//500)
            out.append({'file':path.split('/')[-1],'n':n,'pack':ec.codes_get(h,'packingType'),'len':len(v),'miss':int(sum(1 for x in v if x>9e20)),'step':step,'sample':[None if x>9e20 else x for x in v[::step]]})
            ec.codes_release(h)
print(json.dumps(out))
