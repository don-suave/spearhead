import {build} from 'esbuild';import fs from 'node:fs';
const min=process.argv.includes('--min');
const r=await build({entryPoints:['src/view.js'],bundle:true,format:'iife',minify:min,write:false,target:'es2020'});
const js=r.outputFiles[0].text.replace(/<\/script/g,'<\\/script');
const html=fs.readFileSync('template.html','utf8').replace('/*APP*/',()=>js);
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/spearhead.html',html);console.log('dist/spearhead.html',(html.length/1024).toFixed(1)+' KB')
