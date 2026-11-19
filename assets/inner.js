const menu=document.querySelector('.menu-button');
const navigation=document.querySelector('#navigation');
const close=()=>{navigation.classList.remove('open');menu.setAttribute('aria-expanded','false')};
menu.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
navigation.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
let pending=false;
function updateProgress(){const total=document.documentElement.scrollHeight-innerHeight;progress.style.transform='scaleX('+(total>0?Math.min(1,scrollY/total):0)+')';pending=false}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(updateProgress)}},{passive:true});
addEventListener('resize',updateProgress);updateProgress();
