(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),precise=matchMedia('(hover:hover) and (pointer:fine)');
 const lineObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('line-visible');lineObserver.unobserve(entry.target)}}),{threshold:.3});
 document.querySelectorAll('.section-top').forEach(el=>lineObserver.observe(el));
 document.querySelectorAll('.capability').forEach(card=>{
  const surface=document.createElement('div');surface.className='surface-inner';
  while(card.firstChild)surface.append(card.firstChild);card.append(surface);
  let raf=0,x=0,y=0;
  card.addEventListener('pointermove',event=>{
   if(reduced.matches||!precise.matches)return;
   const rect=card.getBoundingClientRect();x=((event.clientY-rect.top)/rect.height-.5)*-5;y=((event.clientX-rect.left)/rect.width-.5)*5;
   if(!raf)raf=requestAnimationFrame(()=>{surface.style.setProperty('--tilt-x',x.toFixed(2)+'deg');surface.style.setProperty('--tilt-y',y.toFixed(2)+'deg');raf=0});
  },{passive:true});
  const reset=()=>{if(raf)cancelAnimationFrame(raf);raf=0;surface.style.setProperty('--tilt-x','0deg');surface.style.setProperty('--tilt-y','0deg')};
  card.addEventListener('pointerleave',reset);card.addEventListener('blur',reset);reduced.addEventListener('change',reset);precise.addEventListener('change',reset);
 });
 const process=document.querySelector('.process');
 if(!process)return;
 const steps=[...process.children];let pending=0;
 function update(){pending=0;const rect=process.getBoundingClientRect(),line=innerHeight*.64;const progress=Math.max(0,Math.min(1,(line-rect.top)/rect.height));process.style.setProperty('--process-progress',String(progress));steps.forEach(step=>step.classList.toggle('step-lit',step.getBoundingClientRect().top<line))}
 function schedule(){if(!pending)pending=requestAnimationFrame(update)}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});update();
})();
