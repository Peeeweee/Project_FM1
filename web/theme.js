// External bootstrap respects the app's script-src 'self' policy and avoids a flash.
(() => {
  let theme;
  try { theme=localStorage.getItem('fm1-dock.theme'); } catch {}
  if(theme!=='light'&&theme!=='dark')theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  document.documentElement.dataset.theme=theme;
})();
