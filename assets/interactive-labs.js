(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),TAU=Math.PI*2;
 const scenes=[];
 function setup(parent,label){
  const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);parent.prepend(canvas);
  const scene={canvas,ctx:canvas.getContext('2d'),w:0,h:0,visible:false,draw:null,t:0};scenes.push(scene);
  new ResizeObserver(()=>{const b=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.7);scene.w=b.width;scene.h=b.height;canvas.width=Math.round(b.width*d);canvas.height=Math.round(b.height*d);scene.ctx.setTransform(d,0,0,d,0,0);scene.draw?.(scene.t)}).observe(canvas);
  new IntersectionObserver(es=>{scene.visible=es[0].isIntersecting;if(scene.visible)scene.draw?.(scene.t)},{rootMargin:'60px'}).observe(canvas);return scene;
 }
 function path(ctx,points,color,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 function light(ctx,x,y,r=3){const halo=ctx.createRadialGradient(x,y,0,x,y,r*6);halo.addColorStop(0,'#e3b84788');halo.addColorStop(1,'#e3b84700');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*6,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='#bd9226';ctx.fill();ctx.beginPath();ctx.arc(x,y,r*.35,0,TAU);ctx.fillStyle='#fff6d8';ctx.fill()}
 const map=document.querySelector('.city-network');
 if(map&&Array.isArray(window.MAACRO_LAND)){
  map.classList.add('map-network');const buttons=[...map.querySelectorAll('.city-node')];
  const cities=[[-74.006,40.713],[-87.63,41.88],[-71.06,42.36],[103.82,1.35],[114.17,22.32],[151.21,-33.87]];
  const labels=[[16,17],[10,53],[38,24],[70,72],[87,34],[86,88]];
  buttons.forEach((b,i)=>{b.style.left=labels[i][0]+'%';b.style.top=labels[i][1]+'%'});
  const caption=document.createElement('span');caption.className='map-caption';caption.textContent='COMPANY OFFICE NETWORK / ILLUSTRATIVE WORLD MAP';map.append(caption);
  const scene=setup(map,'World map with six selectable office cities and animated connections to New York headquarters');let active=0,start=0;
  const project=(lon,lat)=>[scene.w*(.08+(lon+180)/360*.84),scene.h*(.14+(82-lat)/155*.7)];
  scene.draw=t=>{
   const {ctx,w,h}=scene;if(!w||!h)return;ctx.clearRect(0,0,w,h);
   // Geographic dots are taken from the existing source globe's land coordinates.
   for(const [lon,lat] of window.MAACRO_LAND){if(lat< -58)continue;const p=project(lon,lat);ctx.fillStyle='#bcb7a14d';ctx.fillRect(p[0],p[1],Math.max(.7,w*.0017),Math.max(.7,w*.0017))}
   for(let i=0;i<cities.length;i++){
    const point=project(...cities[i]),label=[w*labels[i][0]/100,h*labels[i][1]/100];
    path(ctx,[point,[label[0],point[1]],label],i===active?'#be982a99':'#c8c0a355',.7);
    if(i){
     const origin=project(...cities[0]),target=point,control=[(origin[0]+target[0])/2,Math.min(origin[1],target[1])-h*.18];
     const progress=i===active?Math.min(1,(t-start)*1.4):1,points=[];
     for(let step=0;step<=60*progress;step++){const u=step/60;points.push([(1-u)**2*origin[0]+2*(1-u)*u*control[0]+u*u*target[0],(1-u)**2*origin[1]+2*(1-u)*u*control[1]+u*u*target[1]])}
     path(ctx,points,i===active?'#c79d32bb':'#c8bc9633',i===active?1.4:.6);
     if(!reduced.matches&&i===active){const u=(t*.19)%1;light(ctx,(1-u)**2*origin[0]+2*(1-u)*u*control[0]+u*u*target[0],(1-u)**2*origin[1]+2*(1-u)*u*control[1]+u*u*target[1],2)}
    }
    light(ctx,...point,i===active?3.6:2.2);
   }
  };
  const sync=()=>{const index=buttons.findIndex(b=>b.getAttribute('aria-selected')==='true');if(index!==active){active=Math.max(0,index);start=reduced.matches?scene.t-1:scene.t}scene.draw(scene.t)};
  new MutationObserver(sync).observe(map,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
 }
 const researchHost=document.querySelector('#research')||(['quantitative-platform.html','insights-perspectives.html'].includes(location.pathname.split('/').pop())?document.querySelector('.document-main'):null);
 if(researchHost){
  const themes=[
   {name:'Liquidity',title:'Liquidity & market structure',subtitle:'DEPTH / ACCESS / EXECUTION',text:'Liquidity is considered alongside trading volume and market structure to support institutional research and execution planning.',tags:['Trading volume','Market depth','Execution context']},
   {name:'Volatility',title:'Volatility & risk exposure',subtitle:'VARIATION / EXPOSURE / DISCIPLINE',text:'Volatility and risk exposure form part of the company’s systematic research framework, supporting risk adjustment across different market environments.',tags:['Risk exposure','Model discipline','Risk adjustment']},
   {name:'Capital flows',title:'Capital flows & correlations',subtitle:'MOVEMENT / CONNECTION / CONTEXT',text:'Capital flows and market correlations are analyzed together with broader market structure to support institutional thinking and decision processes.',tags:['Capital flows','Correlations','Global context']}
  ];
  const lab=document.createElement('section');lab.className='research-lab';lab.setAttribute('aria-label','Interactive research themes');
  lab.innerHTML='<div class="lab-header"><span>RESEARCH LENS / EXPLORE A THEME</span><div class="lab-tabs" role="tablist" aria-label="Research themes"></div></div><div class="lab-stage"><div class="lab-axis"><span>ILLUSTRATIVE FRAMEWORK</span><span>NOT LIVE OR HISTORICAL MARKET DATA</span></div></div><div class="lab-panel" role="tabpanel"><div><span class="lab-symbol" aria-hidden="true"></span><span class="lab-subtitle"></span><h3></h3><a href="quantitative-platform.html">Explore the quantitative platform →</a></div><div><p></p><div class="lab-indicators"></div></div></div>';
  const existing=researchHost.querySelector('.visual-mini');if(existing)existing.replaceWith(lab);else (researchHost.querySelector('.split-heading')||researchHost.querySelector('h1')).after(lab);
  const prefix=researchHost.id==='research'?'home-research':'page-research',panel=lab.querySelector('[role=tabpanel]');panel.id=prefix+'-panel';
  const stage=lab.querySelector('.lab-stage'),scene=setup(stage,'Animated illustrative liquidity framework, not market data');let active=0;
  const buttons=themes.map((theme,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.id=prefix+'-tab-'+i;b.textContent=theme.name;b.setAttribute('aria-controls',panel.id);lab.querySelector('[role=tablist]').append(b);return b});
  scene.draw=t=>{
   const {ctx,w,h}=scene;if(!w||!h)return;ctx.clearRect(0,0,w,h);const left=w*.08,right=w*.92,top=h*.18,bottom=h*.82;
   for(let row=0;row<5;row++){const y=top+(bottom-top)*row/4;path(ctx,[[left,y],[right,y]],'#bdb79d24',.6)}
   if(active===0){
    const count=32,gap=(right-left)/count;
    for(let i=0;i<count;i++){const x=left+i*gap,bh=(.25+Math.sin(i*.21+t*.4)*.12+Math.exp(-Math.pow((i-19)/8,2))*.55)*(bottom-top);ctx.fillStyle=i<17?'#c8b37555':'#d3a52f99';ctx.fillRect(x,bottom-bh,gap*.5,bh);ctx.fillStyle='#d9d6cb88';ctx.fillRect(x+gap*.52,bottom-bh*.65,gap*.3,bh*.65)}
    const points=[];for(let x=left;x<=right;x+=4){const u=(x-left)/(right-left),y=bottom-(.3+Math.sin(u*4+t*.25)*.08+u*.35)*(bottom-top);points.push([x,y])}path(ctx,points,'#b48d24',1.7);const u=(t*.08)%1,x=left+u*(right-left),y=bottom-(.3+Math.sin(u*4+t*.25)*.08+u*.35)*(bottom-top);light(ctx,x,y,3);
   }else if(active===1){
    for(let layer=0;layer<7;layer++){const points=[];for(let x=left;x<=right;x+=3){const u=(x-left)/(right-left),envelope=.2+Math.exp(-Math.pow((u-.62)/.17,2))*.8,y=(top+bottom)/2+Math.sin(u*36-t*.8+layer*.13)*envelope*(bottom-top)*.38+layer*2;points.push([x,y])}path(ctx,points,layer===3?'#bb9227dd':'#c3b38355',layer===3?1.8:.7)}
   }else{
    const nodes=[[.12,.5],[.34,.23],[.34,.77],[.57,.5],[.83,.23],[.83,.77]];
    const position=n=>[left+n[0]*(right-left),top+n[1]*(bottom-top)];
    for(const [a,b] of [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[1,4],[2,5]]){const p=position(nodes[a]),q=position(nodes[b]);path(ctx,[p,q],'#baab7755',1);for(let k=0;k<3;k++){const u=(t*.16+a*.1+k/3)%1;light(ctx,p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,1.8)}}
    nodes.forEach((n,i)=>{const p=position(n);ctx.beginPath();ctx.arc(...p,i===3?17:10,0,Math.PI*2);ctx.fillStyle='#fff9ed';ctx.fill();ctx.strokeStyle='#c8af69';ctx.stroke();light(ctx,...p,3)});
   }
  };
  function select(i,focus=false){active=i;const theme=themes[i];buttons.forEach((b,n)=>{b.setAttribute('aria-selected',String(i===n));b.tabIndex=i===n?0:-1});panel.setAttribute('aria-labelledby',buttons[i].id);panel.querySelector('.lab-subtitle').textContent=theme.subtitle;panel.querySelector('h3').textContent=theme.title;panel.querySelector('p').textContent=theme.text;panel.querySelector('.lab-indicators').replaceChildren(...theme.tags.map(text=>{const span=document.createElement('span');span.textContent=text;return span}));scene.canvas.setAttribute('aria-label','Animated illustrative '+theme.name.toLowerCase()+' framework, not market data');scene.draw(scene.t);if(!reduced.matches){stage.animate([{opacity:.3,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],{duration:650,easing:'ease-out'});panel.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'})}if(focus)buttons[i].focus()}
  buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%3;else if(e.key==='ArrowLeft')next=(i+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();select(next,true)})});select(0);
 }
 let last=0,time=0;function tick(now){requestAnimationFrame(tick);if(document.hidden){last=0;return}if(last&&now-last<33)return;const dt=last?Math.min(.08,(now-last)/1000):0;last=now;if(!reduced.matches)time+=dt;for(const scene of scenes){scene.t=time;if(scene.visible&&scene.draw&&(!reduced.matches||!scene.drawn)){scene.draw(time);scene.drawn=true}}}reduced.addEventListener('change',()=>scenes.forEach(s=>s.drawn=false));if(scenes.length)requestAnimationFrame(tick);
})();
