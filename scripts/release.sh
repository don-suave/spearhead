#!/bin/sh
# Release-Build: baut das Spiel, setzt die Version und schreibt public/ (wird von Cloudflare Pages ausgeliefert)
# Aufruf: sh scripts/release.sh  (Version steht in VERSION)
set -e; cd "$(dirname "$0")/.."; V="v$(cat VERSION)"
node build.mjs --min >/dev/null
node rules/build.mjs >/dev/null
cp dist/regeln.html public/regeln.html
python3 - "$V" <<'P'
import sys
V=sys.argv[1];s=open('dist/spearhead.html',encoding='utf8').read()
head='<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Spearhead"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="theme-color" content="#0c0e11">'
s=s.replace('<title>',head+'<title>',1).replace('</body>',"<script>if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))</script></body>",1).replace('__VER__',V)
open('public/index.html','w',encoding='utf8').write(s)
open('public/sw.js','w').write(open('scripts/sw.template.js').read().replace('__VER__',V))
P
echo "public/ gebaut: $V"
