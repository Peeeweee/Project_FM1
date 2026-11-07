// Curated parameter recipes for the Blacksmith one-voice engine.
// These are original synth settings, not audio samples or factory FM1 patches.
const families = [
  {name:'Warm keys', code:'WARM', wave:'triangle', cutoff:2600, attack:35, release:400},
  {name:'Soft keys', code:'SOFT', wave:'sine', cutoff:4200, attack:55, release:650},
  {name:'Pluck', code:'PLCK', wave:'triangle', cutoff:5400, attack:5, release:160},
  {name:'Sub bass', code:'SUBB', wave:'sine', cutoff:800, attack:12, release:220},
  {name:'Acid bass', code:'ACID', wave:'sawtooth', cutoff:1650, attack:6, release:260},
  {name:'Pulse lead', code:'PULS', wave:'square', cutoff:4800, attack:9, release:320},
  {name:'Bright lead', code:'LEAD', wave:'sawtooth', cutoff:9300, attack:10, release:380},
  {name:'Air pad', code:'AIRP', wave:'sine', cutoff:7600, attack:650, release:1800},
  {name:'Dream pad', code:'DRMP', wave:'triangle', cutoff:4400, attack:840, release:2200},
  {name:'Noise texture', code:'NOIS', wave:'noise', cutoff:2000, attack:100, release:900},
  {name:'Dust texture', code:'DUST', wave:'noise', cutoff:900, attack:30, release:600},
  {name:'8-bit tone', code:'BIT8', wave:'square', cutoff:6900, attack:5, release:150},
];
const moods = ['Clean','Hazy','Dark','Bright','Short','Long','Wobble','Crunch'];
const moodCodes = ['CLN','HZY','DRK','BRT','SHT','LNG','WBL','CRN'];
const levels = ['Low','Mid','High'];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export const soundLibrary = Object.freeze(families.flatMap((family,fi)=>moods.flatMap((mood,mi)=>levels.map((register,ri)=>{
  const recipeMood=family.wave==='noise'&&mi===6?'Grainy':mood;
  const factor=[.7,1,1.28][ri];
  const cutoff=clamp(Math.round(family.cutoff*factor*[1,.65,.4,1.65,1,1,1,1][mi]),100,16000);
  const attack=clamp(Math.round(family.attack*[1,1.4,1,1,.6,1.5,1,1][mi]),5,2000);
  const release=clamp(Math.round(family.release*[1,1.2,1,1,.45,1.7,1,1][mi]),20,3000);
  const preset=Object.freeze({
    name:`${family.code} ${recipeMood==='Grainy'?'GRN':moodCodes[mi]} ${register[0]}`,
    wave:family.wave, attack, release, cutoff,
    bits:family.name==='8-bit tone'||mi===7?8:recipeMood==='Grainy'?10:mi===1?12:16,
    drive:mi===7?2.2:recipeMood==='Grainy'?1.3:1,
    tune:[-12,0,12][ri], level:0.75,
    pulse:family.wave==='square'?[.25,.5,.7][ri]:.5,
    lfoRate:recipeMood==='Wobble'?4.5:0, lfoDepth:recipeMood==='Wobble'?18:0,
  });
  return Object.freeze({id:`S${String(fi*24+mi*3+ri+1).padStart(3,'0')}`,title:`${recipeMood} ${family.name} · ${register}`,family:family.name,mood:recipeMood,register,preset});
}))));

export const soundFamilies=Object.freeze(['All',...families.map(f=>f.name)]);
export function findSounds(query='',family='All'){
  const q=query.trim().toLowerCase();
  return soundLibrary.filter(item=>(family==='All'||item.family===family)&&(!q||`${item.title} ${item.preset.wave}`.toLowerCase().includes(q)));
}
