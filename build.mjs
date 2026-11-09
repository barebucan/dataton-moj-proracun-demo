import {mkdir,writeFile,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
// Use the checked public data snapshot so a later repository change cannot alter this build.
const source=await fetch('https://api.github.com/repos/barebucan/dataton-moj-proracun-demo/tarball/609b188d9f4001fc5c7256feda5b2088f4c9f5ec',{headers:{'User-Agent':'DELTA-static-build'}});
if(!source.ok)throw Error('Budget snapshot failed: '+source.status);
await writeFile('/tmp/budget-source.tar.gz',Buffer.from(await source.arrayBuffer()));
await mkdir('/tmp/budget-export',{recursive:true});
execFileSync('tar',['-xzf','/tmp/budget-source.tar.gz','--strip-components=1','-C','/tmp/budget-export']);
await cp('/tmp/budget-export','public',{recursive:true});
console.log('Verified static budget snapshot prepared.');
