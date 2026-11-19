const menu=document.querySelector('.menu-button');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menu.setAttribute('aria-expanded','false')}
menu.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
navigation.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
const clientData=[
 ['Institutional investors','Market research, institutional trading and execution assistance, supported by dedicated liaison and coordinated regional teams.','investment-capabilities.html'],
 ['Professional asset managers','Research and market access support for professional investment firms, aligned with internal approval processes, execution needs and risk parameters.','institutional-trading-institutional-trading-platform.html'],
 ['Family offices','Global market analysis and private market opportunities, shaped by long-term allocation goals, liquidity needs and succession considerations.','wealth-management.html'],
 ['Qualified corporate clients','Capital market solutions and cross-border resource coordination, tailored to institutional objectives and applicable qualification requirements.','investment-capabilities.html']
];
const tabs=[...document.querySelectorAll('[data-client]')];
const detail=document.querySelector('#client-detail');
function selectClient(index,focus=false){
 tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});
 detail.setAttribute('aria-labelledby',tabs[index].id);
 detail.querySelector('.client-index').textContent=String(index+1).padStart(2,'0');
 detail.querySelector('h3').textContent=clientData[index][0];
 detail.querySelector('p').textContent=clientData[index][1];
 const link=detail.querySelector('a');link.href=clientData[index][2];link.setAttribute('aria-label','Explore services for '+clientData[index][0].toLowerCase());
 if(focus)tabs[index].focus();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  detail.animate([{opacity:.25,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectClient(index));tab.addEventListener('keydown',e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();selectClient(next,true)})});
const sections=[...document.querySelectorAll('main section[id]')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){navigation.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id))}}},{rootMargin:'-15% 0px -65% 0px'});
sections.forEach(section=>observer.observe(section));

// Progressive motion: content stays visible if animation APIs are unavailable.
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
// Retain the original soft entrance on inner content. The cinematic controller
// owns outer cards, so the two layers never animate the same transform.
const entranceTargets=document.querySelectorAll('.section .split-heading,.capability,.process article,.research-layout,.clients h2,.client-tabs,.company-stats,.history article,.contact h2');
const entranceObserver=new IntersectionObserver(entries=>{
 for(const entry of entries){
  if(!entry.isIntersecting)continue;
  if(!motionPreference.matches&&entry.target.animate){
   const target=entry.target;
   const nested=target.matches('.capability,.process article,.history article');
   const content=target.querySelector('.surface-inner')||target;
   const parts=nested?[...content.children]:[target];
   parts.forEach((part,index)=>{
    const animation=part.animate([
     {opacity:.25,transform:'translateY(18px)'},
     {opacity:1,transform:'translateY(0)'}
    ],{duration:780,delay:nested?index*65:0,easing:'cubic-bezier(.2,.75,.2,1)'});
    const reduce=()=>{if(motionPreference.matches)animation.cancel()};
    motionPreference.addEventListener('change',reduce);
    animation.finished.catch(()=>{}).finally(()=>motionPreference.removeEventListener('change',reduce));
   });
  }
  entranceObserver.unobserve(entry.target);
 }
},{threshold:.16});
entranceTargets.forEach(element=>entranceObserver.observe(element));
