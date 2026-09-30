const panel=document.getElementById('install-panel');
const button=document.getElementById('install-app');
const status=document.getElementById('install-status');
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
let pendingPrompt=null;
function updateDisplay(){panel.hidden=standalone();}
updateDisplay();
window.matchMedia('(display-mode: standalone)').addEventListener('change',updateDisplay);
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();pendingPrompt=event;button.hidden=false;
});
button.addEventListener('click',async()=>{
  if(!pendingPrompt)return;
  const prompt=pendingPrompt;pendingPrompt=null;button.hidden=true;
  try{await prompt.prompt();const choice=await prompt.userChoice;status.textContent=choice.outcome==='accepted'?'Installation accepted. Your browser will finish adding the app.':'Installation cancelled. You can keep using the website.';}
  catch{status.textContent='Your browser could not start installation. Use the installation instructions instead.';}
});
window.addEventListener('appinstalled',()=>{pendingPrompt=null;button.hidden=true;panel.hidden=true;});
document.getElementById('install-help').addEventListener('click',()=>{
  const guide=document.getElementById('install-guide');guide.hidden=!guide.hidden;
  document.getElementById('install-help').setAttribute('aria-expanded',String(!guide.hidden));
});
function connectionState(){document.getElementById('connection-warning').hidden=navigator.onLine;}
connectionState();window.addEventListener('online',connectionState);window.addEventListener('offline',connectionState);
if('serviceWorker' in navigator && window.isSecureContext){
  navigator.serviceWorker.register('/app/sw.js',{scope:'/app/',updateViaCache:'none'}).catch(()=>{
    status.textContent='Offline notice could not be enabled. Installation options depend on your browser; live checks remain online-only.';
  });
}
