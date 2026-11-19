(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const RAD=Math.PI/180,TAU=Math.PI*2;
 const renderers=[];
 function canvasFor(parent,label){
  const c=document.createElement('canvas');c.setAttribute('role','img');c.setAttribute('aria-label',label);parent.append(c);
  const scene={canvas:c,ctx:c.getContext('2d'),w:0,h:0,visible:false,draw:null,time:0};
  new ResizeObserver(()=>{const box=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.7);scene.w=box.width;scene.h=box.height;c.width=Math.round(box.width*d);c.height=Math.round(box.height*d);scene.ctx.setTransform(d,0,0,d,0,0);if(scene.draw)scene.draw(scene.time)}).observe(c);
  new IntersectionObserver(es=>{scene.visible=es[0].isIntersecting;if(scene.visible&&scene.draw)scene.draw(scene.time)},{rootMargin:'80px'}).observe(c);
  renderers.push(scene);return scene;
 }
 function glow(ctx,x,y,r,strength=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(239,190,72,${.5*strength})`);g.addColorStop(1,'rgba(239,190,72,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
 function dot(ctx,x,y,r=3){glow(ctx,x,y,r*5,.7);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='#d5a42c';ctx.fill();ctx.beginPath();ctx.arc(x-r*.2,y-r*.2,r*.35,0,TAU);ctx.fillStyle='#fff9da';ctx.fill()}
 function line(ctx,points,color='#c5a65b',width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 const hero=document.querySelector('.hero-art');
 if(hero&&Array.isArray(window.MAACRO_LAND)){
  const globe=canvasFor(hero,'A continuously rotating three-dimensional globe showing continental land points and moving orbital lights');globe.canvas.className='live-globe';
  hero.classList.add('has-live-globe');let spin=-1.2,paused=false,previous=0,breathTime=0;
  const toggle=document.createElement('button');toggle.className='globe-control';toggle.textContent='Pause rotation';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Pause globe rotation');hero.append(toggle);
  toggle.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'Resume rotation':'Pause rotation';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Resume globe rotation':'Pause globe rotation')});
  const points=window.MAACRO_LAND.map(([lon,lat])=>[Math.cos(lat*RAD)*Math.sin(lon*RAD),Math.sin(lat*RAD),Math.cos(lat*RAD)*Math.cos(lon*RAD)]);
  function project(x,y,z,r,cx,cy){const xx=x*Math.cos(spin)+z*Math.sin(spin),zz=-x*Math.sin(spin)+z*Math.cos(spin);const yy=y*.988-zz*.155,depth=y*.155+zz*.988;return [cx+xx*r,cy-yy*r,depth]}
  globe.draw=time=>{
   const {ctx,w,h}=globe;if(!w||!h)return;
   const dt=previous?Math.min(.08,time-previous):0;previous=time;if(!paused&&!reduced.matches){spin+=dt*.15;breathTime+=dt;}
   ctx.clearRect(0,0,w,h);const cx=w*.51,cy=h*.45,r=Math.min(w*.31,h*.36);
   const expansion=reduced.matches?0:(1-Math.cos(breathTime*TAU/10))*.5;
   ctx.save();const ground=ctx.createRadialGradient(cx,cy+r*1.2,0,cx,cy+r*1.2,r*1.5);ground.addColorStop(0,'#d6ac4d38');ground.addColorStop(1,'#d6ac4d00');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(cx,cy+r*1.17,r*1.55,r*.28,0,0,TAU);ctx.fill();
   for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(cx,cy+r*1.14,r*(1+i*.17),r*(.14+i*.025),0,0,TAU);ctx.strokeStyle=`rgba(193,151,55,${.35-i*.065})`;ctx.lineWidth=i? .7:1.4;ctx.stroke()}
   const shell=ctx.createRadialGradient(cx-r*.38,cy-r*.4,0,cx+r*.25,cy+r*.2,r*1.4);shell.addColorStop(0,'#fffefa');shell.addColorStop(.4,'#f1ead9');shell.addColorStop(.78,'#c6c3b8');shell.addColorStop(1,'#9c998d');
   ctx.shadowColor='#7f6c3930';ctx.shadowBlur=35;ctx.shadowOffsetY=15;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=shell;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.save();ctx.beginPath();ctx.arc(cx,cy,r*1.2,0,TAU);ctx.clip();
   for(let lat=-60;lat<=60;lat+=20){let segment=[];for(let lon=-180;lon<=180;lon+=3){const la=lat*RAD,lo=lon*RAD,p=project(Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo),r,cx,cy);if(p[2]>0)segment.push(p.slice(0,2));else if(segment.length){line(ctx,segment,'#b3a88444',.55);segment=[]}}if(segment.length)line(ctx,segment,'#b3a88444',.55)}
   for(let lon=-180;lon<180;lon+=20){let segment=[];for(let lat=-89;lat<=89;lat+=3){const la=lat*RAD,lo=lon*RAD,p=project(Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo),r,cx,cy);if(p[2]>0)segment.push(p.slice(0,2));else if(segment.length){line(ctx,segment,'#a89d7b44',.55);segment=[]}}if(segment.length)line(ctx,segment,'#a89d7b44',.55)}
   for(let i=0;i<points.length;i++){const spread=1+expansion*(.10+.09*(.5+.5*Math.sin(i*2.399)));const p=project(...points[i],r*spread,cx,cy);if(p[2]<=0)continue;const size=Math.max(.65,r*.009)*( .45+p[2]*.65);ctx.fillStyle=i%7===0?`rgba(247,217,133,${.5+p[2]*.5})`:`rgba(171,126,31,${.26+p[2]*.65})`;ctx.fillRect(p[0]-size/2,p[1]-size/2,size,size)}
   const sheen=ctx.createRadialGradient(cx-r*.4,cy-r*.5,0,cx-r*.4,cy-r*.5,r*.95);sheen.addColorStop(0,'#ffffffaa');sheen.addColorStop(1,'#ffffff00');ctx.fillStyle=sheen;ctx.fillRect(cx-r,cy-r,r*2,r*2);ctx.restore();
   ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle='#d8b865bb';ctx.lineWidth=1;ctx.stroke();
   for(let i=0;i<3;i++){const angle=[-.4,.45,-.9][i];ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,r*(1.33+i*.04),r*(.25+i*.04),0,0,TAU);ctx.strokeStyle='#c49a3c77';ctx.lineWidth=i? .65:1.2;ctx.stroke();const a=spin*(1+i*.3)+i*2.2;dot(ctx,Math.cos(a)*r*(1.33+i*.04),Math.sin(a)*r*(.25+i*.04),i?2.6:3.7);ctx.restore()}
   ctx.restore();globe.canvas.dataset.rotation=spin.toFixed(4);globe.canvas.dataset.expansion=expansion.toFixed(4);
  };
  reduced.addEventListener('change',()=>{toggle.hidden=reduced.matches;previous=0;globe.draw(globe.time)});toggle.hidden=reduced.matches;
 }
 function drawScene(scene,type,t){
  const {ctx,w,h}=scene;if(!w||!h)return;ctx.clearRect(0,0,w,h);
  const cx=w*.5,cy=h*.54,scale=Math.min(w/600,h/300);ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
  // Every diagram is illustrative and uses no invented market data.
  if(type==='capital'){
   for(let i=0;i<5;i++){const x=(i-2)*65,y=Math.sin(t*.45+i)*3,bh=55+i*17;
    const fill=ctx.createLinearGradient(x-22,-bh,x+22,40);fill.addColorStop(0,i%2?'#d8be7b99':'#ffffff');fill.addColorStop(1,i%2?'#aa852a88':'#dbd4c2');
    ctx.fillStyle=fill;ctx.fillRect(x-23,-bh+y,46,bh+35);ctx.strokeStyle='#c5ad734d';ctx.strokeRect(x-23,-bh+y,46,bh+35);
    line(ctx,[[x-23,-bh+y],[x-8,-bh-11+y],[x+38,-bh-11+y],[x+23,-bh+y]],'#b99d5b88');line(ctx,[[x+23,-bh+y],[x+38,-bh-11+y],[x+38,24],[x+23,35]],'#b99d5b88');
   }
   const path=[];for(let x=-220;x<=220;x+=4)path.push([x,40-Math.sin((x+220)/440*Math.PI)*75]);line(ctx,path,'#d4aa3a',1.8);let a=(t*.08)%1;dot(ctx,-220+a*440,40-Math.sin(a*Math.PI)*75,4);
  }else if(type==='execution'){
   const nodes=[[-190,0],[-105,-65],[-100,65],[0,0],[105,-65],[100,65],[190,0]];
   for(const [a,b] of [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6]]){line(ctx,[nodes[a],nodes[b]],'#bca66b66',1);const u=(t*.22+a*.12)%1;dot(ctx,nodes[a][0]+(nodes[b][0]-nodes[a][0])*u,nodes[a][1]+(nodes[b][1]-nodes[a][1])*u,2.2)}
   nodes.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,i===3?31:19,0,TAU);ctx.fillStyle=i===3?'#d8b458':'#fffdf6';ctx.fill();ctx.strokeStyle='#c7af70';ctx.stroke();ctx.beginPath();ctx.arc(x,y,5,0,TAU);ctx.fillStyle=i===3?'#fff9e8':'#c8a447';ctx.fill()});
  }else{
   for(let row=0;row<18;row++){const points=[];for(let x=-235;x<=235;x+=6){const y=Math.sin(x*.014+t*.25+row*.12)*23-Math.exp(-Math.pow((x+70)/70,2))*55-Math.exp(-Math.pow((x-125)/55,2))*70+row*5-30;points.push([x,y])}line(ctx,points,row%4===0?'#c39b35aa':'#b9b5a855',row%4===0?1:.6)}
   for(let col=0;col<30;col++){const x=-235+col*16,points=[];for(let row=0;row<18;row++){const y=Math.sin(x*.014+t*.25+row*.12)*23-Math.exp(-Math.pow((x+70)/70,2))*55-Math.exp(-Math.pow((x-125)/55,2))*70+row*5-30;points.push([x,y])}line(ctx,points,'#baaa7b55',.55)}
   for(let i=0;i<3;i++){const x=[-145,-60,125][i];dot(ctx,x,Math.sin(x*.014+t*.25)*23-Math.exp(-Math.pow((x+70)/70,2))*55-Math.exp(-Math.pow((x-125)/55,2))*70-30,3)}
  }
  ctx.restore();
 }
 const content=[
  {name:'Private markets',title:'Private Markets & Strategic Investment',type:'capital',copy:'Strategic investment support, growth capital matching and private market allocation assistance, supported by preliminary screening, due diligence coordination and subsequent tracking.',tags:['Long-term perspective','Due diligence','Strategic capital'],url:'asset-allocation.html'},
  {name:'Institutional markets',title:'Institutional Markets & Execution Support',type:'execution',copy:'Market access and trading assistance through institutional channels. Execution plans are coordinated around liquidity needs, internal approval processes and risk parameters.',tags:['Market access','Execution coordination','Risk awareness'],url:'institutional-trading-institutional-trading-platform.html'},
  {name:'Quantitative support',title:'Quantitative Strategy Support',type:'research',copy:'Systematic models and data analysis explore market structure, liquidity, volatility and capital flows. The focus is research quality, model discipline and risk adjustment.',tags:['Systematic analysis','Market structure','Model discipline'],url:'quantitative-platform.html'}
 ];
 const path=location.pathname.split('/').pop();
 if(path==='investment-capabilities.html'){
  const original=document.querySelector('.editorial-block');
  if(original){
   const explorer=document.createElement('section');explorer.className='visual-explorer';explorer.setAttribute('aria-label','Explore investment capabilities');
   explorer.innerHTML='<div class="visual-explorer-tabs" role="tablist" aria-label="Investment capabilities"></div><div class="visual-stage"><span class="visual-stage-label">Private capital / illustrative framework</span><span class="visual-stage-note">ILLUSTRATIVE · NOT MARKET DATA</span></div><div class="visual-copy" role="tabpanel" id="capability-visual-panel"><h2></h2><p></p><div class="visual-keypoints"></div><a>Explore this capability →</a></div>';
   original.replaceWith(explorer);const stage=explorer.querySelector('.visual-stage'),scene=canvasFor(stage,'Animated illustrative model of the selected investment capability');let active=0;
   scene.draw=t=>drawScene(scene,content[active].type,t);
   const tablist=explorer.querySelector('[role=tablist]'),panel=explorer.querySelector('[role=tabpanel]');
   const buttons=content.map((item,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.id='capability-visual-tab-'+i;b.textContent=item.name;b.setAttribute('aria-controls',panel.id);tablist.append(b);return b});
   function select(i,focus=false){active=i;const data=content[i];buttons.forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1});panel.setAttribute('aria-labelledby',buttons[i].id);panel.querySelector('h2').textContent=data.title;panel.querySelector('p').textContent=data.copy;panel.querySelector('a').href=data.url;stage.querySelector('.visual-stage-label').textContent=data.name+' / illustrative framework';panel.querySelector('.visual-keypoints').replaceChildren(...data.tags.map(text=>{const span=document.createElement('span');span.textContent=text;return span}));scene.canvas.setAttribute('aria-label','Animated illustrative '+data.name+' model');scene.draw(scene.time);if(!reduced.matches){panel.animate([{opacity:.2,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'ease-out'});scene.canvas.animate([{opacity:.1,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:700,easing:'ease-out'})}if(focus)buttons[i].focus()}
   buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%3;else if(e.key==='ArrowLeft')next=(i+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();select(next,true)})});select(0);
  }
 }
 // Add a contextual moving diagram to relevant destination pages.
 const pageTypes={'asset-allocation.html':'capital','wealth-management.html':'capital','institutional-trading-institutional-trading-platform.html':'execution','quantitative-platform.html':'research','insights-perspectives.html':'research','global-presence.html':'execution','global-office-locations.html':'execution','our-approach.html':'execution'};
 if(pageTypes[path]){
  const h1=document.querySelector('.document-main h1'),mini=document.createElement('div');mini.className='visual-mini';h1.after(mini);const scene=canvasFor(mini,'Illustrative animated '+pageTypes[path]+' framework, not market data');scene.draw=t=>drawScene(scene,pageTypes[path],t);
 }
 document.querySelectorAll('.capability .surface-inner').forEach((card,i)=>{const img=document.createElement('img');img.className='visual-icon';img.src='assets/service-icon-'+[0,1,3][i%3]+'.svg';img.alt='';card.prepend(img)});
 document.querySelectorAll('.editorial-cards article').forEach((card,i)=>{const img=document.createElement('img');img.className='visual-icon';img.src='assets/service-icon-'+i%4+'.svg';img.alt='';card.querySelector('h2').before(img)});
 let previous=0,clock=0;
 function loop(now){requestAnimationFrame(loop);if(document.hidden){previous=0;return}if(previous&&now-previous<33)return;const dt=previous?Math.min(.08,(now-previous)/1000):0;previous=now;if(!reduced.matches)clock+=dt;for(const scene of renderers){if(!scene.visible||!scene.draw)continue;scene.time=clock;if(!reduced.matches||!scene.staticDrawn){scene.draw(clock);scene.staticDrawn=true}}}
 reduced.addEventListener('change',()=>renderers.forEach(s=>s.staticDrawn=false));requestAnimationFrame(loop);
})();
