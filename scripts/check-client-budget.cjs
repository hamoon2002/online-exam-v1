const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const dir = path.resolve(__dirname, '../client/dist');
const html = fs.readFileSync(path.join(dir,'index.html'),'utf8');
const files = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g)].map(m=>m[1]))];
if(!files.some(f=>f.endsWith('.js'))) throw new Error('No built entry found');
for (const [extension,limit] of [['js',200*1024],['css',25*1024]]) {
 const bytes=files.filter(f=>f.endsWith('.'+extension)).reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(dir,file))).length,0);
 console.log(`Initial ${extension} gzip: ${bytes} bytes; budget: ${limit}`);
 if(bytes>limit) throw new Error(`Initial ${extension} transfer budget exceeded`);
}
