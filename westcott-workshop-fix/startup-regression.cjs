const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const file = join(__dirname,'app','workshop.cjs');
function setup({ readiness, code=0 }) {
  const module={exports:{}};
  let spawns=0;
  const child=new EventEmitter();
  child.stderr=Readable.from(['specific loader failure']);
  vm.runInNewContext(readFileSync(file,'utf8'),{
    module,process:{resourcesPath:'isolated',env:{USERPROFILE:'isolated'}},AbortSignal,setTimeout,clearTimeout,
    require(id){
      if(id==='electron')return{app:{getPath:()=> 'isolated'}};
      if(id==='node:fs')return{existsSync:()=>true,readFileSync:()=>''};
      if(id==='node:child_process')return{spawn(_node,_args,opts){
        assert.equal(opts.windowsHide,true);
        spawns++;
        setImmediate(()=>child.emit('close',code));
        return child;
      }};
      if(id.endsWith('workshop-peer.cjs'))return{probePeer:async()=>readiness.shift()};
      return require(id);
    }
  });
  return {api:module.exports,spawns:()=>spawns};
}
(async()=>{
 const good=setup({readiness:[{ready:false,answered:false},{ready:true,answered:true}]});
 await Promise.all([good.api.ensureCloudCli(),good.api.ensureCloudCli()]);
 assert.equal(good.spawns(),1);
 const refused=setup({readiness:[{ready:false,answered:true}]});
 await assert.rejects(refused.api.ensureCloudCli(),/身份验证未通过/);
 assert.equal(refused.spawns(),0);
 const bad=setup({readiness:[{ready:false,answered:false}],code:7});
 const start=performance.now();
 await assert.rejects(bad.api.ensureCloudCli(),/CloudCLI 启动失败（7）：specific loader failure/);
 assert.ok(performance.now()-start<1000);
 console.log(JSON.stringify({concurrentStartSingleProcess:true,unverifiedPortRejected:true,launcherExitSurfacedImmediately:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1});