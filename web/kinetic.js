// fm1 motion system. Three.js 0.187.0 is bundled locally (MIT).
// Original procedural geometry/animation; no models, textures, fonts or network.
import * as THREE from './vendor/three.module.js';

let instance;
let currentPage = 'home';
let manuallyPaused = false;
const modes = {home:0,studio:1,vault:2,backup:3,forge:4};
const sculptureNames={home:'Woven loop',studio:'Live waveform',vault:'Floating modules',backup:'Archive vault',forge:'Forged anvil'};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function setKineticPage(page='home') {
  currentPage=Object.hasOwn(modes,page)?page:'home';
  instance?.setPage(currentPage);
}
export function pulseKinetic(velocity=.5) {
  instance?.pulse(Math.max(0,Math.min(1,Number(velocity)||0)));
}
export function setKineticPaused(paused) {
  manuallyPaused=Boolean(paused);
  document.body.dataset.motionPaused=String(manuallyPaused);
  instance?.setPaused(manuallyPaused);
}

/** Wrap actual text nodes, preserving inline styling and line breaks. */
function prepareType(heading) {
  if(heading.dataset.kineticReady)return;
  const label=(heading.innerText||heading.textContent).replace(/\s+/g,' ').trim();
  heading.setAttribute('aria-label',label);
  const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    const fragment=document.createDocumentFragment();
    for(const token of node.textContent.split(/(\s+)/)){
      if(!token)continue;
      if(/^\s+$/.test(token)){fragment.append(document.createTextNode(token));continue;}
      const word=document.createElement('span');word.className='kinetic-word';word.textContent=token;word.setAttribute('aria-hidden','true');fragment.append(word);
    }
    node.replaceWith(fragment);
  }
  heading.dataset.kineticReady='true';
}

export function animatePage(element) {
  if(!element)return;
  const headings=element.querySelectorAll('[data-kinetic-type],h1');
  headings.forEach(prepareType);
  if(reduced()||manuallyPaused||!element.animate)return;
  // Use no persistent fill: interrupted transitions cannot leave a page invisible.
  element.getAnimations().forEach(a=>a.cancel());
  const direction=document.body.dataset.flowDirection==='back'?-1:1;
  element.animate([{opacity:.25,transform:`perspective(1000px) translateX(${direction*22}px) translateY(10px) rotateY(${direction*-1.5}deg)`},{opacity:1,transform:'perspective(1000px) translateX(0) translateY(0) rotateY(0)'}],{duration:620,easing:'cubic-bezier(.16,1,.3,1)'});
  let index=0;
  for(const h of headings)for(const word of h.querySelectorAll('.kinetic-word')){
    word.getAnimations().forEach(a=>a.cancel());
    word.animate([{opacity:0,transform:'translateY(38px) rotateX(-50deg) scale(.96)'},{opacity:1,transform:'translateY(0) rotateX(0) scale(1)'}],{duration:760,delay:index++*75,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  element.querySelectorAll('.firmware-card,.task-card,.studio-live-card,.first-steps').forEach((card,i)=>{
    if(i>14)return;
    card.getAnimations().forEach(a=>a.cancel());
    card.animate([{opacity:0,transform:'translateY(32px) rotateX(5deg)'},{opacity:1,transform:'translateY(0) rotateX(0)'}],{duration:650,delay:Math.min(i*55,450),easing:'cubic-bezier(.16,1,.3,1)'});
  });
}

function fallback(canvas,stage,reduce){
  canvas.hidden=true;
  stage.dataset.renderer='css-fallback';
  const art=document.createElement('div');art.className='kinetic-fallback';art.setAttribute('aria-hidden','true');
  art.innerHTML='<span class="fallback-core"></span><span class="fallback-orbit orbit-one"></span><span class="fallback-orbit orbit-two"></span><span class="fallback-dot dot-one"></span><span class="fallback-dot dot-two"></span><span class="fallback-wave">'+ '<i></i>'.repeat(9) +'</span><span class="fallback-modules">'+ '<i></i>'.repeat(4) +'</span><span class="fallback-archive">'+ '<i></i>'.repeat(4) +'</span><span class="fallback-anvil"></span>';
  const label=document.createElement('small');label.className='motion-renderer-label';label.textContent='2D motion · WebGL unavailable';stage.append(art,label);
  let frame=0,timer;
  const update=()=>{
    const active=!manuallyPaused&&!reduce.matches&&!document.hidden;
    stage.dataset.motionState=manuallyPaused?'paused':reduce.matches?'reduced-motion':document.hidden?'hidden':'css-running';
    canvas.dataset.motionState=stage.dataset.motionState;
    art.style.animationPlayState=active?'running':'paused';
    stage.classList.toggle('motion-is-paused',!active);
    if(timer)clearInterval(timer);
    if(active)timer=setInterval(()=>{canvas.dataset.frame=String(++frame);},250);
  };
  const onPage=e=>setKineticPage(e.detail?.page);
  document.addEventListener('visibilitychange',update);reduce.addEventListener('change',update);window.addEventListener('fm1-page',onPage);
  const api={
    setPage(page){stage.dataset.motionPage=page;art.dataset.motionPage=page;stage.dataset.sculpture=sculptureNames[page];stage.setAttribute('role','img');stage.setAttribute('aria-label',sculptureNames[page]);},
    setPaused(value){manuallyPaused=Boolean(value);document.body.dataset.motionPaused=String(manuallyPaused);update();},
    pause(){this.setPaused(true);},resume(){this.setPaused(false);},pulse(){},
    dispose(){clearInterval(timer);document.removeEventListener('visibilitychange',update);reduce.removeEventListener('change',update);window.removeEventListener('fm1-page',onPage);art.remove();label.remove();instance=null;}
  };
  api.setPage(currentPage);update();return api;
}

export function initKinetic(){
  if(instance)return instance;
  const canvas=document.getElementById('kinetic-canvas');if(!canvas)return null;
  const stage=canvas.parentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  canvas.setAttribute('aria-hidden','true');canvas.dataset.frame='0';
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}
  catch{instance=fallback(canvas,stage,reduce);return instance;}
  stage.dataset.renderer='webgl';canvas.dataset.renderer='webgl';stage.setAttribute('role','img');
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,50);camera.position.set(0,.15,7.1);
  scene.add(new THREE.AmbientLight(0xffffff,2.2));
  const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(3,4,5);scene.add(key);
  const edge=new THREE.DirectionalLight(0xffffff,2.5);edge.position.set(-4,1,-2);scene.add(edge);
  const geometries=new Set(),materials=new Set();
  const geometry=g=>{geometries.add(g);return g;};
  const material=m=>{m.transparent=true;m.userData.baseOpacity=m.opacity;m.userData.lightColor=m.color.getHex();materials.add(m);return m;};
  const dark=()=>material(new THREE.MeshStandardMaterial({color:0x272727,metalness:.55,roughness:.3}));
  const light=opacity=>material(new THREE.LineBasicMaterial({color:0xffffff,opacity}));
  const groups=Object.keys(modes).map(name=>{const group=new THREE.Group();group.name=sculptureNames[name];group.userData.materials=new Set();scene.add(group);return group;});
  const mesh=(group,g,m)=>{const object=new THREE.Mesh(g,m);group.add(object);return object;};
  const outline=(group,g,m)=>{const object=new THREE.LineSegments(geometry(new THREE.EdgesGeometry(g)),m);group.add(object);return object;};

  // Home: the original woven loop, with delicate orbital motion.
  const home=groups[0],knot=geometry(new THREE.TorusKnotGeometry(1,.31,112,14,2,3));
  mesh(home,knot,dark());const knotWire=material(new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,opacity:.16}));
  mesh(home,knot,knotWire).scale.setScalar(1.006);
  const ringGeometry=geometry(new THREE.TorusGeometry(2.05,.014,6,100));
  const ringMaterial=material(new THREE.MeshBasicMaterial({color:0x272727,opacity:.32}));
  const rings=[mesh(home,ringGeometry,ringMaterial),mesh(home,ringGeometry,ringMaterial)];
  const satelliteGeometry=geometry(new THREE.IcosahedronGeometry(.13,0)),satelliteMaterial=dark();
  const satellites=Array.from({length:5},()=>mesh(home,satelliteGeometry,satelliteMaterial));

  // Studio: a dimensional waveform, with independently breathing sound bars.
  const studio=groups[1],barGeometry=geometry(new THREE.CapsuleGeometry(.095,1.2,5,10));
  const barDark=dark(),barSilver=material(new THREE.MeshStandardMaterial({color:0x6e6e6e,metalness:.65,roughness:.25}));
  const bars=Array.from({length:11},(_,i)=>mesh(studio,barGeometry,i%3===0?barSilver:barDark));
  const beadGeometry=geometry(new THREE.SphereGeometry(.045,10,8)),beadMaterial=material(new THREE.MeshBasicMaterial({color:0x7c7c7c}));
  const beads=Array.from({length:11},()=>mesh(studio,beadGeometry,beadMaterial));

  // Firmware: separate interchangeable cubes, expanding and recombining.
  const vault=groups[2],cubeGeometry=geometry(new THREE.BoxGeometry(.58,.58,.58)),cubeDark=dark();
  const cubeLight=material(new THREE.MeshStandardMaterial({color:0x707070,metalness:.55,roughness:.28})),cubeEdge=light(.35);
  const modules=[];
  for(let i=0;i<8;i++){
    const unit=new THREE.Group();vault.add(unit);mesh(unit,cubeGeometry,i===2||i===5?cubeLight:cubeDark);outline(unit,cubeGeometry,cubeEdge);
    modules.push({unit,x:i&1?.46:-.46,y:i&2?.46:-.46,z:i&4?.46:-.46});
  }

  // Backups: layered data plates inside a light protective frame.
  const backup=groups[3],plateGeometry=geometry(new THREE.BoxGeometry(1.85,.16,1.32)),plateDark=dark(),plateEdge=light(.45);
  const labelGeometry=geometry(new THREE.BoxGeometry(.62,.008,.025)),labelMaterial=material(new THREE.MeshBasicMaterial({color:0xbcbcbc}));
  const plates=Array.from({length:4},()=>{const plate=new THREE.Group();backup.add(plate);mesh(plate,plateGeometry,plateDark);outline(plate,plateGeometry,plateEdge);
    for(let j=0;j<3;j++){const line=mesh(plate,labelGeometry,labelMaterial);line.position.set(-.36,.086,-.32+j*.18);}
    return plate;
  });
  const frameGeometry=geometry(new THREE.BoxGeometry(2.65,2.3,1.9));
  outline(backup,frameGeometry,material(new THREE.LineBasicMaterial({color:0x777777,opacity:.42})));

  // Blacksmith: an anvil assembled from beveled-looking solid blocks.
  const forge=groups[4],forgeMetal=dark(),forgeEdge=light(.32);
  for(const [w,h,d,y] of [[2.4,.35,1.1,.55],[.7,.85,.65,0],[1.75,.28,1.1,-.55]]){
    const block=geometry(new THREE.BoxGeometry(w,h,d));mesh(forge,block,forgeMetal).position.y=y;outline(forge,block,forgeEdge).position.y=y;
  }
  const horn=mesh(forge,geometry(new THREE.ConeGeometry(.36,.9,4)),forgeMetal);horn.rotation.z=-Math.PI/2;horn.position.set(1.5,.56,0);

  // Every model owns its materials, so transitions can cross-fade without ghosts.
  for(const group of groups)group.traverse(object=>{if(object.material)group.userData.materials.add(object.material);});
  let weights=groups.map((_,i)=>i===0?1:0),target=[...weights],phase=0,energy=0,aim={x:0,y:0},pointer={x:0,y:0};
  let request=0,last=0,count=0,disposed=false,onscreen=true;
  const sizes=[1,1.25,1.45,1.12,1.1];
  const state=value=>{stage.dataset.motionState=value;canvas.dataset.motionState=value;};
  function draw(dt){
    if(disposed)return;
    const still=reduce.matches||manuallyPaused;
    if(!still)phase+=dt;
    energy*=Math.exp(-dt*3.5);
    const blend=still?1:1-Math.exp(-dt*6);
    weights=weights.map((w,i)=>w+(target[i]-w)*blend);
    if(!still){pointer.x+=(aim.x-pointer.x)*.07;pointer.y+=(aim.y-pointer.y)*.07;}
    for(let i=0;i<groups.length;i++){
      const group=groups[i],weight=weights[i];group.visible=weight>.002;
      group.scale.setScalar(sizes[i]*(.78+.22*weight)*(1+energy*.06));
      for(const m of group.userData.materials)m.opacity=m.userData.baseOpacity*weight;
    }
    home.rotation.set(.45+Math.sin(phase*.45)*.3+pointer.y*.2,phase*.3+pointer.x*.25,Math.cos(phase*.3)*.18);
    rings[0].rotation.set(.9,.2+phase*.24,phase*.16);rings[1].rotation.set(1.4+phase*.18,.6,.8-phase*.2);
    satellites.forEach((satellite,i)=>{const angle=phase*(i%2?.43:-.35)+i*Math.PI*2/5,radius=1.9+(i%2)*.3;
      satellite.position.set(Math.cos(angle)*radius,Math.sin(angle)*.9,Math.sin(angle+i)*1.1);satellite.rotation.set(phase*.7+i,phase*.4,phase*.3);satellite.scale.setScalar(i===0?1.5:1);
    });
    studio.rotation.set(.1+pointer.y*.16,-.3+Math.sin(phase*.3)*.15+pointer.x*.2,Math.sin(phase*.4)*.045);
    bars.forEach((bar,i)=>{const wave=.3+Math.pow((Math.sin(phase*1.8+i*.57)+1)/2,1.2)*1.05+energy*.3;
      bar.scale.y=wave;bar.position.set((i-5)*.27,Math.sin(phase*.6+i*.3)*.09,Math.cos(i*.7+phase*.5)*.2);
      beads[i].position.set(bar.position.x,-1.04,bar.position.z);
    });
    vault.rotation.set(.38+pointer.y*.18,phase*.24+.35+pointer.x*.2,Math.sin(phase*.35)*.12);
    modules.forEach(({unit,x,y,z},i)=>{const expansion=1.12+Math.sin(phase*.9+i*.5)*.16;unit.position.set(x*expansion,y*expansion,z*expansion);unit.rotation.set(Math.sin(phase*.65+i)*.09,Math.cos(phase*.5+i)*.12,0);});
    backup.rotation.set(.46+pointer.y*.15,-.45+Math.sin(phase*.24)*.16+pointer.x*.2,-.1);
    plates.forEach((plate,i)=>{plate.position.set(Math.sin(phase*.7+i*.7)*.18,(i-1.5)*.43,Math.sin(phase*.5+i)*.08);plate.rotation.y=Math.sin(phase*.5+i*.6)*.09;});
    forge.rotation.set(.3+pointer.y*.15,-.55+Math.sin(phase*.35)*.3+pointer.x*.2,Math.sin(phase*.4)*.035);
    renderer.render(scene,camera);canvas.dataset.frame=String(++count);canvas.dataset.phase=phase.toFixed(3);
    canvas.dataset.visibleSculptures=groups.filter(group=>group.visible).map(group=>group.name).join(', ');
  }
  function resize(){
    const box=stage.getBoundingClientRect(),width=Math.max(1,box.width||400),height=Math.max(1,box.height||230);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=7.1/Math.min(1,camera.aspect);camera.updateProjectionMatrix();draw(0);
  }
  function theme(){
    const dark=document.documentElement.dataset.theme==='dark';
    for(const m of materials)m.color.setHex(dark?(0xffffff^m.userData.lightColor):m.userData.lightColor);
    canvas.dataset.theme=dark?'dark':'light';draw(0);
  }
  function tick(time){
    if(disposed||manuallyPaused||reduce.matches||document.hidden||!onscreen){request=0;last=0;return;}
    request=requestAnimationFrame(tick);if(last&&time-last<1000/30)return;
    const dt=last?Math.min(.08,(time-last)/1000):1/30;last=time;draw(dt);
  }
  function resume(){
    if(disposed)return;cancelAnimationFrame(request);request=0;last=0;
    if(manuallyPaused){state('paused');draw(0);}else if(reduce.matches){state('reduced-motion');draw(0);}
    else if(document.hidden)state('hidden');else if(!onscreen)state('offscreen');else{state('running');request=requestAnimationFrame(tick);}
  }
  function onMove(e){if(reduce.matches||manuallyPaused)return;const b=stage.getBoundingClientRect();aim.x=(e.clientX-b.left)/Math.max(1,b.width)*2-1;aim.y=(e.clientY-b.top)/Math.max(1,b.height)*2-1;}
  function onLeave(){aim={x:0,y:0};}
  const pageEvent=e=>setKineticPage(e.detail?.page),noteEvent=e=>{if(e.detail?.on)pulseKinetic(e.detail.velocity);};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const intersection=new IntersectionObserver(entries=>{onscreen=entries[0]?.isIntersecting??true;resume();});intersection.observe(stage);
  document.addEventListener('visibilitychange',resume);reduce.addEventListener('change',resume);stage.addEventListener('pointermove',onMove,{passive:true});stage.addEventListener('pointerleave',onLeave);window.addEventListener('fm1-page',pageEvent);window.addEventListener('fm1-note',noteEvent);
  window.addEventListener('fm1-theme',theme);
  instance={
    setPage(page){stage.dataset.motionPage=page;canvas.dataset.motionPage=page;stage.dataset.sculpture=sculptureNames[page];stage.setAttribute('aria-label',sculptureNames[page]);target=groups.map(()=>0);target[modes[page]??0]=1;if(manuallyPaused||reduce.matches){weights=[...target];draw(0);}},
    setPaused(value){manuallyPaused=Boolean(value);document.body.dataset.motionPaused=String(manuallyPaused);stage.classList.toggle('motion-is-paused',manuallyPaused||reduce.matches);resume();},
    pause(){this.setPaused(true);},resume(){this.setPaused(false);},
    pulse(value){if(!manuallyPaused&&!reduce.matches)energy=Math.min(1.5,energy+value);},
    dispose(){
      disposed=true;cancelAnimationFrame(request);resizeObserver.disconnect();intersection.disconnect();
      document.removeEventListener('visibilitychange',resume);reduce.removeEventListener('change',resume);stage.removeEventListener('pointermove',onMove);stage.removeEventListener('pointerleave',onLeave);window.removeEventListener('fm1-page',pageEvent);window.removeEventListener('fm1-note',noteEvent);window.removeEventListener('pagehide',instance.dispose);
      window.removeEventListener('fm1-theme',theme);
      for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();instance=null;
    }
  };
  window.addEventListener('pagehide',instance.dispose,{once:true});instance.setPage(currentPage);theme();resize();resume();return instance;
}
