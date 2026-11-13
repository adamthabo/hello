# builds app/index.html (the page) and app/local.html (the same page with a test hook: window.__lc) from src/,
# and hosted/index.html, hosted/local.html: the same page for the owner's own Cloudflare Worker (HOSTED=1: it reads the sources live and has
# the Live world, src/14-live.js, which a Claude artifact could not show)
import os, re, sys
S = 'src/'
def rd(p): return open(S + p, encoding='utf-8').read()
mods = ['00-data.js', '01-core.js', '02-gl.js', '04-band.js', '03-audio.js', '05-astro.js', '08-grib.js', '09-cities.js', '06-live.js', '07-globe.js', '11-drift.js', '12-wind.js', '13-orbit.js', '20-ui.js', '21-main.js']
js = 'var HOSTED=0;\n' + '\n'.join(rd(m) for m in mods)
hmods = mods[:mods.index('13-orbit.js') + 1] + ['14-live.js'] + mods[mods.index('13-orbit.js') + 1:]
hjs = 'var HOSTED=1;\n' + '\n'.join(rd(m) for m in hmods)
HOOK = "window.__lc={get AU(){return AU},get BD(){return BD},get ON(){return ON},get G(){return G},get CUR(){return CUR},get CURI(){return CURI},get PT(){return PT},get GP(){return GP},get GH(){return GH},soundLive:soundLive,soundHeld:soundHeld,get STG(){return STG},get QL(){return QL},set QL(v){QL=v},get GLX(){return GLX},get PHOTO(){return PHOTO},get INST(){return INST},get VOX(){return VOX},get GOV(){return GOV},get PS(){return PS},get HIT(){return HIT},get E(){return E},WIND:WIND,ORBIT:ORBIT,GLOBE:GLOBE,get LIVEW(){return typeof LIVEW!=='undefined'?LIVEW:null},get PULL(){return PULL},get CLOUD(){return CLOUD},get WX(){return WX},GRIB:GRIB,CITIES:CITIES,HOSTED:HOSTED,satsMerge:satsMerge,pTLE:pTLE,get LIVE(){return LIVE},liveTake:liveTake,WORLDS:WORLDS,go:go,setPlayer:setPlayer,tone:tone,hit:hit,tilt:tilt,buildGraph:buildGraph,SYN:SYN,INSTDEF:INSTDEF,AS:AS,loopT:loopT,photoLoad:photoLoad,musicOn:musicOn,musicOff:musicOff,errs:[],SG:SG,STEMF:STEMF,STEML:STEML,STEMP:STEMP,NL:NL,bandGain:bandGain};\n"
def page(hook, src=None):
    body = src or js
    if hook:
        # the hook goes in just before the heartbeat starts, so tests can reach inside
        body = body.replace("/* ---------- the heartbeat ---------- */", HOOK + "/* ---------- the heartbeat ---------- */", 1)
    return rd('head.html') + '<style>\n' + rd('style.css') + '</style>\n\n' + rd('body.html') + '\n<script>\n(function(){\n"use strict";\n' + body + '\n})();\n</script>\n'
os.makedirs('app', exist_ok=True)
open('app/index.html', 'w', encoding='utf-8').write(page(False))
# the local copy gets the skeleton the publisher would add, so it opens as a whole page
SK = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n'
open('app/local.html', 'w', encoding='utf-8').write(SK + page(True) + '</body></html>')
open('app/_check.js', 'w', encoding='utf-8').write('(function(){\n"use strict";\n' + js + '\n})();\n')
os.makedirs('hosted', exist_ok=True)
open('hosted/index.html', 'w', encoding='utf-8').write(SK + page(False, hjs) + '</body></html>')
open('hosted/local.html', 'w', encoding='utf-8').write(SK + page(True, hjs) + '</body></html>')
open('hosted/_check.js', 'w', encoding='utf-8').write('(function(){\n"use strict";\n' + hjs + '\n})();\n')
print('index.html', os.path.getsize('app/index.html'), 'bytes')
