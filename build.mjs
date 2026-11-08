import {mkdir,writeFile,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const source=await fetch('https://api.github.com/repos/barebucan/dataton-moj-proracun-demo/tarball/5b80dbbe4488903297c45a3ca7165a647ee4a682',{headers:{'User-Agent':'DELTA-static-build'}});
if(!source.ok)throw Error('Budget snapshot failed: '+source.status);
await writeFile('/tmp/budget-source.tar.gz',Buffer.from(await source.arrayBuffer()));
await mkdir('/tmp/budget-export',{recursive:true});
execFileSync('tar',['-xzf','/tmp/budget-source.tar.gz','--strip-components=1','-C','/tmp/budget-export']);
await cp('/tmp/budget-export','public',{recursive:true});
console.log('Verified static budget snapshot prepared.');
