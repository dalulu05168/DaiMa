(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const data=[
  {title:'Private Markets & Strategic Investment',text:'Strategic investment support, growth capital matching and private market allocation assistance. We support preliminary screening, due diligence coordination, information organization and subsequent tracking around the client’s allocation objectives and risk preferences.',tags:['Preliminary screening','Due diligence coordination','Long-term opportunities'],url:'asset-allocation.html',icon:0},
  {title:'Institutional Markets & Execution Support',text:'Institutional market access and trading assistance through professional networks and execution support teams. Plans are aligned with liquidity needs, internal approval processes and compliance requirements, with regional coordination for cross-market needs.',tags:['Market access','Execution coordination','Cross-market support'],url:'institutional-trading-institutional-trading-platform.html',icon:1},
  {title:'Quantitative Strategy Support',text:'Systematic research models, data analysis and risk management frameworks support institutional decision-making. Research considers market structure, liquidity, volatility, capital flows, risk exposure and correlations, emphasizing model discipline and research quality.',tags:['Systematic research','Risk adjustment','350+ stocks & ETFs'],url:'quantitative-platform.html',icon:3}
 ];
 const cards=[...document.querySelectorAll('.capability')];
 if(cards.length&&typeof HTMLDialogElement!=='undefined'){
  const dialog=document.createElement('dialog');dialog.className='detail-dialog';dialog.setAttribute('aria-labelledby','detail-dialog-title');
  dialog.innerHTML='<div class="detail-dialog-head"><span>EXPLORE OUR CAPABILITIES</span><button class="detail-close" type="button" aria-label="Close capability details">×</button></div><div class="detail-dialog-body"><img class="visual-icon" alt=""><h2 id="detail-dialog-title"></h2><p class="detail-description"></p><div class="dialog-points"></div><div class="dialog-art" aria-hidden="true"></div><div class="dialog-links"><a>View full capability →</a><button type="button">Back to overview</button></div></div>';
  document.body.append(dialog);let opener=null,oldOverflow='';
  function close(){dialog.close()}
  dialog.querySelector('.detail-close').addEventListener('click',close);dialog.querySelector('.dialog-links button').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
  dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;opener?.focus()});
  cards.forEach((card,i)=>{
   card.setAttribute('aria-haspopup','dialog');
   card.addEventListener('click',e=>{
    if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
    e.preventDefault();const item=data[i%data.length];opener=card;
    dialog.querySelector('h2').textContent=item.title;dialog.querySelector('.detail-description').textContent=item.text;dialog.querySelector('.visual-icon').src='assets/service-icon-'+item.icon+'.svg';dialog.querySelector('.dialog-links a').href=item.url;
    dialog.querySelector('.dialog-points').replaceChildren(...item.tags.map(text=>{const span=document.createElement('span');span.textContent=text;return span}));
    const art=dialog.querySelector('.dialog-art');art.replaceChildren();
    [item.icon,0,3].forEach((icon,n)=>{if(n){const connector=document.createElement('span');connector.className='dialog-connector';art.append(connector)}const img=document.createElement('img');img.src='assets/service-icon-'+icon+'.svg';img.alt='';art.append(img)});
    oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
    if(!reduced.matches)dialog.animate([{opacity:0,transform:'translateY(24px) scale(.96)',filter:'blur(5px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
   });
  });
 }
 const path=location.pathname.split('/').pop();
 if(!['global-presence.html','global-office-locations.html'].includes(path))return;
 const main=document.querySelector('.document-main');if(!main)return;
 const locations=[
  ['New York','Headquarters','North America','New York is the company’s headquarters. Core decision-making and research support remain centered here.'],
  ['Chicago','Regional base','North America','Chicago is listed in the company’s North American service network. Regional bases support local client liaison, market information collection and resource coordination.'],
  ['Boston','Regional base','North America','Boston is listed in the company’s North American service network. Regional bases support local client liaison, market information collection and resource coordination.'],
  ['Singapore','Regional base','Asia-Pacific','Singapore is listed in the company’s Asia-Pacific service network. Regional bases support local client liaison and cross-regional resource coordination.'],
  ['Hong Kong','Regional base','Asia-Pacific','Hong Kong, China is listed in the company’s Asia-Pacific service network. Regional bases support local client liaison and cross-regional resource coordination.'],
  ['Sydney','Regional base','Australia','Sydney is listed in the company’s Australian service network. Regional bases support local client liaison and cross-regional resource coordination.']
 ];
 const section=document.createElement('section');section.className='office-explorer';section.setAttribute('aria-label','Explore our office network');
 section.innerHTML='<div class="office-explorer-top">GLOBAL PRESENCE / SELECT A CITY</div><div class="city-network" role="tablist" aria-label="Office cities"></div><div class="office-detail" role="tabpanel" id="office-panel"><span class="office-region"></span><h2></h2><p></p><a href="contact-us.html">Institutional inquiries →</a></div>';
 main.querySelector('h1').after(section);const panel=section.querySelector('[role=tabpanel]');
 const buttons=locations.map((city,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.className='city-node';b.id='city-tab-'+i;b.setAttribute('aria-controls',panel.id);const strong=document.createElement('strong');strong.textContent=city[0];const small=document.createElement('small');small.textContent=city[1];b.append(strong,small);section.querySelector('[role=tablist]').append(b);return b});
 function select(index,focus=false){const city=locations[index];buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1});panel.setAttribute('aria-labelledby',buttons[index].id);panel.querySelector('.office-region').textContent=city[2]+' / '+city[1];panel.querySelector('h2').textContent=city[0];panel.querySelector('p').textContent=city[3];if(!reduced.matches)panel.animate([{opacity:.2,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});if(focus)buttons[index].focus()}
 buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();select(next,true)})});select(0);
})();
