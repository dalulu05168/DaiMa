const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const { _electron,chromium }=require(process.env.EW_PLAYWRIGHT_MODULE || 'playwright');
const stage=process.argv[2];
const data=process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(),'westcott-fresh-'));
const port=process.argv[4] || '43191';
const base='http://127.0.0.1:'+port;
const overlay=stage
  ? path.join(stage,'resources','workshop','theme','workshop-ui.js')
  : path.join(process.env.EW_CLOUDCLI_SOURCE || path.join(__dirname,'claudecodeui-local'),'theme','workshop-ui.js');
const result={};
const env={...process.env,EW_DATA_DIR:path.join(data,'ew'),EW_DESKTOP_DIR:path.join(data,'out'),EW_WORKSHOP_DATA_DIR:path.join(data,'cloud'),EW_WORKSHOP_PORT:port};
const folder=env.EW_WORKSHOP_DATA_DIR;
for(const dir of [data,env.EW_DESKTOP_DIR,env.EW_DATA_DIR])fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(env.EW_DATA_DIR,'calendar-reminder.json'),JSON.stringify({provisionalShownAt:Date.now()}));
const fetchJSON=async(url,options)=>{
 const r=await fetch(base+url,{...options,signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error(url+' returned HTTP '+r.status);
 return r.json();
};

async function integrated() {
 const app=await _electron.launch({executablePath:path.join(stage,'ELLERY WESTCOTT.exe'),cwd:stage,args:['--headless'],env,timeout:25000});
 try {
  const shell=await app.firstWindow();
  await shell.locator('.chennan-wordmark').waitFor({timeout:10000});
  assert.match(await shell.locator('.version').innerText(),/1\.4\.31/);
  assert.equal((await shell.evaluate(()=>window.workstation.activate('today'))).ok,true);
  const opened=await shell.evaluate(()=>window.workstation.activate('workshop'));
  assert.equal(opened.ok,true,opened.error);
  const view=app.windows().find(p=>p.url().startsWith(base+'/'));
  assert.ok(view,'No embedded window');
  const status=await fetchJSON('/api/auth/status');
  assert.equal(status.needsSetup,true);
  const identity=await fetchJSON('/__westcott/workshop-health?nonce='+randomBytes(24).toString('hex'));
  assert.match(identity.proof,/^[0-9a-f]{64}$/);
  const account=await fetchJSON('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'isolated-audit',password:randomBytes(20).toString('hex')})});
  assert.equal(typeof account.token,'string');
  await view.evaluate(()=>localStorage.setItem('auth-token','bad.invalid.token'));
  await view.reload();
  const authStatus=await view.evaluate(async()=>{
    const token=localStorage.getItem('auth-token');
    if(!token) return {present:false,status:0};
    const res=await fetch('/api/auth/user',{headers:{Authorization:'Bearer '+token}});
    return {present:true,changed:token!=='bad.invalid.token',status:res.status};
  });
  result.authStatus=authStatus;
  assert.deepEqual(authStatus,{present:true,changed:true,status:200},'Embedded auto-login failed');
  const state=await shell.evaluate(()=>window.workstation.selfCheck(false));
  assert.match(JSON.stringify(state),/后台及本地登录已验证/);
  assert.equal((await shell.evaluate(()=>window.workstation.activate('today'))).ok,true);
  assert.equal((await shell.evaluate(()=>window.workstation.activate('workshop'))).ok,true);
  assert.equal(app.windows().filter(p=>p.url().startsWith(base+'/')).length,1);
  result.desktop={firstStart:true,localLoginRecovered:true,workshopSelfCheck:true,singleView:true,authDbCreated:fs.existsSync(path.join(folder,'auth.db'))};
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}
}

async function overlayTest(){
 const edge=path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)','Microsoft','Edge','Application','msedge.exe');
 const browser=await chromium.launch({executablePath:process.env.EW_BROWSER_EXECUTABLE || (fs.existsSync(edge)?edge:undefined),headless:true});
 try{
  const p=await browser.newPage();
  await p.setContent('<main><h1>CloudCLI</h1><form data-slot="prompt-input"><textarea>unsent draft</textarea><button type="submit">Send</button></form></main>');
  await p.evaluate(()=>{window.submits=[];document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();submits.push(document.querySelector('textarea').value);});});
  await p.addScriptTag({path:overlay});
  const quick=p.getByRole('button',{name:'写上午场'});
  const textbox=p.locator('textarea');
  await quick.click();
  assert.equal(await textbox.inputValue(),'unsent draft');
  await textbox.fill('');
  await p.locator('button[type=submit]').evaluate(el=>el.disabled=true);
  await quick.click();
  assert.equal(await textbox.inputValue(),'写上午场');
  await textbox.fill('manual change while busy');
  await p.locator('button[type=submit]').evaluate(el=>el.disabled=false);
  await p.waitForTimeout(1100);
  assert.equal(await p.evaluate(()=>submits.length),0);
  await p.locator('button[type=submit]').click();
  assert.deepEqual(await p.evaluate(()=>submits),['manual change while busy']);
  await p.evaluate(()=>{
   document.body.insertAdjacentHTML('beforeend','<div id="approval" class="chat-message tool" data-message-timestamp="t1"><button aria-label="Allow" type="button"><svg></svg></button></div><div id="withoutkey" class="chat-message tool">Missing timestamp</div><div id="ordinary" class="chat-message tool" data-message-timestamp="t2">Routine tool step</div>');
  });
  await p.waitForSelector('#ordinary[data-ew-first]',{state:'attached'});
  assert.equal(await p.locator('#approval').getAttribute('data-ew-tool'),null);
  assert.equal(await p.locator('#withoutkey').getAttribute('data-ew-tool'),null);
  result.overlay={draftPreserved:true,manualSendOnly:true,iconApprovalVisible:true,undatedToolVisible:true,ordinaryToolsFold:true};
 }finally{await browser.close();}
}
Promise.allSettled([overlayTest(),...(stage?[integrated()]:[])]).then(results=>{
 const failures=results.filter(v=>v.status==='rejected');
 for(const v of failures) console.error(v.reason.message);
 console.log(JSON.stringify(result,null,2));
 if(failures.length)process.exitCode=1;
});
