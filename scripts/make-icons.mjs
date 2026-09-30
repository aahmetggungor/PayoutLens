import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Rasterize the existing simple brand favicon; no generated artwork or new brand.
const sharp=require(process.argv[2] || 'sharp');
const svg=await readFile(new URL('../dist/favicon.svg',import.meta.url));
const folder=new URL('../dist/app/icons/',import.meta.url);await mkdir(folder,{recursive:true});
for(const size of [180,192,512])await sharp(svg).resize(size,size).flatten({background:'#111515'}).png().toFile(new URL('icon-'+size+'.png',folder).pathname.replace(/^\/([A-Z]:)/,'$1'));
console.log('Generated 180, 192 and 512px icons from the existing favicon');
