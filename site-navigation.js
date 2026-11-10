'use strict';
(() => {
const toggle=document.getElementById('menuToggle'),links=document.getElementById('navLinks');
if(!toggle||!links)return;
const close=()=>{links.classList.remove('open');toggle.setAttribute('aria-expanded','false');};
toggle.addEventListener('click',()=>{const open=links.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
links.addEventListener('click',event=>{if(event.target.closest('a')){close();links.querySelectorAll('details[open]').forEach(n=>{n.open=false;});}});
document.addEventListener('click',event=>{links.querySelectorAll('details[open]').forEach(n=>{if(!n.contains(event.target))n.open=false;});});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){links.querySelectorAll('details[open]').forEach(n=>{n.open=false;});close();}});
})();
