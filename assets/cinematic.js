(() => {
 'use strict';
 const root=document.documentElement,header=document.querySelector('.site-header');
 if(!header)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const coarse=matchMedia('(pointer:coarse)');
 const space=document.createElement('div');space.className='nav-space';space.setAttribute('aria-hidden','true');header.before(space);
 const meter=document.createElement('div');meter.className='motion-meter';meter.setAttribute('aria-hidden','true');document.body.append(meter);
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const ease=n=>1-Math.pow(1-clamp(n),3);
 let pieces=[],headings=[],frame=0,currentY=scrollY,lastY=scrollY,previousTime=0;
 const groups=['.capability-grid','.process','.history','.company-stats','.editorial-cards','.editorial-timeline','.team-facts'];
 for(const selector of groups){
  document.querySelectorAll(selector).forEach(group=>{
   [...group.children].forEach((element,index)=>{
    element.classList.add('scroll-piece');
    pieces.push({element,index:index%4,direction:selector==='.capability-grid'?index-1:(index%2===0?-1:1),done:false});
   });
  });
 }
 document.querySelectorAll('.section-intro,.research-stat,.research-topics>a,.office-line,.document-main>p,.instrument-row,.platform-highlight,.footer-intro').forEach(element=>{
  if(!element.closest('.scroll-piece')){element.classList.add('scroll-piece');pieces.push({element,index:0,direction:0,done:false})}
 });
 // Keep semantic headings intact; only their text nodes are divided into visual words.
 document.querySelectorAll('main h2:not(.editorial-cards h2):not(.editorial-timeline h2):not(.instrument-row h2):not(.platform-highlight h2)').forEach(heading=>{
  if(heading.closest('.scroll-piece'))return;
  const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())if(walker.currentNode.textContent.trim())nodes.push(walker.currentNode);
  const words=[];
  for(const node of nodes){
   const fragment=document.createDocumentFragment();
   node.textContent.split(/(\s+)/).forEach(text=>{
    if(!text.trim())fragment.append(document.createTextNode(text));
    else{const span=document.createElement('span');span.className='motion-word';span.textContent=text;fragment.append(span);words.push(span)}
   });node.replaceWith(fragment);
  }
  heading.classList.add('scroll-heading');headings.push({element:heading,words,done:false});
 });
 function baseHeight(){return innerWidth<=650?76:innerWidth<=950?82:104}
 function resetMotion(){
  for(const item of pieces){item.done=false;item.element.classList.remove('settled');item.element.style.removeProperty('--piece-opacity');item.element.style.removeProperty('--piece-y');item.element.style.removeProperty('--piece-x');item.element.style.removeProperty('--piece-scale');item.element.style.removeProperty('--piece-blur');item.element.style.removeProperty('--piece-rotate')}
  headings.forEach(h=>{h.done=false;h.words.forEach(w=>w.removeAttribute('style'))});schedule();
 }
 function update(now){
  frame=0;
  if(document.hidden){previousTime=0;return}
  const elapsed=previousTime?Math.min(50,now-previousTime):16.7;previousTime=now;
  const target=scrollY;
  currentY=preference.matches?target:currentY+(target-currentY)*(1-Math.exp(-elapsed/85));
  const velocity=clamp((target-lastY)*.15,-3,3);lastY=target;
  const contraction=ease(target/240),mobile=innerWidth<=650;
  root.style.setProperty('--nav-inset',(contraction*(mobile?20:innerWidth<=950?36:80)).toFixed(2)+'px');
  root.style.setProperty('--nav-top',(contraction*(mobile?10:16)).toFixed(2)+'px');
  root.style.setProperty('--nav-radius',(contraction*24).toFixed(2)+'px');
  root.style.setProperty('--nav-height',(baseHeight()-contraction*(mobile?10:innerWidth<=950?10:28)).toFixed(2)+'px');
  const header=document.querySelector('.site-header'),darkSection=document.querySelector('.clients');
  if(header&&darkSection){const a=header.getBoundingClientRect(),b=darkSection.getBoundingClientRect();header.classList.toggle('over-dark',b.top<a.top+a.height*.5&&b.bottom>a.top+a.height*.5)}
  root.style.setProperty('--nav-drift',preference.matches?'0px':(-velocity).toFixed(2)+'px');
  root.style.setProperty('--page-progress',String(clamp(target/Math.max(1,document.documentElement.scrollHeight-innerHeight))));
  const hero=document.querySelector('.hero');
  if(hero&&!preference.matches&&target<hero.offsetHeight+150){
   hero.style.setProperty('--hero-shift',Math.min(currentY*.12,90).toFixed(2)+'px');
   hero.style.setProperty('--hero-scale',(1+Math.min(currentY/10000,.045)).toFixed(4));
   hero.style.setProperty('--copy-shift',(-Math.min(currentY*.055,40)).toFixed(2)+'px');
  }
  if(!preference.matches){
   for(const item of pieces){
    if(item.done)continue;
    const rect=item.element.getBoundingClientRect();
    if(rect.top>innerHeight+140)continue;
    const progress=clamp((innerHeight*.98-rect.top-item.index*24)/(innerHeight*.38));
    const amount=ease(progress),remaining=1-amount;
    item.element.style.setProperty('--piece-opacity',(.1+.9*amount).toFixed(3));
    item.element.style.setProperty('--piece-y',(remaining*(mobile?34:62)).toFixed(2)+'px');
    item.element.style.setProperty('--piece-x',(remaining*item.direction*(mobile?8:26)).toFixed(2)+'px');
    item.element.style.setProperty('--piece-scale',(1-remaining*.045).toFixed(4));
    item.element.style.setProperty('--piece-blur',(remaining*(mobile?2:5)).toFixed(2)+'px');
    item.element.style.setProperty('--piece-rotate',(remaining*(mobile?0:4)).toFixed(2)+'deg');
    if(progress>=1){item.done=true;item.element.classList.add('settled')}
   }
   for(const item of headings){
    if(item.done)continue;
    const top=item.element.getBoundingClientRect().top;
    if(top>innerHeight+80)continue;
    const progress=clamp((innerHeight*.96-top)/(innerHeight*.4));
    item.words.forEach((word,index)=>{
     const amount=ease(clamp(progress*1.45-(index/Math.max(1,item.words.length))*.4));
     word.style.setProperty('--word-opacity',(.16+amount*.84).toFixed(3));
     word.style.setProperty('--word-y',((1-amount)*25).toFixed(2)+'px');
     word.style.setProperty('--word-blur',((1-amount)*3).toFixed(2)+'px');
    });
    if(progress>=1)item.done=true;
   }
  }
  if(Math.abs(target-currentY)>.15||Math.abs(velocity)>.05)schedule();else previousTime=0;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',()=>{space.style.height=baseHeight()+'px';schedule()},{passive:true});
 document.addEventListener('visibilitychange',schedule);
 preference.addEventListener('change',resetMotion);
 document.querySelectorAll('.capability').forEach(card=>{
  card.addEventListener('pointermove',event=>{if(coarse.matches||preference.matches)return;const rect=card.getBoundingClientRect();card.style.setProperty('--pointer-x',(event.clientX-rect.left)+'px');card.style.setProperty('--pointer-y',(event.clientY-rect.top)+'px')},{passive:true});
 });
 // Keyboard focus must never land on dimmed or displaced reading content.
 document.addEventListener('focusin',event=>{const item=pieces.find(p=>p.element.contains(event.target));if(item){item.done=true;item.element.classList.add('settled');item.element.style.setProperty('--piece-opacity','1');item.element.style.setProperty('--piece-x','0px');item.element.style.setProperty('--piece-y','0px');item.element.style.setProperty('--piece-scale','1');item.element.style.setProperty('--piece-rotate','0deg')}});
 space.style.height=baseHeight()+'px';schedule();
})();
