import './style.css';
import * as THREE from 'three';

// ── Audio ─────────────────────────────────────────────────────────────────────
let _actx = null;
const aC = () => _actx || (_actx = new (window.AudioContext || window.webkitAudioContext)());
function beep(f, d, t = 'sine', v = 0.12) {
  try {
    const c = aC(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.01);
    o.start(); o.stop(c.currentTime + d + 0.05);
  } catch (_) {}
}
const SFX = {
  click:   () => beep(700, 0.05, 'square', 0.07),
  tick:    () => beep(360, 0.04, 'sine',   0.05),
  gear:    () => { beep(260, 0.06, 'square', 0.06); setTimeout(() => beep(390, 0.04, 'square', 0.04), 35); },
  good:    () => { beep(880, 0.1); setTimeout(() => beep(1100, 0.14), 80); },
  bad:     () => beep(110, 0.5, 'sawtooth', 0.18),
  success: () => { beep(660, 0.09); setTimeout(() => beep(880, 0.11), 100); setTimeout(() => beep(1320, 0.2), 210); },
  alert:   () => { beep(440, 0.07, 'square', 0.12); setTimeout(() => beep(440, 0.07, 'square', 0.12), 160); },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

/** Safely read/write localStorage — throws in private mode / storage full */
function lsGet(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch (_) {}
}

function gearPath(cx, cy, rO, rI, t = 8) {
  const pts = [];
  for (let i = 0; i < t * 2; i++) {
    const a = (i * Math.PI) / t - Math.PI / 2;
    const r = i % 2 === 0 ? rI : rO;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return 'M' + pts.join('L') + 'Z';
}

function bfs(grid, R, C) {
  if (!grid[0]?.[0]) return new Set();
  const vis = Array.from({length:R}, () => Array(C).fill(false));
  const par = Array.from({length:R}, () => Array(C).fill(null));
  const q = [[0,0]]; vis[0][0] = true;
  while (q.length) {
    const [r,c] = q.shift();
    if (r===R-1 && c===C-1) {
      const path = new Set(); let n = [r,c];
      while (n) { path.add(`${n[0]},${n[1]}`); n = par[n[0]][n[1]]; }
      return path;
    }
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<R&&nc>=0&&nc<C&&!vis[nr][nc]&&grid[nr][nc]) {
        vis[nr][nc]=true; par[nr][nc]=[r,c]; q.push([nr,nc]);
      }
    }
  }
  return new Set();
}

function drawOscillo(canvas, v1, v2, v3) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#04070f'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(0,200,120,0.07)'; ctx.lineWidth = 0.5;
  for(let x=0;x<=W;x+=W/8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=H/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.strokeStyle='rgba(0,255,136,0.2)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath();
  for(let x=0;x<W;x++){const t=(x/W)*Math.PI*5; const y=H/2+H*0.28*Math.sin(t+0.3)*0.75+H*0.08*Math.sin(t*2+1); x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle='#00ff88'; ctx.lineWidth=2; ctx.shadowColor='#00ff88'; ctx.shadowBlur=6;
  ctx.beginPath();
  for(let x=0;x<W;x++){const t=(x/W)*Math.PI*5; const y=H/2+H*0.3*(v1/100)*Math.sin(t)+H*0.1*(v2/100)*Math.sin(t*2+0.5)+H*0.06*(v3/100)*Math.cos(t*3-0.2); x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke(); ctx.shadowBlur=0;
}

function spawnParticles(parent, color='#e87820', n=12) {
  for(let i=0;i<n;i++){
    const p=document.createElement('span'); p.className='particle';
    const angle=Math.random()*Math.PI*2, dist=40+Math.random()*60;
    p.style.setProperty('--x', `${10+Math.random()*80}%`);
    p.style.setProperty('--y', `${20+Math.random()*60}%`);
    p.style.setProperty('--c', color);
    p.style.setProperty('--dx', `${(Math.cos(angle)*dist).toFixed(0)}px`);
    p.style.setProperty('--dy', `${(Math.sin(angle)*dist-30).toFixed(0)}px`);
    p.style.animationDelay = `${(Math.random()*0.2).toFixed(2)}s`;
    parent.appendChild(p); setTimeout(()=>p.remove(),1100);
  }
}

function floatMsg(parent, txt, color='#00ff88') {
  const el=document.createElement('div'); el.className='float-msg';
  el.style.color=color;
  // Sanitize: set as textContent, not innerHTML, to prevent XSS
  el.textContent=txt;
  parent.appendChild(el); setTimeout(()=>el.remove(),1200);
}

/**
 * Render constraint rows safely. Labels are set via textContent to prevent XSS.
 */
function refreshConstraints(level, ...args) {
  const panel=$('c-panel'); if(!panel) return;
  const cs=level.getConstraints(...args); if(!cs.length) return;
  panel.innerHTML = '';
  cs.forEach(c => {
    const ok = c.met();
    const row = document.createElement('div');
    row.className = `c-row ${ok ? 'c-ok' : 'c-fail'}`;

    const tick = document.createElement('span');
    tick.className = 'c-tick';
    tick.textContent = ok ? '✔' : '✘';

    const lbl = document.createElement('span');
    lbl.className = 'c-lbl';
    lbl.textContent = c.label; // textContent — no XSS risk

    row.appendChild(tick);
    row.appendChild(lbl);
    panel.appendChild(row);
  });
}

// ── Three.js Helpers ─────────────────────────────────────────────────────────
/**
 * Manages a localized Three.js scene within a DOM element.
 */
class ThreeManager {
  constructor(container, options = {}) {
    this.container = container;
    this.w = container.clientWidth;
    this.h = container.clientHeight;
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(options.fov || 45, this.w / this.h, 0.1, 1000);
    this.camera.position.z = options.z || 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = 'three-widget';
    container.appendChild(this.renderer.domElement);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambient);
    
    this.point = new THREE.PointLight(0xffffff, 0.8);
    this.point.position.set(5, 5, 5);
    this.scene.add(this.point);

    this.objects = {};
    this.onUpdate = null;
    this.raf = null;

    this.animate = this.animate.bind(this);
    this.animate();

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(container);
  }

  resize() {
    this.w = this.container.clientWidth;
    this.h = this.container.clientHeight;
    if (this.w === 0 || this.h === 0) return;
    this.renderer.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate);
    if (this.onUpdate) this.onUpdate();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this._ro.disconnect();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

const ThreeWidgetFactory = {
  createGearGeometry(rO, rI, thickness, teeth = 8) {
    const shape = new THREE.Shape();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i * Math.PI) / teeth - Math.PI / 2;
      const r = i % 2 === 0 ? rI : rO;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    
    // Add a hole in the center
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, rI * 0.2, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
  },
  createPipeGeometry(type, radius = 0.3) {
    if (type === 1) { // Straight H
      const geo = new THREE.CylinderGeometry(radius, radius, 4, 16);
      geo.rotation.z = Math.PI / 2;
      return geo;
    }
    if (type === 2) { // Straight V
      return new THREE.CylinderGeometry(radius, radius, 4, 16);
    }
    // For elbows, use a torus segment or a lathed path. 
    // Simplifying to a simple bent cylinder shape or just a sphere corner for now for brevity
    if (type >= 3 && type <= 6) {
      const geo = new THREE.TorusGeometry(2, radius, 16, 32, Math.PI / 2);
      // Rotation depends on type: 3=NE, 4=NW, 5=SW, 6=SE
      if (type === 3) geo.rotation.z = Math.PI; // NE
      if (type === 4) geo.rotation.z = Math.PI / 2; // NW
      if (type === 5) geo.rotation.z = 0; // SW
      if (type === 6) geo.rotation.z = -Math.PI / 2; // SE
      return geo;
    }
    return new THREE.SphereGeometry(radius * 1.5, 16, 16); // Fallback / Empty / Wall
  }
};

// ── Gear path constants ───────────────────────────────────────────────────────
const GP_HOME = gearPath(45,45,42,30,10);
const GP_LG   = gearPath(50,50,44,32,10);

// ── Laser trace ───────────────────────────────────────────────────────────────
/** Traces a laser beam through a mirror grid. Capped at R*C*4 steps to prevent infinite loops. */
function traceLaser(mirrors, R, C) {
  let r=0,c=-1,dr=0,dc=1;
  const path=[];
  const vis=new Set();
  const maxSteps = R * C * 4;
  let steps = 0;
  while(steps++ < maxSteps){
    r+=dr; c+=dc;
    if(r<0||r>=R||c<0||c>=C) return {path,exitR:r,exitC:c,exitDR:dr,exitDC:dc};
    const k=`${r},${c},${dr},${dc}`;
    if(vis.has(k)) return {path,exitR:-99,exitC:-99};
    vis.add(k); path.push(`${r},${c}`);
    const m=mirrors[r][c];
    if(m==='/')  {const t=dr;dr=-dc;dc=-t;}
    else if(m==='\\'){const t=dr;dr=dc;dc=t;}
  }
  return {path,exitR:-99,exitC:-99};
}

// ── Pipe trace ────────────────────────────────────────────────────────────────
// types: 0=empty,1=straight-H,2=straight-V,3=elbow-NE(└),4=elbow-NW(┘),5=elbow-SW(┐),6=elbow-SE(┌)
const PIPE_OPEN={0:[],1:['W','E'],2:['N','S'],3:['N','E'],4:['N','W'],5:['S','W'],6:['S','E']};
const PIPE_ICON=['·','─','│','└','┘','┐','┌'];
function tracePipe(grid,R,C,srcR,srcC,snkR,snkC){
  let r=srcR,c=srcC+1,from='W';
  const path=new Set();
  const maxSteps=R*C*2;
  let steps=0;
  while(steps++<maxSteps){
    if(r===snkR&&c===snkC) return {ok:true,path};
    if(r<0||r>=R||c<0||c>=C) return {ok:false,path};
    const k=`${r},${c}`; if(path.has(k)) return {ok:false,path};
    path.add(k);
    const open=PIPE_OPEN[grid[r][c]||0];
    if(!open.includes(from)) return {ok:false,path};
    const out=open.find(s=>s!==from);
    if(!out) return {ok:false,path};
    if(out==='E'){c++;from='W';} else if(out==='W'){c--;from='E';}
    else if(out==='S'){r++;from='N';} else if(out==='N'){r--;from='S';}
  }
  return {ok:false,path};
}

// ── App HTML ──────────────────────────────────────────────────────────────────
document.querySelector('#app').innerHTML = `
  <div id="start-screen" class="screen active">
    <div class="logo-gear" style="width:120px; height:120px; position:relative;">
      <div id="home-gear-canvas" class="three-container"></div>
    </div>
    <h1>Mech<span class="h1-accent">Logic</span></h1>
    <p class="subtitle">Fifteen industrial subsystems demand calibration.<br>Precision engineering and speed are both required.</p>
    <div class="start-stats">
      <div class="start-stat"><span class="ss-lbl">MODULES</span><span class="ss-val">15</span></div>
      <div class="start-stat"><span class="ss-lbl">LIVES</span><span class="ss-val" id="home-lives">♥ ♥ ♥</span></div>
      <div class="start-stat"><span class="ss-lbl">RECORD</span><span class="ss-val" id="best-score-home">--</span></div>
    </div>
    <button class="btn" id="start-btn">⚙ BOOT SYSTEM</button>
    <div class="sys-status"><span class="dot dot-green pulse"></span>ALL SYSTEMS NOMINAL</div>
  </div>

  <div id="game-screen" class="screen">
    <div class="game-header">
      <div class="lives-display" id="lives-display">♥ ♥ ♥</div>
      <div class="module-badge">MOD <span id="level-display">1</span>/<span id="level-total">15</span></div>
      <div class="timer-wrap">
        <svg viewBox="0 0 36 36" class="timer-ring">
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e87820" stroke-width="3"
            stroke-dasharray="87.96 87.96" stroke-linecap="round" id="trace-fill"
            style="transform:rotate(-90deg);transform-origin:18px 18px;transition:stroke-dasharray 0.85s ease,stroke 0.5s;"/>
        </svg>
        <span id="trace-seconds">40</span>
      </div>
    </div>
    <div class="machine-container" id="machine-container"></div>
  </div>

  <div id="game-over-screen" class="screen">
    <div class="go-gear">
      <svg width="70" height="70" viewBox="0 0 100 100" id="go-gear-svg">
        <path d="${GP_LG}" fill="#162028" stroke="#e87820" stroke-width="1.2"/>
        <circle cx="50" cy="50" r="13" fill="#0d1520" stroke="#2a3d52" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="5" id="go-dot" fill="#e87820"/>
      </svg>
    </div>
    <h1 id="game-over-title">SYSTEMS ONLINE</h1>
    <p class="go-sub" id="go-sub">All modules calibrated. Factory operational.</p>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-label">MODULES</div><div class="stat-value" id="stat-nodes">--</div></div>
      <div class="stat-box"><div class="stat-label">ERRORS</div><div class="stat-value penalty-val" id="stat-penalties">--</div></div>
      <div class="stat-box"><div class="stat-label">TIME</div><div class="stat-value" id="stat-time">--</div></div>
      <div class="stat-box"><div class="stat-label">RECORD</div><div class="stat-value best-val" id="stat-best">--</div></div>
    </div>
    <div class="record-badge" id="new-record-msg">⚙ FACTORY RECORD ⚙</div>
    <div class="go-buttons">
      <button class="btn btn-alt" id="restart-btn">⟳ RESTART</button>
      <button class="btn" id="menu-btn">⌂ CONTROL ROOM</button>
    </div>
  </div>`;

// ── LEVELS ────────────────────────────────────────────────────────────────────
const levels = [

  // ── MODULE 1: PRESSURE MANIFOLD ─────────────────────────────────────────────
  {
    title: 'MODULE 01 — PRESSURE MANIFOLD', timer: 35,
    flavor: 'Regulate three pressure valves to match factory specs. All zones must stabilize simultaneously.',
    _threes: [], _needles: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._needles = [];
    },
    setup(container) {
      this.cleanup();
      container.innerHTML = `
        <div class="machine-title">⊙ PRESSURE MANIFOLD</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="gauge-row">
          ${['A','B','C'].map(id => `
          <div class="gauge-3d-wrap"><div class="gauge-3d" id="gw-${id}">
            <div id="gauge-canvas-${id}" class="three-container" style="width:90px; height:90px;"></div>
            <div class="gauge-lbl">VALVE ${id}</div>
            <div class="gauge-val" id="gv-${id}">0 PSI</div>
          </div></div>`).join('')}
        </div>
        <div class="slider-trio">
          ${['A','B','C'].map(id=>`<div class="slider-item">
            <span class="sl-lbl">▼ ${id}</span>
            <input type="range" id="psl-${id}" min="0" max="100" value="0" class="machine-slider">
            <span class="sl-val" id="sv-${id}">0</span>
          </div>`).join('')}
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⊙ ENGAGE MANIFOLD</button>`;
      
      const faceGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
      const faceMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.5, roughness: 0.5 });
      const needleGeo = new THREE.BoxGeometry(0.05, 1.8, 0.05);
      const needleMat = new THREE.MeshStandardMaterial({ color: 0xe87820, emissive: 0xe87820, emissiveIntensity: 0.5 });
      const rimGeo = new THREE.TorusGeometry(2, 0.05, 16, 100);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a3d52 });

      ['A','B','C'].forEach(id => {
        const tm = new ThreeManager($(`gauge-canvas-${id}`), { z: 5 });
        this._threes.push(tm);
        
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.rotation.x = Math.PI / 2;
        tm.scene.add(face);
        
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        tm.scene.add(rim);

        const group = new THREE.Group();
        const needle = new THREE.Mesh(needleGeo, needleMat);
        needle.position.y = 0.8;
        group.add(needle);
        tm.scene.add(group);
        this._needles.push(group);

        // Add tick marks
        for(let i=0; i<=10; i++) {
          const ang = (-140 + i*28) * (Math.PI/180);
          const tGeo = new THREE.BoxGeometry(0.03, i%5===0 ? 0.3 : 0.15, 0.02);
          const tMat = new THREE.MeshStandardMaterial({ color: i%5===0 ? 0x4a6a88 : 0x263040 });
          const tick = new THREE.Mesh(tGeo, tMat);
          tick.position.x = 1.7 * Math.sin(ang);
          tick.position.y = 1.7 * Math.cos(ang);
          tick.rotation.z = -ang;
          tm.scene.add(tick);
        }
      });

      const upd = () => {
        const vA=+$('psl-A').value;
        ['A','B','C'].forEach((id, i) => {
          const v = +$(`psl-${id}`).value;
          const ang = (-140 + v * 2.8) * (Math.PI/180);
          if(this._needles[i]) this._needles[i].rotation.z = -ang;
          
          const gv=$(`gv-${id}`); if(gv) gv.textContent=v+' PSI';
          const sv=$(`sv-${id}`); if(sv) sv.textContent=v;
          const gw=$(`gw-${id}`); if(gw) {
            let ok=false;
            if(id==='A') ok=v>=58&&v<=68&&v%2===0;
            else if(id==='B') ok=v>=22&&v<=36&&v<vA/2;
            else ok=v>=vA+8&&v<=vA+15;
            gw.className='gauge-3d '+(ok?'gauge-ok':v===0?'':'gauge-danger');
          }
        });
        refreshConstraints(this); SFX.tick();
      };
      ['A','B','C'].forEach(id => $(`psl-${id}`).oninput=upd);
      refreshConstraints(this);
    },
    getConstraints() {
      const v = id => +$(`psl-${id}`)?.value||0;
      return [
        {label:'VALVE A: hold 58–68 PSI (tight zone)',            met:()=>v('A')>=58&&v('A')<=68},
        {label:'VALVE B: hold 22–36 PSI',                        met:()=>v('B')>=22&&v('B')<=36},
        {label:'VALVE C must be exactly VALVE A + 8 to +15 PSI', met:()=>v('C')>=v('A')+8&&v('C')<=v('A')+15},
        {label:'VALVE B must be less than half of VALVE A',      met:()=>v('B')<v('A')/2},
        {label:'Total system pressure: 155–185 PSI',             met:()=>v('A')+v('B')+v('C')>=155&&v('A')+v('B')+v('C')<=185},
        {label:'VALVE A must be a multiple of 2',                met:()=>v('A')%2===0},
      ];
    },
    validate() { return this.getConstraints().every(c=>c.met()); }
  },

  // ── MODULE 2: CIRCUIT ROUTER ─────────────────────────────────────────────────
  {
    title: 'MODULE 02 — CIRCUIT ROUTER', timer: 35,
    flavor: 'Route power from SOURCE [⚡] to SINK [⊗]. Form an exact path — node [1,3] is a BURNED NODE and must stay off.',
    _grid: null, _R:4, _C:4,
    _threes: [], _nodes: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._nodes = [];
    },
    setup(container) {
      const R=this._R, C=this._C;
      this._grid=Array.from({length:R},()=>Array(C).fill(false));
      this._grid[0][0]=true; this._grid[R-1][C-1]=true;
      this.cleanup();
      container.innerHTML=`
        <div class="machine-title">⟨ CIRCUIT ROUTER ⟩</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="circuit-wrapper">
          <div class="circuit-grid" id="cgrid">
            ${Array.from({length:R},(_,r)=>Array.from({length:C},(_,c)=>`
              <button class="cnode" id="cn-${r}-${c}" data-r="${r}" data-c="${c}">
                <div id="node-canvas-${r}-${c}" class="three-container"></div>
              </button>`).join('')).join('')}
          </div>
          <div class="circuit-legend">
            <span><span class="cl-dot cl-src"></span>SOURCE</span>
            <span><span class="cl-dot cl-snk"></span>SINK</span>
            <span><span class="cl-dot cl-pth"></span>PATH</span>
            <span><span class="cl-dot cl-off"></span>OFF</span>
          </div>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⟨ ROUTE POWER ⟩</button>`;
      
      const nodeGeo = new THREE.BoxGeometry(3, 3, 1);
      const activeMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });
      const pathMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8 });
      const offMat = new THREE.MeshStandardMaterial({ color: 0x1a2535 });
      const srcMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.6 });
      const snkMat = new THREE.MeshStandardMaterial({ color: 0xe87820, emissive: 0xe87820, emissiveIntensity: 0.6 });
      const burnedMat = new THREE.MeshStandardMaterial({ color: 0xff2840, emissive: 0xff2840, emissiveIntensity: 0.4 });

      for(let r=0; r<R; r++) {
        for(let c=0; c<C; c++) {
          const tm = new ThreeManager($(`node-canvas-${r}-${c}`), { z: 6 });
          this._threes.push(tm);
          
          const mesh = new THREE.Mesh(nodeGeo, offMat.clone());
          tm.scene.add(mesh);
          this._nodes.push(mesh);
        }
      }

      const upd = () => {
        const path=bfs(this._grid,R,C), total=this._grid.flat().filter(Boolean).length;
        for(let r=0;r<R;r++) for(let c=0;c<C;c++){
          const cell=$(`cn-${r}-${c}`);
          const isSrc=r===0&&c===0, isSnk=r===R-1&&c===C-1, on=this._grid[r][c], onP=path.has(`${r},${c}`)&&on;
          const isBurned=r===1&&c===3;
          
          const mesh = this._nodes[r * C + c];
          if(mesh) {
            if(isSrc) mesh.material.color.setHex(0x00f0ff);
            else if(isSnk) mesh.material.color.setHex(0xe87820);
            else if(isBurned) mesh.material.color.setHex(0xff2840);
            else if(onP) mesh.material.color.setHex(0x00ff88);
            else if(on) mesh.material.color.setHex(0x00b8e0);
            else mesh.material.color.setHex(0x1a2535);
            
            mesh.material.emissiveIntensity = (on || isSrc || isSnk || isBurned) ? (onP ? 0.8 : 0.4) : 0;
            mesh.scale.setScalar(on || isSrc || isSnk || isBurned ? 1.1 : 1.0);
          }

          cell.className='cnode'+(on?' cn-on':'')+(onP?' cn-path':'')+(isSrc?' cn-src':'')+(isSnk?' cn-snk':'')+(isBurned?' cn-burned':'');
          // Text content kept for accessibility/layering
          if(isSrc) { cell.dataset.txt='⚡'; }
          else if(isSnk) { cell.dataset.txt='⊗'; }
          else if(isBurned) { cell.dataset.txt='✖'; }
          else { cell.dataset.txt=''; }
        }
        refreshConstraints(this,{path,total});
      };
      $('cgrid').addEventListener('click',e=>{
        const cell=e.target.closest('.cnode'); if(!cell) return;
        const r=+cell.dataset.r, c=+cell.dataset.c;
        if((r===0&&c===0)||(r===R-1&&c===C-1)||(r===1&&c===3)) return;
        this._grid[r][c]=!this._grid[r][c]; SFX.click(); upd();
      });
      upd();
    },
    getConstraints({path=new Set(),total=0}={}) {
      const g=this._grid, R=this._R, C=this._C;
      const has2x2=()=>{if(!g) return false; for(let r=0;r<R-1;r++) for(let c=0;c<C-1;c++) if(g[r][c]&&g[r+1][c]&&g[r][c+1]&&g[r+1][c+1]) return true; return false;};
      const centerOk=()=>!g?false:g[1][1]||g[1][2]||g[2][1]||g[2][2];
      const burnedOff=()=>!g?true:!g[1][3];
      const col0has2=()=>!g?false:[0,1,2,3].filter(r=>g[r][0]).length===2;
      return [
        {label:'Power path SOURCE→SINK must be connected',              met:()=>path.size>=2},
        {label:'Exactly 8 capacitor nodes must be active',             met:()=>total===8},
        {label:'No 2×2 short-circuit block allowed',                   met:()=>!has2x2()},
        {label:'At least one center-grid node (rows 1-2, cols 1-2) ON',met:()=>centerOk()},
        {label:'BURNED NODE [row 1, col 3] must stay OFF',             met:()=>burnedOff()},
        {label:'Column 0 must have exactly 2 active nodes',            met:()=>col0has2()},
      ];
    },
    validate() {
      const path=bfs(this._grid,this._R,this._C), total=this._grid.flat().filter(Boolean).length;
      return this.getConstraints({path,total}).every(c=>c.met());
    }
  },

  // ── MODULE 3: GEAR LOCK ──────────────────────────────────────────────────────
  {
    title: 'MODULE 03 — GEAR LOCK', timer: 38,
    flavor: 'Rotate interlocked gear pairs to target positions. A↔B and C↔D are coupled — and gears start mid-rotation this time!',
    _pos: [5,3,6,2], _tgt: [1,7,4,4],
    _threes: [], _gears: [],
    rotate(i, dir=1) {
      this._pos[i]=(this._pos[i]+dir+8)%8;
      if(i===0) this._pos[1]=(this._pos[1]-dir+8)%8;
      else if(i===1) this._pos[0]=(this._pos[0]-dir+8)%8;
      else if(i===2) this._pos[3]=(this._pos[3]-dir+8)%8;
      else if(i===3) this._pos[2]=(this._pos[2]-dir+8)%8;
    },
    updateVisuals() {
      this._pos.forEach((p,i)=>{
        const ang=p*45 * (Math.PI/180);
        if(this._gears[i]) {
          // Smooth rotation target
          this._gears[i].rotation.z = -ang; 
        }
        const pn=$(`pn-${i}`); if(pn){pn.textContent=p; pn.className='pnum'+(p===this._tgt[i]?' pmatch':'');}
        const gu=$(`gu-${i}`); if(gu) gu.classList.toggle('gear-matched',p===this._tgt[i]);
      });
      refreshConstraints(this);
    },
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._gears = [];
    },
    setup(container) {
      this._pos=[5,3,6,2];
      this.cleanup();
      const t=this._tgt;
      container.innerHTML=`
        <div class="machine-title">⚙ GEAR LOCK</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="gear-grid">
          ${['A','B','C','D'].map((name,i)=>`
          <div class="gear-unit" id="gu-${i}">
            <div class="gear-label-top">${name} <span class="tgt-badge">→${t[i]}</span></div>
            <div class="gear-3d-outer" style="width:100px; height:100px;">
              <div id="gear-canvas-${i}" class="three-container"></div>
            </div>
            <div class="gear-pos">POS: <span class="pnum" id="pn-${i}">0</span> / TGT: <strong>${t[i]}</strong></div>
            <div class="gear-btns">
              <button class="gear-btn" data-i="${i}" data-d="-1">↺ CCW</button>
              <button class="gear-btn" data-i="${i}" data-d="1">↻ CW</button>
            </div>
          </div>`).join('')}
        </div>
        <div class="pair-note">[ A↔B COUPLED ] &nbsp;&nbsp; [ C↔D COUPLED ]</div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⚙ LOCK GEARS</button>`;

      const gearGeo = ThreeWidgetFactory.createGearGeometry(1.8, 1.3, 0.4, 10);
      const gearMat = new THREE.MeshStandardMaterial({ color: 0x2a4060, metalness: 0.8, roughness: 0.2 });
      const indicatorGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
      const indicatorMat = new THREE.MeshStandardMaterial({ color: 0xe87820, emissive: 0xe87820, emissiveIntensity: 0.5 });
      const targetMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3, wireframe: true });

      for(let i=0; i<4; i++) {
        const tm = new ThreeManager($(`gear-canvas-${i}`), { z: 4.5 });
        this._threes.push(tm);
        
        const group = new THREE.Group();
        
        const gear = new THREE.Mesh(gearGeo, gearMat);
        gear.rotation.x = Math.PI / 2; // Lie flat
        group.add(gear);
        
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.y = 1.4;
        indicator.position.z = 0.3;
        group.add(indicator);
        
        tm.scene.add(group);
        this._gears.push(group);

        // Target ghost
        const targetGroup = new THREE.Group();
        const targetGear = new THREE.Mesh(gearGeo, targetMat);
        targetGear.rotation.x = Math.PI / 2;
        targetGroup.add(targetGear);
        targetGroup.rotation.z = -this._tgt[i] * 45 * (Math.PI/180);
        tm.scene.add(targetGroup);

        tm.onUpdate = () => {
          // Subtle wobble or extra effects can go here
        };
      }

      container.addEventListener('click',e=>{
        const btn=e.target.closest('.gear-btn'); if(!btn) return;
        this.rotate(+btn.dataset.i, +btn.dataset.d); SFX.gear(); this.updateVisuals();
      });
      this.updateVisuals();
    },
    getConstraints() {
      const p=this._pos, t=this._tgt;
      return [
        {label:`GEAR-A at target position (→${t[0]})`, met:()=>p[0]===t[0]},
        {label:`GEAR-B at target position (→${t[1]})`, met:()=>p[1]===t[1]},
        {label:`GEAR-C at target position (→${t[2]})`, met:()=>p[2]===t[2]},
        {label:`GEAR-D at target position (→${t[3]})`, met:()=>p[3]===t[3]},
      ];
    },
    validate() { return this.getConstraints().every(c=>c.met()); }
  },

  // ── MODULE 4: THERMAL CORE ───────────────────────────────────────────────────
  {
    title: 'MODULE 04 — THERMAL CORE', timer: 38,
    flavor: 'Regulate three heat vents to achieve stable core temperature. Monitor the oscilloscope for waveform alignment.',
    _threes: [], _bars: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._bars = [];
    },
    setup(container) {
      this.cleanup();
      container.innerHTML=`
        <div class="machine-title">🌡 THERMAL CORE</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="oscillo-wrap">
          <div class="oscillo-label">◈ THERMAL SIGNATURE — LIVE FEED &nbsp;<span class="tgt-legend">- - TARGET WAVEFORM</span></div>
          <canvas id="oscillo" width="400" height="88" class="oscillo-canvas"></canvas>
        </div>
        <div class="vent-sliders">
          ${['1','2','3'].map(n=>`<div class="vent-item">
            <div class="vent-hdr"><span class="vent-name">VENT-${n}</span><span class="vent-val" id="vv-${n}">0°C</span></div>
            <input type="range" id="vsl-${n}" min="0" max="100" value="0" class="machine-slider vent-sl-${n}">
            <div class="vent-bar-wrap" style="height:24px; position:relative;">
              <div id="vent-canvas-${n}" class="three-container"></div>
            </div>
          </div>`).join('')}
        </div>
        <div class="core-temp-display">CORE TEMP: <span id="core-temp">0°C</span></div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">🌡 STABILIZE CORE</button>`;
      
      const barGeo = new THREE.BoxGeometry(10, 0.8, 0.8);
      const colors = [0xe87820, 0x00b8e0, 0xff2840];

      ['1','2','3'].forEach((n, i) => {
        const tm = new ThreeManager($(`vent-canvas-${n}`), { z: 6, fov: 30 });
        this._threes.push(tm);
        
        const group = new THREE.Group();
        const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ 
          color: colors[i], 
          emissive: colors[i], 
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.9
        }));
        bar.position.x = -5; // Start from left
        group.add(bar);
        group.position.x = -5;
        tm.scene.add(group);
        this._bars.push(bar);
      });

      const upd = () => {
        const v1=+$('vsl-1').value, v2=+$('vsl-2').value, v3=+$('vsl-3').value;
        ['1','2','3'].forEach((n, i)=>{
          const v=+$(`vsl-${n}`).value; 
          $(`vv-${n}`).textContent=v+'°C';
          if(this._bars[i]) {
            this._bars[i].scale.x = Math.max(0.001, v / 100);
            this._bars[i].position.x = (v / 100) * 5;
          }
        });
        const core=Math.floor(v1*0.5+v2*0.3+v3*0.2);
        const ct=$('core-temp'); if(ct){ct.textContent=core+'°C'; ct.style.color=core>=55&&core<=60?'#00ff88':core>60?'#ff2840':'#e87820';}
        drawOscillo($('oscillo'),v1,v2,v3); refreshConstraints(this); SFX.tick();
      };
      ['1','2','3'].forEach(n=>$(`vsl-${n}`).oninput=upd);
      drawOscillo($('oscillo'),0,0,0); refreshConstraints(this);
    },
    getConstraints() {
      const v=n=>+$(`vsl-${n}`)?.value||0;
      const core=()=>Math.floor(v('1')*0.5+v('2')*0.3+v('3')*0.2);
      return [
        {label:'VENT-1 temperature: 42–56°C (tighter range)',    met:()=>v('1')>=42&&v('1')<=56},
        {label:'VENT-2 must be 18–28°C hotter than VENT-1',     met:()=>v('2')>=v('1')+18&&v('2')<=v('1')+28},
        {label:'VENT-3: 72–79°C',                               met:()=>v('3')>=72&&v('3')<=79},
        {label:'Core temperature must be exactly 55–60°C',      met:()=>core()>=55&&core()<=60},
        {label:'Total heat output must not exceed 200°C',       met:()=>v('1')+v('2')+v('3')<=200},
        {label:'VENT-1 must be an even number',                 met:()=>v('1')%2===0},
      ];
    },
    validate() { return this.getConstraints().every(c=>c.met()); }
  },

  // ── MODULE 5: REACTOR MELTDOWN (Boss) ────────────────────────────────────────
  {
    title: 'MODULE 05 — REACTOR MELTDOWN', timer: 60,
    flavor: 'CRITICAL: All reactor subsystems must be synchronized. Stability drops fast. Sequence is 6 steps. No mercy.',
    _stab:100, _stabTimer:null, _step:0, _SEQ:['R','G','B','R','G','R'], _seqDone:false, _cooldown:false,
    _three: null, _core: null,
    cleanup() { 
      clearInterval(this._stabTimer); this._stabTimer=null; 
      if(this._three) this._three.dispose();
      this._three = null;
      this._core = null;
    },
    drainLoop() {
      if(this._stabTimer) clearInterval(this._stabTimer);
      this._stabTimer=setInterval(()=>{
        this._stab=Math.max(0,this._stab-2);
        const bar=$('stab-bar'), pct=$('stab-pct');
        if(bar){bar.style.width=this._stab+'%'; bar.style.background=this._stab>50?'#00ff88':this._stab>30?'#e87820':'#ff2840';}
        if(pct){pct.textContent=this._stab+'%'; pct.style.color=this._stab>50?'#00ff88':this._stab>30?'#e87820':'#ff2840';}
        if(this._stab<=40) SFX.alert();
        
        if(this._core) {
          const s = this._stab / 100;
          this._core.scale.setScalar(0.8 + s * 0.4);
          this._core.material.emissiveIntensity = 0.2 + (1 - s) * 0.8;
          this._core.material.color.setHex(this._stab > 40 ? 0x00ff88 : 0xff2840);
          this._core.material.emissive.setHex(this._stab > 40 ? 0x00ff88 : 0xff2840);
        }

        refreshConstraints(this);
        if(this._stab<=0){ clearInterval(this._stabTimer); this._stabTimer=null; document.body.dispatchEvent(new CustomEvent('reactorFail')); }
      },600);
    },
    setup(container) {
      this._stab=100; this._step=0; this._seqDone=false; this._cooldown=false;
      this.cleanup();
      const SEQ=this._SEQ;
      container.innerHTML=`
        <div class="machine-title">⚠ REACTOR MELTDOWN</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="reactor-header-3d" style="width:100%; height:120px; position:relative; margin-bottom:10px;">
          <div id="reactor-canvas" class="three-container"></div>
        </div>
        <div class="stab-section">
          <div class="stab-hdr"><span>◈ CORE STABILITY</span><span id="stab-pct" style="color:#00ff88">100%</span></div>
          <div class="stab-track"><div class="stab-bar" id="stab-bar" style="width:100%;background:#00ff88;"></div></div>
          <button class="stab-btn" id="stab-btn">⟳ STABILIZE (+10%)</button>
        </div>
        <div class="reactor-grid">
          <div class="reactor-panel">
            <div class="rp-title">⊙ RELAYS</div>
            <div class="switch-panel">
              ${['R1','R2'].map(r=>`<div class="grid-row">
                <span class="grid-label">${r}</span>
                <label class="switch"><input type="checkbox" id="rx-${r}"><span class="slider"></span></label>
                <span class="grid-status" id="rst-${r}">OFF</span>
              </div>`).join('')}
            </div>
          </div>
          <div class="reactor-panel">
            <div class="rp-title">⚡ POWER CORE</div>
            <div class="range-label">LEVEL: <span id="rxv" class="val-badge">0</span>%</div>
            <input type="range" id="rx-pwr" min="0" max="100" value="0" class="machine-slider">
          </div>
          <div class="reactor-panel" style="grid-column:span 2;">
            <div class="rp-title">⟨ OVERRIDE SEQUENCE ⟩ — R · G · B · R · G · R</div>
            <div class="seq-progress" id="seq-prog">
              ${SEQ.map((_,i)=>`<div class="seq-dot" id="sd-${i}"></div>`).join('')}
            </div>
            <div class="simon-board">
              <button class="simon-btn simon-red"   data-col="R">■ RED</button>
              <button class="simon-btn simon-blue"  data-col="B">■ BLUE</button>
              <button class="simon-btn simon-green" data-col="G">■ GREEN</button>
              <button class="simon-btn simon-yellow" data-col="Y">■ YELLOW</button>
            </div>
            <div class="seq-status" id="seq-stat">STEP 1 / ${SEQ.length}</div>
          </div>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⚠ INITIATE REACTOR OVERRIDE</button>`;
      
      this._three = new ThreeManager($('reactor-canvas'), { z: 4 });
      const coreGeo = new THREE.IcosahedronGeometry(1, 2);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5, wireframe: true });
      this._core = new THREE.Mesh(coreGeo, coreMat);
      this._three.scene.add(this._core);

      const ringGeo = new THREE.TorusGeometry(1.5, 0.05, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x3a5070 });
      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      const ring2 = new THREE.Mesh(ringGeo, ringMat);
      ring2.rotation.x = Math.PI / 2;
      this._three.scene.add(ring1);
      this._three.scene.add(ring2);

      this._three.onUpdate = () => {
        if(this._core) {
          this._core.rotation.y += 0.01;
          this._core.rotation.z += 0.005;
        }
        ring1.rotation.y += 0.02;
        ring2.rotation.x += 0.015;
      };

      ['R1','R2'].forEach(r=>{
        $(`rx-${r}`).oninput=()=>{const on=$(`rx-${r}`).checked; const st=$(`rst-${r}`); if(st){st.textContent=on?'ON':'OFF'; st.className='grid-status'+(on?' on':'');} refreshConstraints(this); SFX.click();};
      });
      $('rx-pwr').oninput=()=>{$('rxv').textContent=$('rx-pwr').value; refreshConstraints(this); SFX.tick();};
      $('stab-btn').onclick=()=>{
        if(this._cooldown) return;
        this._stab=Math.min(100,this._stab+10);
        const bar=$('stab-bar'),pct=$('stab-pct');
        if(bar){bar.style.width=this._stab+'%';} if(pct){pct.textContent=this._stab+'%';}
        this._cooldown=true; const btn=$('stab-btn'); if(btn){btn.disabled=true;btn.textContent='⟳ COOLING DOWN...';}
        setTimeout(()=>{this._cooldown=false;const b=$('stab-btn');if(b){b.disabled=false;b.textContent='⟳ STABILIZE (+10%)';}},4000);
        refreshConstraints(this); SFX.good();
      };
      container.querySelectorAll('.simon-btn').forEach(btn=>{
        btn.onclick=()=>{
          if(this._seqDone) return;
          const col=btn.dataset.col, dot=$(`sd-${this._step}`);
          if(col===SEQ[this._step]){
            if(dot) dot.classList.add('correct');
            this._step++;
            if(this._step===SEQ.length){this._seqDone=true;const ss=$('seq-stat');if(ss)ss.textContent='SEQUENCE VALIDATED ✔'; SFX.good();}
            else{const ss=$('seq-stat');if(ss)ss.textContent=`STEP ${this._step+1} / ${SEQ.length}`; SFX.click();}
          } else {
            if(dot){dot.classList.add('wrong'); setTimeout(()=>dot.classList.remove('wrong'),500);}
            this._step=0; this._stab=Math.max(0,this._stab-15);
            const bar=$('stab-bar');if(bar)bar.style.width=this._stab+'%';
            SEQ.forEach((_,i)=>{const d=$(`sd-${i}`);if(d)d.className='seq-dot';});
            const ss=$('seq-stat');if(ss)ss.textContent='SEQUENCE RESET — STEP 1 / '+SEQ.length;
            SFX.bad();
          }
          refreshConstraints(this);
        };
      });
      this.drainLoop(); refreshConstraints(this);
    },
    getConstraints() {
      const r1=()=>$('rx-R1')?.checked, r2=()=>$('rx-R2')?.checked, pwr=()=>+$('rx-pwr')?.value||0;
      return [
        {label:'RELAY R1 must be ACTIVE',                    met:()=>!!r1()},
        {label:'RELAY R2 must be INACTIVE',                  met:()=>!r2()},
        {label:'Power core: 62–72% (narrow window)',         met:()=>pwr()>=62&&pwr()<=72},
        {label:'Power core must be an ODD number',           met:()=>pwr()%2!==0},
        {label:'Override sequence must be completed (6 steps)', met:()=>this._seqDone},
        {label:'Core stability must remain above 30%',       met:()=>this._stab>30},
      ];
    },
    validate() { return this.getConstraints().every(c=>c.met()); }
  },

  // ── MODULE 06: BINARY MATRIX ─────────────────────────────────────────────────
  {
    title:'MODULE 06 — BINARY MATRIX', timer:35,
    flavor:'Set the bit grid so every row and column sum matches its target. Satisfy all 8 sum constraints simultaneously.',
    _ROW_TGT:[2,1,3,2], _COL_TGT:[2,2,2,2], _bits:null,
    _threes: [], _nodes: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._nodes = [];
    },
    setup(c){
      this._bits=Array.from({length:4},()=>Array(4).fill(0));
      this.cleanup();
      const rt=this._ROW_TGT,ct=this._COL_TGT;
      c.innerHTML=`
        <div class="machine-title">◫ BINARY MATRIX</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="bm-wrap">
          <div class="bm-grid" id="bmg">
            ${Array.from({length:4},(_,r)=>Array.from({length:4},(_,col)=>`
              <button class="bm-cell" id="bmc-${r}-${col}" data-r="${r}" data-c="${col}">
                <div id="bit-canvas-${r}-${col}" class="three-container"></div>
              </button>`).join('')).join('')}
          </div>
          <div class="bm-rcol">${rt.map(v=>`<div class="bm-tgt">${v}</div>`).join('')}</div>
          <div class="bm-crow">${ct.map(v=>`<div class="bm-tgt">${v}</div>`).join('')}<div class="bm-tgt">·</div></div>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">◫ COMMIT MATRIX</button>`;
      
      const bitGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32);
      const onMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });
      const offMat = new THREE.MeshStandardMaterial({ color: 0x1a2535 });

      for(let r=0; r<4; r++) {
        for(let col=0; col<4; col++) {
          const tm = new ThreeManager($(`bit-canvas-${r}-${col}`), { z: 5 });
          this._threes.push(tm);
          
          const mesh = new THREE.Mesh(bitGeo, offMat.clone());
          mesh.rotation.x = Math.PI / 2;
          tm.scene.add(mesh);
          this._nodes.push(mesh);
        }
      }

      const upd=()=>{
        const b=this._bits;
        for(let r=0;r<4;r++)for(let col=0;col<4;col++){
          const on = b[r][col] === 1;
          const mesh = this._nodes[r * 4 + col];
          if(mesh) {
            mesh.material.color.setHex(on ? 0x00ff88 : 0x1a2535);
            mesh.material.emissiveIntensity = on ? 0.6 : 0;
            mesh.scale.setScalar(on ? 1.2 : 1.0);
          }
          const el=$(`bmc-${r}-${col}`);
          el.className='bm-cell'+(on?' bm-on':'');
        }
        refreshConstraints(this); SFX.tick();
      };
      $('bmg').addEventListener('click',e=>{
        const cell=e.target.closest('.bm-cell'); if(!cell) return;
        const r=+cell.dataset.r,col=+cell.dataset.c;
        this._bits[r][col]=this._bits[r][col]?0:1; SFX.click(); upd();
      });
      upd();
    },
    getConstraints(){
      const b=this._bits; if(!b) return [];
      const rs=this._ROW_TGT,cs=this._COL_TGT;
      const rSum=r=>b[r].reduce((s,v)=>s+v,0);
      const cSum=col=>b.reduce((s,row)=>s+row[col],0);
      return [
        ...rs.map((t,r)=>({label:`Row ${r} sum must equal ${t}`,met:()=>rSum(r)===t})),
        ...cs.map((t,col)=>({label:`Col ${col} sum must equal ${t}`,met:()=>cSum(col)===t})),
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 07: LOGIC GATES ───────────────────────────────────────────────────
  {
    title:'MODULE 07 — LOGIC ARRAY', timer:35,
    flavor:'Toggle input switches to satisfy the gate chain output requirements. AND, OR, XOR, NOT all active.',
    _threes: [], _gates: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._gates = [];
    },
    setup(c){
      this.cleanup();
      c.innerHTML=`
        <div class="machine-title">⋈ LOGIC ARRAY</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="logic-3d-area" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%;">
          <div class="switch-panel">
            ${['A','B','C','D'].map(id=>`<div class="grid-row" style="padding:6px 10px;">
              <span class="grid-label">IN-${id}</span>
              <label class="switch"><input type="checkbox" id="lg-${id}"><span class="slider"></span></label>
              <span class="grid-status" id="lgst-${id}" style="font-size:0.5rem;">OFF</span>
            </div>`).join('')}
          </div>
          <div class="gates-3d-grid" style="display:grid; grid-template-rows:repeat(5,1fr); gap:4px;">
            ${[1,2,3,4,5].map(i => `<div id="gate-canvas-${i}" class="three-container" style="height:32px;"></div>`).join('')}
          </div>
        </div>
        <div class="gate-display" id="gdisp"></div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⋈ EXECUTE GATES</button>`;
      
      const gateGeo = new THREE.BoxGeometry(10, 0.8, 0.8);
      const gateMat = new THREE.MeshStandardMaterial({ color: 0x1a2535 });

      for(let i=1; i<=5; i++) {
        const tm = new ThreeManager($(`gate-canvas-${i}`), { z: 6, fov: 30 });
        this._threes.push(tm);
        
        const mesh = new THREE.Mesh(gateGeo, gateMat.clone());
        tm.scene.add(mesh);
        this._gates.push(mesh);
      }

      const calc=()=>{
        const v=id=>$(`lg-${id}`)?.checked||false;
        ['A','B','C','D'].forEach(id=>{const s=$(`lgst-${id}`);if(s){s.textContent=v(id)?'ON':'OFF';s.className='grid-status'+(v(id)?' on':'');}});
        const g1=v('A')&&v('B'), g2=v('B')!==v('C'), g3=g1||v('D'), g4=g2&&!v('D'), out=g3!==g4;
        const results = [g1, g2, g3, g4, out];
        
        results.forEach((res, i) => {
          if(this._gates[i]) {
            this._gates[i].material.color.setHex(res ? 0x00ff88 : 0x1a2535);
            this._gates[i].material.emissive.setHex(res ? 0x00ff88 : 0x000000);
            this._gates[i].material.emissiveIntensity = res ? 0.6 : 0;
            this._gates[i].scale.y = res ? 1.5 : 1.0;
          }
        });

        const gd=$('gdisp');
        if(gd) gd.innerHTML=`
          <div class="gate-row"><span class="gr-lbl">G1 = A AND B</span><span class="gr-val ${g1?'gon':'goff'}">${g1?'HIGH':'LOW'}</span></div>
          <div class="gate-row"><span class="gr-lbl">G2 = B XOR C</span><span class="gr-val ${g2?'gon':'goff'}">${g2?'HIGH':'LOW'}</span></div>
          <div class="gate-row"><span class="gr-lbl">G3 = G1 OR D</span><span class="gr-val ${g3?'gon':'goff'}">${g3?'HIGH':'LOW'}</span></div>
          <div class="gate-row"><span class="gr-lbl">G4 = G2 AND NOT(D)</span><span class="gr-val ${g4?'gon':'goff'}">${g4?'HIGH':'LOW'}</span></div>
          <div class="gate-row gate-out"><span class="gr-lbl">OUTPUT = G3 XOR G4</span><span class="gr-val ${out?'gon':'goff'}">${out?'HIGH':'LOW'}</span></div>`;
        refreshConstraints(this);
      };
      ['A','B','C','D'].forEach(id=>$(`lg-${id}`).oninput=()=>{SFX.click();calc();});
      calc();
    },
    getConstraints(){
      const v=id=>$(`lg-${id}`)?.checked||false;
      const g1=()=>v('A')&&v('B'), g2=()=>v('B')!==v('C'), g3=()=>g1()||v('D'), g4=()=>g2()&&!v('D');
      return [
        {label:'OUTPUT (G3 XOR G4) must be HIGH',met:()=>g3()!==g4()},
        {label:'GATE-1 (A AND B) must be HIGH',  met:()=>g1()},
        {label:'GATE-3 (G1 OR D) must be HIGH',  met:()=>g3()},
        {label:'GATE-4 output must be LOW',       met:()=>!g4()},
        {label:'Input D must be ACTIVE',          met:()=>v('D')},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 08: ECHO PROTOCOL (Memory) ────────────────────────────────────────
  {
    title:'MODULE 08 — ECHO PROTOCOL', timer:40,
    flavor:'Memorize the lit cells — then reproduce the pattern from memory after it disappears.',
    _PAT:[[0,0],[0,2],[1,1],[2,0],[2,2]], _phase:'show', _shown:false, _cdTimer:null,
    _threes: [], _nodes: [],
    cleanup(){ 
      clearInterval(this._cdTimer); this._cdTimer=null; 
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._nodes = [];
    },
    setup(c){
      this._phase='show'; this._shown=false;
      this.cleanup();
      const PAT=this._PAT;
      const patSet=new Set(PAT.map(([r,col])=>`${r},${col}`));
      c.innerHTML=`
        <div class="machine-title">◉ ECHO PROTOCOL</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="mem-status" id="mem-stat">⚠ MEMORIZE — HIDING IN <span id="mem-cntd">2</span>s</div>
        <div class="mem-grid" id="mem-grid">
          ${Array.from({length:3},(_,r)=>Array.from({length:3},(_,col)=>`
            <button class="mem-cell" id="mc-${r}-${col}" data-r="${r}" data-c="${col}">
              <div id="mem-canvas-${r}-${col}" class="three-container"></div>
            </button>`).join('')).join('')}
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn" style="display:none">◉ VERIFY PATTERN</button>`;
      
      const nodeGeo = new THREE.BoxGeometry(3, 3, 1);
      const litMat = new THREE.MeshStandardMaterial({ color: 0xffb700, emissive: 0xffb700, emissiveIntensity: 0.8 });
      const activeMat = new THREE.MeshStandardMaterial({ color: 0x00b8e0, emissive: 0x00b8e0, emissiveIntensity: 0.6 });
      const offMat = new THREE.MeshStandardMaterial({ color: 0x1a2535 });

      for(let r=0; r<3; r++) {
        for(let col=0; col<3; col++) {
          const tm = new ThreeManager($(`mem-canvas-${r}-${col}`), { z: 6 });
          this._threes.push(tm);
          
          const mesh = new THREE.Mesh(nodeGeo, offMat.clone());
          tm.scene.add(mesh);
          this._nodes.push(mesh);
          
          if(patSet.has(`${r},${col}`)) {
            mesh.material.color.setHex(0xffb700);
            mesh.material.emissiveIntensity = 0.8;
          }
        }
      }

      let cd=2;
      this._cdTimer=setInterval(()=>{
        cd--;
        const el=$('mem-cntd');if(el)el.textContent=cd;
        if(cd<=0){
          clearInterval(this._cdTimer); this._cdTimer=null;
          this._shown=true; this._phase='input';
          this._nodes.forEach(mesh => {
            mesh.material.color.setHex(0x1a2535);
            mesh.material.emissiveIntensity = 0;
          });
          const ms=$('mem-stat');if(ms)ms.textContent='↺ REPRODUCE THE PATTERN';
          const sb=$('submit-btn');if(sb)sb.style.display='';
          refreshConstraints(this);
        }
      },1000);
      $('mem-grid').addEventListener('click',e=>{
        if(this._phase!=='input') return;
        const cell=e.target.closest('.mem-cell'); if(!cell) return;
        const r=+cell.dataset.r, col=+cell.dataset.c;
        cell.classList.toggle('mem-active'); 
        
        const mesh = this._nodes[r * 3 + col];
        if(mesh) {
          const active = cell.classList.contains('mem-active');
          mesh.material.color.setHex(active ? 0x00b8e0 : 0x1a2535);
          mesh.material.emissiveIntensity = active ? 0.6 : 0;
          mesh.scale.setScalar(active ? 1.1 : 1.0);
        }

        SFX.click(); refreshConstraints(this);
      });
      refreshConstraints(this);
    },
    getConstraints(){
      if(!this._shown) return [{label:'Memorize the pattern…',met:()=>false}];
      const PAT=this._PAT;
      const active=new Set();
      document.querySelectorAll('.mem-cell.mem-active').forEach(el=>{
        const r=el.dataset.r?.trim(),col=el.dataset.c?.trim(); if(r!==undefined&&col!==undefined)active.add(`${r},${col}`);
      });
      const correct=PAT.filter(([r,col])=>active.has(`${r},${col}`)).length;
      const extra=[...active].filter(k=>!PAT.some(([r,col])=>`${r},${col}`===k)).length;
      return [
        {label:`Correct cells lit: ${correct} / ${PAT.length}`,met:()=>correct===PAT.length},
        {label:'No incorrectly lit cells',                     met:()=>extra===0},
        {label:`Exactly ${PAT.length} cells must be active`,   met:()=>active.size===PAT.length},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 09: LASER REDIRECT ────────────────────────────────────────────────
  {
    title:'MODULE 09 — LASER REDIRECT', timer:38,
    flavor:'Place mirrors (/ or \\) to redirect the laser beam. Target exit: bottom of column 3. Click cells to cycle mirrors.',
    _FIXED:{}, _user:null,
    _threes: [], _mirrors: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._mirrors = [];
    },
    setup(c){
      const R=4,C=4;
      this._FIXED={'0,2':'\\','2,1':'\\'};
      this._user=Array.from({length:R},()=>Array(C).fill(''));
      this.cleanup();
      const isFixed=(r,col)=>this._FIXED[`${r},${col}`]!==undefined;
      const getMirror=(r,col)=>isFixed(r,col)?this._FIXED[`${r},${col}`]:this._user[r][col];
      const mirrorGrid=()=>Array.from({length:R},(_,r)=>Array.from({length:C},(_,col)=>getMirror(r,col)));
      
      c.innerHTML=`
        <div class="machine-title">⟿ LASER REDIRECT</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="laser-wrap">
          <div class="laser-entry">⟶</div>
          <div class="laser-grid" id="lgrid">
            ${Array.from({length:R},(_,r)=>Array.from({length:C},(_,col)=>`
              <button class="laser-cell" id="lc-${r}-${col}" data-r="${r}" data-c="${col}">
                <div id="laser-canvas-${r}-${col}" class="three-container"></div>
              </button>`).join('')).join('')}
          </div>
        </div>
        <div class="laser-exit-badge" id="laser-exit">✘ laser off-target</div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⟿ FIRE LASER</button>`;
      
      const mirrorGeo = new THREE.BoxGeometry(0.1, 2.5, 3.5);
      const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.8 });
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
      const beamMat = new THREE.MeshStandardMaterial({ color: 0xffb700, emissive: 0xffb700, emissiveIntensity: 1.0 });

      for(let r=0; r<R; r++) {
        for(let col=0; col<C; col++) {
          const tm = new ThreeManager($(`laser-canvas-${r}-${col}`), { z: 6 });
          this._threes.push(tm);
          
          const group = new THREE.Group();
          tm.scene.add(group);
          this._mirrors.push(group);
        }
      }

      const upd=()=>{
        const grid=mirrorGrid();
        const {path,exitR,exitC}=traceLaser(grid,R,C);
        const ok=exitR===R&&exitC===3;
        const pathSet = new Set(path);

        for(let r=0;r<R;r++)for(let col=0;col<C;col++){
          const group = this._mirrors[r * C + col];
          if(group) {
            group.clear();
            const m = getMirror(r, col);
            const fix = isFixed(r, col);
            
            if(m) {
              const mesh = new THREE.Mesh(mirrorGeo, fix ? mirrorMat.clone() : mirrorMat);
              if(fix) mesh.material.color.setHex(0x00b8e0);
              mesh.rotation.y = m === '/' ? Math.PI / 4 : -Math.PI / 4;
              group.add(mesh);
            }
            
            if(pathSet.has(`${r},${col}`)) {
              const beam = new THREE.Mesh(beamGeo, beamMat);
              // Simplified path visualization in each cell
              beam.rotation.x = Math.PI / 2;
              group.add(beam);
            }
          }
          const el=$(`lc-${r}-${col}`);
          if(el) {
            el.className='laser-cell'+(isFixed(r,col)?' lc-fixed':getMirror(r,col)?' lc-set':'')+(pathSet.has(`${r},${col}`) ? ' lc-path' : '');
          }
        }
        
        const ei=$('laser-exit');
        if(ei){
          ei.textContent=ok?'✔ TARGET HIT':'✘ '+(!isNaN(exitR)&&exitR===R?`exits col ${exitC}`:`misdirected`);
          ei.className='laser-exit-badge '+(ok?'lei-ok':'');
        }
        refreshConstraints(this,{ok,path,userMirrors:this._user});
      };
      $('lgrid').addEventListener('click',e=>{
        const cell=e.target.closest('.laser-cell'); if(!cell) return;
        const r=+cell.dataset.r,col=+cell.dataset.c; if(isFixed(r,col)) return;
        const m=this._user[r][col];
        this._user[r][col]=m===''?'/':m==='/'?'\\':'';
        SFX.click(); upd();
      });
      upd();
    },
    getConstraints({ok=false,path=[],userMirrors=null}={}){
      const count=userMirrors?userMirrors.flat().filter(v=>v!=='').length:0;
      return [
        {label:'Laser must reach exit at bottom of column 3',  met:()=>ok},
        {label:'Player mirrors must not exceed 3',             met:()=>count<=3},
        {label:'Laser path must traverse ≥ 4 cells',          met:()=>path.length>=4},
        {label:'Fixed relay mirrors must be on the laser path',met:()=>path.includes('0,2')&&path.includes('2,1')},
      ];
    },
    validate(){
      const R=4,C=4;
      const isFixed=(r,col)=>this._FIXED[`${r},${col}`]!==undefined;
      const getMirror=(r,col)=>isFixed(r,col)?this._FIXED[`${r},${col}`]:this._user[r][col];
      const grid=Array.from({length:R},(_,r)=>Array.from({length:C},(_,col)=>getMirror(r,col)));
      const {path,exitR,exitC}=traceLaser(grid,R,C);
      const count=this._user.flat().filter(v=>v!=='').length;
      return exitR===R&&exitC===3&&count<=3&&path.length>=4&&path.includes('0,2')&&path.includes('2,1');
    }
  },

  // ── MODULE 10: EQUATION LOCK ─────────────────────────────────────────────────
  {
    title:'MODULE 10 — EQUATION LOCK', timer:38,
    flavor:'Set all four registers to satisfy the encoded equations. Real values only — no shortcuts.',
    _threes: [], _blocks: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._blocks = [];
    },
    setup(c){
      this.cleanup();
      c.innerHTML=`
        <div class="machine-title">∑ EQUATION LOCK</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="eq-codes">
          <div class="eq-line">REG-A × REG-B = <span class="eq-target">12</span></div>
          <div class="eq-line">REG-B + REG-C = <span class="eq-target">9</span></div>
          <div class="eq-line">REG-C × REG-D = <span class="eq-target">20</span></div>
          <div class="eq-line">REG-A + REG-D must be <span class="eq-target">ODD</span></div>
          <div class="eq-line">All registers: <span class="eq-target">1 – 12</span></div>
        </div>
        <div class="slider-trio">
          ${['A','B','C','D'].map((id, i)=>`<div class="slider-item">
            <span class="sl-lbl">R-${id}</span>
            <div id="reg-canvas-${i}" class="three-container" style="width:120px; height:40px;"></div>
            <input type="range" id="eq-${id}" min="1" max="12" value="1" class="machine-slider">
            <span class="sl-val" id="eqv-${id}">1</span>
          </div>`).join('')}
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">∑ COMMIT REGISTERS</button>`;
      
      const blockGeo = new THREE.BoxGeometry(10, 1, 1);
      const colors = [0xe87820, 0x00b8e0, 0x00ff88, 0xff2840];

      ['A','B','C','D'].forEach((id, i) => {
        const tm = new ThreeManager($(`reg-canvas-${i}`), { z: 6, fov: 30 });
        this._threes.push(tm);
        
        const block = new THREE.Mesh(blockGeo, new THREE.MeshStandardMaterial({ 
          color: colors[i], 
          metalness: 0.5, 
          roughness: 0.5 
        }));
        block.position.x = -5;
        tm.scene.add(block);
        this._blocks.push(block);
      });

      const upd=()=>{
        ['A','B','C','D'].forEach((id, i)=>{
          const val = +$(`eq-${id}`).value;
          if(this._blocks[i]) {
            this._blocks[i].scale.x = Math.max(0.1, val / 12);
            this._blocks[i].position.x = -5 + (val / 12) * 5;
            this._blocks[i].material.emissiveIntensity = val / 12;
            this._blocks[i].material.emissive.setHex(colors[i]);
          }
          const el=$(`eqv-${id}`);
          if(el) el.textContent=val;
        });
        refreshConstraints(this); SFX.tick();
      };
      ['A','B','C','D'].forEach(id=>$(`eq-${id}`).oninput=upd);
      upd();
    },
    getConstraints(){
      const v=id=>+$(`eq-${id}`)?.value||1;
      return [
        {label:'REG-A × REG-B = 12',              met:()=>v('A')*v('B')===12},
        {label:'REG-B + REG-C = 9',               met:()=>v('B')+v('C')===9},
        {label:'REG-C × REG-D = 20',              met:()=>v('C')*v('D')===20},
        {label:'REG-A + REG-D must be ODD',        met:()=>(v('A')+v('D'))%2!==0},
        {label:'All registers between 1 and 12',  met:()=>['A','B','C','D'].every(id=>v(id)>=1&&v(id)<=12)},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 11: BALANCE BEAMS ──────────────────────────────────────────────────
  {
    title:'MODULE 11 — BALANCE BEAMS', timer:40,
    flavor:'Calibrate three balance beams to equilibrium. Cross-beam constraints link the scales together.',
    _vals: [8,8,5,5,10,10],
    _threes: [], _beams: [], _labels: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._beams = [];
      this._labels = [];
    },
    setup(c){
      this._vals=[8,8,5,5,10,10];
      this.cleanup();
      c.innerHTML=`
        <div class="machine-title">⚖ BALANCE BEAMS</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="beams-container" id="beams">
          ${[1,2,3].map(n => `
            <div class="beam-wrap" id="bw-${n}">
              <div class="beam-label">BEAM ${n} <span id="blstat-${n}"></span></div>
              <div id="beam-canvas-${n}" class="three-container" style="height:80px;"></div>
              <div class="beam-controls">
                <label class="bc-lbl">L<input type="range" id="bl${n}" min="0" max="30" value="${this._vals[(n-1)*2]}" class="machine-slider bslider"></label>
                <label class="bc-lbl">R<input type="range" id="br${n}" min="0" max="30" value="${this._vals[(n-1)*2+1]}" class="machine-slider bslider"></label>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⚖ LOCK BEAMS</button>`;

      const baseGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 4);
      const beamGeo = new THREE.BoxGeometry(8, 0.2, 0.4);
      const weightGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a5070 });
      const beamMat = new THREE.MeshStandardMaterial({ color: 0xe87820, metalness: 0.6, roughness: 0.3 });
      
      [1,2,3].forEach(n => {
        const tm = new ThreeManager($(`beam-canvas-${n}`), { z: 6 });
        this._threes.push(tm);
        
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -1;
        tm.scene.add(base);
        
        const beamGroup = new THREE.Group();
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beamGroup.add(beam);
        
        const leftWeight = new THREE.Mesh(weightGeo, new THREE.MeshStandardMaterial({ color: 0x1a2838 }));
        leftWeight.position.x = -3.5;
        leftWeight.position.y = -0.3;
        beamGroup.add(leftWeight);
        
        const rightWeight = new THREE.Mesh(weightGeo, new THREE.MeshStandardMaterial({ color: 0x1a2838 }));
        rightWeight.position.x = 3.5;
        rightWeight.position.y = -0.3;
        beamGroup.add(rightWeight);
        
        tm.scene.add(beamGroup);
        this._beams.push(beamGroup);
        this._labels.push({L: leftWeight, R: rightWeight});
      });

      const updateVisuals=()=>{
        [1,2,3].forEach(n=>{
          const L=+$(`bl${n}`)?.value||0, R=+$(`br${n}`)?.value||0;
          this._vals[(n-1)*2]=L; this._vals[(n-1)*2+1]=R;
          const ang=Math.max(-0.6, Math.min(0.6, (L-R)*0.05));
          const bal=L===R;
          
          if(this._beams[n-1]) this._beams[n-1].rotation.z = ang;
          if(this._labels[n-1]) {
            this._labels[n-1].L.material.color.setHex(bal ? 0x00ff88 : 0x1a2838);
            this._labels[n-1].R.material.color.setHex(bal ? 0x00ff88 : 0x1a2838);
          }

          const bw=$(`bw-${n}`);
          const bls=$(`blstat-${n}`);
          if(bw) bw.className='beam-wrap'+(bal?' beam-ok':'');
          if(bls) bls.innerHTML=`<span class="${bal?'blok':'blno'}">${bal?'✔ BALANCED':'✘ '+Math.abs(L-R)+' off'}</span>`;
        });
        refreshConstraints(this); SFX.tick();
      };

      [1,2,3].forEach(n=>{
        $(`bl${n}`).oninput=updateVisuals;
        $(`br${n}`).oninput=updateVisuals;
      });
      updateVisuals();
    },
    getConstraints(){
      const L=n=>+$(`bl${n}`)?.value||0, R=n=>+$(`br${n}`)?.value||0;
      return [
        {label:'Beam 1 must be balanced (L = R)',               met:()=>L(1)===R(1)},
        {label:'Beam 2 must be balanced (L = R)',               met:()=>L(2)===R(2)},
        {label:'Beam 3 must be balanced (L = R)',               met:()=>L(3)===R(3)},
        {label:'Left Beam1 + Left Beam2 = 15',                 met:()=>L(1)+L(2)===15},
        {label:'Right Beam2 = Left Beam3',                     met:()=>R(2)===L(3)},
        {label:'Total system weight (all 6 values) = 50',      met:()=>L(1)+R(1)+L(2)+R(2)+L(3)+R(3)===50},
        {label:'Right Beam3 must exceed Right Beam1 by ≥ 3',   met:()=>R(3)-R(1)>=3},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 12: PIPE ROUTER ────────────────────────────────────────────────────
  {
    title:'MODULE 12 — PIPE ROUTER', timer:42,
    flavor:'Click cells to cycle pipe types. Route coolant from SOURCE (row 1, left) to SINK (row 1, right). Cell [1,2] is BLOCKED.',
    _grid:null,
    _threes: [], _pipes: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._pipes = [];
    },
    setup(c){
      const R=4,C=4;
      this._grid=Array.from({length:R},()=>Array(C).fill(0));
      this.cleanup();
      const WALLS=new Set(['1,2']);
      const isFixed=(r,col)=>(r===1&&col===0)||(r===1&&col===3);
      c.innerHTML=`
        <div class="machine-title">⊞ PIPE ROUTER</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="pipe-legend"><span>Click to cycle: · ─ │ └ ┘ ┐ ┌</span></div>
        <div class="pipe-grid" id="pgrid">
          ${Array.from({length:R},(_,r)=>Array.from({length:C},(_,col)=>{
            const isSrc=r===1&&col===0,isSnk=r===1&&col===3,isWall=WALLS.has(`${r},${col}`);
            return `<button class="pipe-cell${isSrc?' pc-src':isSnk?' pc-snk':isWall?' pc-wall':''}" id="pc-${r}-${col}" data-r="${r}" data-c="${col}">
              <div id="pipe-canvas-${r}-${col}" class="three-container"></div>
            </button>`;
          }).join('')).join('')}
        </div>
        <div class="pipe-status" id="pipe-stat">✘ No flow</div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⊞ PRESSURIZE</button>`;
      
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a6a88, metalness: 0.7, roughness: 0.2 });
      const wallGeo = new THREE.BoxGeometry(3, 3, 3);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x101820 });

      for(let r=0; r<R; r++) {
        for(let col=0; col<C; col++) {
          const tm = new ThreeManager($(`pipe-canvas-${r}-${col}`), { z: 6 });
          this._threes.push(tm);
          const isWall=WALLS.has(`${r},${col}`);
          const isSrc=r===1&&col===0;
          const isSnk=r===1&&col===3;

          if(isWall) {
            tm.scene.add(new THREE.Mesh(wallGeo, wallMat));
            this._pipes.push(null);
          } else if(isSrc || isSnk) {
            const connector = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshStandardMaterial({ color: isSrc ? 0x00f0ff : 0xe87820, emissive: isSrc ? 0x00f0ff : 0xe87820, emissiveIntensity: 0.5 }));
            tm.scene.add(connector);
            this._pipes.push(null);
          } else {
            const group = new THREE.Group();
            tm.scene.add(group);
            this._pipes.push(group);
          }
        }
      }

      const upd=()=>{
        const {ok,path}=tracePipe(this._grid,R,C,1,0,1,3);
        const pipeCount=this._grid.flat().filter(v=>v>0).length;
        for(let r=0;r<R;r++)for(let col=0;col<C;col++){
          const el=$(`pc-${r}-${col}`); if(!el) continue;
          if(isFixed(r,col)||WALLS.has(`${r},${col}`)) continue;
          
          const group = this._pipes[r * C + col];
          if(group) {
            group.clear();
            const type = this._grid[r][col];
            if(type > 0) {
              const geo = ThreeWidgetFactory.createPipeGeometry(type);
              const flow = ok && path.has(`${r},${col}`);
              const mat = new THREE.MeshStandardMaterial({ 
                color: flow ? 0x00b8e0 : 0x4a6a88, 
                emissive: flow ? 0x00b8e0 : 0x000000,
                emissiveIntensity: 0.5,
                metalness: 0.7, 
                roughness: 0.2 
              });
              const mesh = new THREE.Mesh(geo, mat);
              if (type >= 3) { // Adjust elbow positioning
                 if(type === 3) { mesh.position.set(-2, -2, 0); }
                 if(type === 4) { mesh.position.set(2, -2, 0); }
                 if(type === 5) { mesh.position.set(2, 2, 0); }
                 if(type === 6) { mesh.position.set(-2, 2, 0); }
              }
              group.add(mesh);
            }
          }
          el.classList.toggle('pc-flow',ok&&path.has(`${r},${col}`));
        }
        const ps=$('pipe-stat'); if(ps){ps.textContent=ok?'✔ FLOW CONNECTED':'✘ No flow'; ps.className='pipe-status'+(ok?' ps-ok':'');}
        refreshConstraints(this,{ok,pipeCount,path});
      };
      $('pgrid').addEventListener('click',e=>{
        const cell=e.target.closest('.pipe-cell'); if(!cell) return;
        const r=+cell.dataset.r,col=+cell.dataset.c;
        if(isFixed(r,col)||WALLS.has(`${r},${col}`)) return;
        this._grid[r][col]=(this._grid[r][col]+1)%7; SFX.gear(); upd();
      });
      upd();
    },
    getConstraints({ok=false,pipeCount=0,path=new Set()}={}){
      const orphan=()=>{let o=0;for(let r=0;r<4;r++)for(let col=0;col<4;col++){if(this._grid[r][col]>0&&!path.has(`${r},${col}`))o++;} return o;};
      return [
        {label:'Coolant flow must reach SINK',         met:()=>ok},
        {label:'Pipes placed: ≤ 6',                    met:()=>pipeCount<=6},
        {label:'No orphan (disconnected) pipes',       met:()=>orphan()===0},
        {label:'Path must use row 2 (detour required)',met:()=>[...path].some(k=>k.startsWith('2,'))},
      ];
    },
    validate(){
      const {ok,path}=tracePipe(this._grid,4,4,1,0,1,3);
      const pc=this._grid.flat().filter(v=>v>0).length;
      const orphan=()=>{let o=0;for(let r=0;r<4;r++)for(let col=0;col<4;col++){if(this._grid[r][col]>0&&!path.has(`${r},${col}`))o++;} return o;};
      return ok&&pc<=6&&orphan()===0&&[...path].some(k=>k.startsWith('2,'));
    }
  },

  // ── MODULE 13: CHEMICAL REACTOR ───────────────────────────────────────────────
  {
    title:'MODULE 13 — CHEM REACTOR', timer:38,
    flavor:'Mix four reagents to hit exact formula targets. Watch the reaction indicator shift as you adjust.',
    _threes: [], _fills: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._fills = [];
    },
    setup(c){
      this.cleanup();
      c.innerHTML=`
        <div class="machine-title">⚗ CHEM REACTOR</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="chem-tubes" id="chem-tubes">
          ${['RED','GRN','BLU','CAT'].map((name,i)=>`<div class="chem-tube">
            <div id="chem-canvas-${i}" class="three-container" style="height:90px;"></div>
            <div class="tube-label">${name}</div>
          </div>`).join('')}
        </div>
        <div class="chem-sliders">
          ${['RED','GRN','BLU','CAT'].map((n,i)=>`<div class="slider-item">
            <span class="sl-lbl" style="color:${['#ff4060','#00e876','#00c8e8','#ffb700'][i]}">${n}</span>
            <input type="range" id="cr-${i}" min="0" max="100" value="0" class="machine-slider">
            <span class="sl-val" id="crv-${i}">0</span>
          </div>`).join('')}
        </div>
        <div class="chem-readout">
          <span class="cr-lbl">REACTION:</span>
          <div class="react-color" id="react-color"></div>
          <span class="cr-lbl" id="react-label">UNSTABLE</span>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⚗ SYNTHESIZE</button>`;
      
      const tubeGeo = new THREE.CylinderGeometry(0.8, 0.8, 4, 32, 1, true);
      const fillGeo = new THREE.CylinderGeometry(0.75, 0.75, 4, 32);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
      const fillColors = [0xff4060, 0x00e876, 0x00c8e8, 0xffb700];

      for(let i=0; i<4; i++) {
        const tm = new ThreeManager($(`chem-canvas-${i}`), { z: 5, fov: 40 });
        this._threes.push(tm);
        
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tm.scene.add(tube);
        
        const fill = new THREE.Mesh(fillGeo, new THREE.MeshStandardMaterial({ 
          color: fillColors[i], 
          emissive: fillColors[i], 
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.8 
        }));
        fill.position.y = -2; // Start from bottom
        tm.scene.add(fill);
        this._fills.push(fill);
      }

      const upd=()=>{
        const v=i=>+$(`cr-${i}`)?.value||0;
        for(let i=0;i<4;i++){
          const val=v(i);
          if(this._fills[i]) {
            this._fills[i].scale.y = Math.max(0.001, val / 100);
            this._fills[i].position.y = -2 + (val / 100) * 2;
          }
          const vl=$(`crv-${i}`); if(vl)vl.textContent=val;
        }
        const rc=$('react-color');
        if(rc) rc.style.background=`rgb(${v(0)*2.55|0},${v(1)*2.55|0},${v(2)*2.55|0})`;
        const total=v(0)+v(1)+v(2)+v(3);
        const rl=$('react-label'); if(rl)rl.textContent=total>=135&&total<=155?'STABLE':'UNSTABLE';
        refreshConstraints(this); SFX.tick();
      };
      for(let i=0;i<4;i++) $(`cr-${i}`).oninput=upd;
      refreshConstraints(this);
    },
    getConstraints(){
      const v=i=>+$(`cr-${i}`)?.value||0;
      const isPrime=n=>[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79].includes(n);
      return [
        {label:'RED reagent: 20–35',                            met:()=>v(0)>=20&&v(0)<=35},
        {label:'GRN reagent: 55–70',                           met:()=>v(1)>=55&&v(1)<=70},
        {label:'BLU reagent: 38–52',                           met:()=>v(2)>=38&&v(2)<=52},
        {label:'RED + BLU must be ≤ 80',                       met:()=>v(0)+v(2)<=80},
        {label:'CAT (catalyst) must be a prime number',        met:()=>isPrime(v(3))},
        {label:'Total volume (all 4) must be 135–155',         met:()=>v(0)+v(1)+v(2)+v(3)>=135&&v(0)+v(1)+v(2)+v(3)<=155},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 14: VOLTAGE DIVIDER ────────────────────────────────────────────────
  {
    title:'MODULE 14 — VOLTAGE DIVIDER', timer:38,
    flavor:'Adjust three resistors (kΩ) to hit exact output voltages. Input = 12V. V = 12 × R / (R1+R2+R3).',
    _threes: [], _resistors: [],
    cleanup() {
      this._threes.forEach(t => t.dispose());
      this._threes = [];
      this._resistors = [];
    },
    setup(c){
      this.cleanup();
      c.innerHTML=`
        <div class="machine-title">⚡ VOLTAGE DIVIDER</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="volt-schematic">
          <div class="volt-src">12V ⟶</div>
          <div class="volt-nodes" id="volt-nodes">
            ${[1,2,3].map(n=>`<div class="volt-node">
              <div class="vn-label">R${n}: <span id="vrl-${n}">1</span> kΩ</div>
              <div id="resistor-canvas-${n}" class="three-container" style="height:40px;"></div>
              <input type="range" id="vr-${n}" min="1" max="10" value="1" class="machine-slider">
              <div class="vn-out">V${n} = <span id="vout-${n}" class="vnum">0.0</span>V</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">⚡ CALIBRATE CIRCUIT</button>`;
      
      const resGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 16);
      resGeo.rotation.z = Math.PI / 2;
      const resMat = new THREE.MeshStandardMaterial({ color: 0x5a7080 });

      [1,2,3].forEach(n => {
        const tm = new ThreeManager($(`resistor-canvas-${n}`), { z: 6, fov: 30 });
        this._threes.push(tm);
        
        const group = new THREE.Group();
        const resistor = new THREE.Mesh(resGeo, resMat.clone());
        group.add(resistor);
        
        // Add color bands
        for(let i=0; i<3; i++) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 32), new THREE.MeshStandardMaterial({ color: 0x333333 }));
          band.rotation.y = Math.PI / 2;
          band.position.x = -2 + i * 2;
          group.add(band);
        }

        tm.scene.add(group);
        this._resistors.push(resistor);
      });

      const upd=()=>{
        const r=n=>+$(`vr-${n}`)?.value||1;
        const tot=r(1)+r(2)+r(3);
        [1,2,3].forEach(n=>{
          const val = r(n);
          const resistor = this._resistors[n-1];
          if(resistor) {
            resistor.scale.x = 0.5 + (val / 10) * 0.5;
            resistor.material.color.setHSL(0.1, 0.5, 0.2 + (val / 10) * 0.4);
          }
          const rl=$(`vrl-${n}`); if(rl)rl.textContent=val;
          const vo=$(`vout-${n}`); if(vo){vo.textContent=(12*val/tot).toFixed(2); vo.style.color=(12*val/tot)>0?'#00ff88':'#e87820';}
        });
        refreshConstraints(this); SFX.tick();
      };
      [1,2,3].forEach(n=>$(`vr-${n}`).oninput=upd);
      refreshConstraints(this);
      upd();
    },
    getConstraints(){
      const r=n=>+$(`vr-${n}`)?.value||1;
      const tot=()=>r(1)+r(2)+r(3);
      const vOut=n=>(12*r(n)/tot());
      return [
        {label:'V1 output must be 2.8 – 3.2V',   met:()=>vOut(1)>=2.8&&vOut(1)<=3.2},
        {label:'V2 output must be 4.8 – 5.2V',   met:()=>vOut(2)>=4.8&&vOut(2)<=5.2},
        {label:'V3 output must be 3.8 – 4.2V',   met:()=>vOut(3)>=3.8&&vOut(3)<=4.2},
        {label:'Total resistance ≥ 10 kΩ',        met:()=>tot()>=10},
        {label:'R2 must be greater than R1',      met:()=>r(2)>r(1)},
        {label:'R1 must be less than R3',         met:()=>r(1)<r(3)},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },

  // ── MODULE 15: OMEGA PROTOCOL (Mega Boss) ─────────────────────────────────────
  {
    title:'MODULE 15 — OMEGA PROTOCOL', timer:75,
    flavor:'⚠ ALL subsystems simultaneously. Binary Matrix + Logic Gate + Stability + Vault Code. No checkpoints.',
    _stab:100, _stabTimer:null, _bits:null, _code:[], _CODE:[4,7,2,9], _cooldown:false,
    _three: null, _core: null,
    cleanup(){
      clearInterval(this._stabTimer); this._stabTimer=null;
      if(this._three) this._three.dispose();
      this._three = null;
      this._core = null;
    },
    drainLoop(){
      if(this._stabTimer) clearInterval(this._stabTimer);
      this._stabTimer=setInterval(()=>{
        this._stab=Math.max(0,this._stab-3);
        const b=$('om-stab'); if(b){b.style.width=this._stab+'%';b.style.background=this._stab>50?'#00ff88':this._stab>25?'#e87820':'#ff2840';}
        const p=$('om-pct'); if(p){p.textContent=this._stab+'%';p.style.color=this._stab>50?'#00ff88':this._stab>25?'#e87820':'#ff2840';}
        if(this._stab<=35) SFX.alert();
        
        if(this._core) {
          const s = this._stab / 100;
          this._core.rotation.y += 0.05 * (1 - s);
          this._core.material.emissiveIntensity = 0.5 + (1 - s) * 1.5;
        }

        refreshConstraints(this);
        if(this._stab<=0){ clearInterval(this._stabTimer); this._stabTimer=null; document.body.dispatchEvent(new CustomEvent('reactorFail')); }
      },500);
    },
    setup(c){
      this._stab=100; this._bits=Array.from({length:3},()=>Array(3).fill(0)); this._code=[]; this._cooldown=false;
      this.cleanup();
      const CODE=this._CODE;
      c.innerHTML=`
        <div class="machine-title">☢ OMEGA PROTOCOL</div>
        <p class="machine-instructions">${this.flavor}</p>
        <div class="reactor-header-3d" style="width:100%; height:100px; position:relative; margin-bottom:10px;">
          <div id="omega-canvas" class="three-container"></div>
        </div>
        <div class="stab-section">
          <div class="stab-hdr"><span>◈ CORE STABILITY</span><span id="om-pct" style="color:#00ff88">100%</span></div>
          <div class="stab-track"><div class="stab-bar" id="om-stab" style="width:100%;background:#00ff88;"></div></div>
          <button class="stab-btn" id="om-stb-btn">⟳ STABILIZE (+8%)</button>
        </div>
        <div class="omega-grid">
          <div class="reactor-panel">
            <div class="rp-title">◫ MATRIX — Row sums: 1,2,1 / Col sums: 2,1,1</div>
            <div class="om-bit-grid" id="om-bg">
              ${Array.from({length:3},(_,r)=>Array.from({length:3},(_,col)=>`<button class="om-bit" id="ob-${r}-${col}" data-r="${r}" data-c="${col}">0</button>`).join('')).join('')}
            </div>
          </div>
          <div class="reactor-panel">
            <div class="rp-title">⋈ SWITCH A=ON, D=OFF</div>
            <div class="switch-panel">
              ${['A','B','C','D'].map(id=>`<div class="grid-row" style="padding:5px 10px;">
                <span class="grid-label" style="font-size:0.55rem;">IN-${id}</span>
                <label class="switch"><input type="checkbox" id="om-sw-${id}"><span class="slider"></span></label>
                <span class="grid-status" id="om-st-${id}" style="font-size:0.55rem;">OFF</span>
              </div>`).join('')}
            </div>
          </div>
          <div class="reactor-panel" style="grid-column:span 2;">
            <div class="rp-title">⌨ VAULT CODE — Sum = 22, all digits unique</div>
            <div class="vault-display" id="om-vault">_ _ _ _</div>
            <div class="omega-keypad">
              ${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="key-btn" data-n="${n}">${n}</button>`).join('')}
              <button class="key-btn key-del" id="om-del">⌫</button>
              <button class="key-btn key-enter" id="om-ok">OK</button>
            </div>
            <div class="seq-status" id="om-vault-stat">Enter 4-digit code</div>
          </div>
        </div>
        <div class="constraint-panel" id="c-panel"></div>
        <button class="submit-machine-btn" id="submit-btn">☢ INITIATE OMEGA</button>`;
      
      this._three = new ThreeManager($('omega-canvas'), { z: 5 });
      const coreGeo = new THREE.SphereGeometry(1.5, 8, 8);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xff2840, emissive: 0xff2840, emissiveIntensity: 1, wireframe: true });
      this._core = new THREE.Mesh(coreGeo, coreMat);
      this._three.scene.add(this._core);

      const spikeGeo = new THREE.ConeGeometry(0.2, 2, 8);
      for(let i=0; i<12; i++) {
        const spike = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ color: 0x3a5070 }));
        spike.rotation.x = Math.random() * Math.PI;
        spike.rotation.z = Math.random() * Math.PI;
        spike.position.setFromSphericalCoords(1.5, Math.random() * Math.PI, Math.random() * Math.PI * 2);
        spike.lookAt(0,0,0);
        spike.rotateX(Math.PI/2);
        this._core.add(spike);
      }

      this._three.onUpdate = () => {
        if(this._core) {
          this._core.rotation.y += 0.02;
          this._core.rotation.x += 0.01;
        }
      };

      $('om-stb-btn').onclick=()=>{
        if(this._cooldown)return;
        this._stab=Math.min(100,this._stab+8);
        const b=$('om-stab'); if(b)b.style.width=this._stab+'%';
        const p=$('om-pct'); if(p)p.textContent=this._stab+'%';
        this._cooldown=true; const btn=$('om-stb-btn'); if(btn){btn.disabled=true;btn.textContent='⟳ COOLING...';}
        setTimeout(()=>{this._cooldown=false;const b=$('om-stb-btn');if(b){b.disabled=false;b.textContent='⟳ STABILIZE (+8%)';}},5000);
        SFX.good();
      };
      $('om-bg').addEventListener('click',e=>{
        const cell=e.target.closest('.om-bit'); if(!cell) return;
        const r=+cell.dataset.r,col=+cell.dataset.c;
        this._bits[r][col]=this._bits[r][col]?0:1;
        cell.textContent=this._bits[r][col]; cell.className='om-bit'+(this._bits[r][col]?' om-bit-on':'');
        SFX.click(); refreshConstraints(this);
      });
      ['A','B','C','D'].forEach(id=>{
        $(`om-sw-${id}`).oninput=()=>{
          const on=$(`om-sw-${id}`).checked; const st=$(`om-st-${id}`);
          if(st){st.textContent=on?'ON':'OFF';st.className='grid-status'+(on?' on':'');}
          SFX.click(); refreshConstraints(this);
        };
      });
      const updVault=()=>{
        const vd=$('om-vault'); if(vd)vd.textContent=[...this._code,...Array(4-this._code.length).fill('_')].join(' ');
        refreshConstraints(this);
      };
      c.querySelectorAll('.key-btn[data-n]').forEach(btn=>btn.onclick=()=>{
        if(this._code.length<4){
          this._code.push(+btn.dataset.n); SFX.click(); updVault();
          // Clear 'wrong' status while user is typing a new code
          const vs=$('om-vault-stat');
          if(vs&&vs.textContent.startsWith('✘')) vs.textContent='Enter 4-digit code';
        }
      });
      $('om-del').onclick=()=>{this._code.pop();SFX.click();updVault();};
      $('om-ok').onclick=()=>{
        const correct=this._code.length===4&&this._code.every((d,i)=>d===CODE[i]);
        const vs=$('om-vault-stat');
        if(correct){if(vs)vs.textContent='✔ CODE ACCEPTED'; SFX.good();}
        else{
          this._code=[]; updVault();
          this._stab=Math.max(0,this._stab-20);
          const b=$('om-stab');if(b)b.style.width=this._stab+'%';
          if(vs)vs.textContent='✘ WRONG — PENALTY -20%';
          SFX.bad(); refreshConstraints(this);
        }
      };
      this.drainLoop(); refreshConstraints(this);
    },
    getConstraints(){
      const b=this._bits; if(!b) return [];
      const rowOk=(rt)=>b.every((row,r)=>row.reduce((s,v)=>s+v,0)===rt[r]);
      const colOk=(ct)=>[0,1,2].every(col=>b.reduce((s,row)=>s+row[col],0)===ct[col]);
      const swOn=id=>$(`om-sw-${id}`)?.checked||false;
      const codeCorrect=()=>this._code.length===4&&this._code.every((d,i)=>d===this._CODE[i]);
      return [
        {label:'Matrix row sums = [1, 2, 1]',       met:()=>rowOk([1,2,1])},
        {label:'Matrix col sums = [2, 1, 1]',       met:()=>colOk([2,1,1])},
        {label:'Switch A = ON',                      met:()=>swOn('A')},
        {label:'Switch D = OFF',                     met:()=>!swOn('D')},
        {label:'Vault code accepted',                met:()=>codeCorrect()},
        {label:'Core stability > 25%',              met:()=>this._stab>25},
      ];
    },
    validate(){return this.getConstraints().every(c=>c.met());}
  },
];

// ── Game State ────────────────────────────────────────────────────────────────
let currentLevel=0, lives=3, penaltySeconds=0, totalElapsed=0, globalStart=0;
let globalTimer=null, levelTimer=null, levelTimeLeft=0;
let _gameOverFired=false; // guard against double gameOver
let homeThree=null;
const CIRC=2*Math.PI*14;

function initHomeThree() {
  const container = $('home-gear-canvas');
  if(!container) return;
  if(homeThree) homeThree.dispose();
  
  homeThree = new ThreeManager(container, { z: 4 });
  const gearGeo = ThreeWidgetFactory.createGearGeometry(1.8, 1.3, 0.4, 10);
  const gearMat = new THREE.MeshStandardMaterial({ color: 0xe87820, metalness: 0.8, roughness: 0.2 });
  const gear = new THREE.Mesh(gearGeo, gearMat);
  gear.rotation.x = Math.PI / 2;
  homeThree.scene.add(gear);
  
  homeThree.onUpdate = () => {
    gear.rotation.z += 0.01;
  };
}

function renderLives() {
  const el=$('lives-display');
  const safe=Math.max(0,Math.min(3,lives));
  if(el) el.innerHTML='♥'.repeat(safe)+'<span class="hl">♥</span>'.repeat(3-safe);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=$(id);
  if(!el) return;
  el.style.opacity='0';
  el.classList.add('active');
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.style.opacity='1'));
}

function updateTimerUI() {
  const fill=$('trace-fill'), secs=$('trace-seconds'); if(!fill||!secs) return;
  const max=levels[currentLevel]?.timer||40;
  const ratio=levelTimeLeft/max;
  fill.style.strokeDasharray=`${CIRC*ratio} ${CIRC}`;
  fill.style.stroke=`hsl(${Math.max(0,Math.floor(ratio*120))},100%,55%)`;
  secs.textContent=levelTimeLeft; secs.style.color=levelTimeLeft<=8?'#ff2840':'';
}

function startLevelTimer(s) {
  clearInterval(levelTimer);
  levelTimeLeft=s; updateTimerUI();
  levelTimer=setInterval(()=>{
    levelTimeLeft--;
    updateTimerUI();
    if(levelTimeLeft<=0){ clearInterval(levelTimer); levelTimer=null; timeExpired(); }
  },1000);
}
function stopLevelTimer() { clearInterval(levelTimer); levelTimer=null; }

function timeExpired() {
  if(_gameOverFired) return;
  lives=Math.max(0,lives-1); renderLives();
  cleanupCurrentLevel();
  const c=$('machine-container');
  c.classList.add('machine-error'); spawnParticles(c,'#ff2840',8); SFX.bad();
  setTimeout(()=>{
    c.classList.remove('machine-error');
    if(lives<=0) gameOver(false); else loadLevel();
  },750);
}

/** Safely run cleanup for the level at currentLevel (won't crash if index is out-of-bounds). */
function cleanupCurrentLevel() {
  const lvl=levels[currentLevel];
  if(lvl?.cleanup) lvl.cleanup();
}

function showLevelBadge(title, cb) {
  const c=$('machine-container');
  const el=document.createElement('div'); el.className='lvl-overlay';
  const inner=document.createElement('div'); inner.className='lvo-title';
  inner.textContent=title; // textContent — no XSS
  el.appendChild(inner);
  c.appendChild(el);
  setTimeout(()=>{
    el.classList.add('lvo-out');
    c.style.transition='opacity 0.45s ease,transform 0.45s ease';
    c.style.opacity='1'; c.style.transform='translateX(0)';
    setTimeout(()=>{el.remove(); cb();},460);
  },860);
}

function loadLevel() {
  if(_gameOverFired) return;
  stopLevelTimer();
  if(currentLevel>=levels.length){gameOver(true); return;}
  $('level-display').textContent=currentLevel+1;
  const c=$('machine-container');
  c.className='machine-container'; c.style.transition='none'; c.style.opacity='0'; c.style.transform='translateX(32px)';
  const lvl=levels[currentLevel]; lvl.setup(c);

  // Guard: disable Submit during badge animation to prevent a race where
  // the player clicks before the timer starts, causing the stale badge
  // callback to fire startLevelTimer() on the NEXT level.
  const sub=$('submit-btn');
  if(sub) {
    sub.disabled=true;
    sub.onclick=()=>{ if(lvl.validate()) levelSuccess(); else { levelFail(); SFX.bad(); } };
  }
  showLevelBadge(lvl.title,()=>{
    if(sub) sub.disabled=false; // enable exactly when timer is ready
    startLevelTimer(lvl.timer||40);
  });
}

function levelSuccess() {
  if(_gameOverFired) return;
  stopLevelTimer();
  cleanupCurrentLevel();
  const bonus=Math.floor(levelTimeLeft*0.4); penaltySeconds=Math.max(0,penaltySeconds-bonus);
  const c=$('machine-container'); c.classList.add('machine-success'); spawnParticles(c,'#00ff88',14); SFX.success();
  if(bonus>0) floatMsg(c,`+${bonus}s BONUS`,'#00ff88');
  setTimeout(()=>{c.classList.remove('machine-success'); currentLevel++; loadLevel();},950);
}

function levelFail() {
  penaltySeconds+=5; const c=$('machine-container');
  c.classList.add('machine-error'); spawnParticles(c,'#ff2840',8);
  setTimeout(()=>c.classList.remove('machine-error'),750);
}

function gameOver(win) {
  if(_gameOverFired) return; // prevent double execution
  _gameOverFired=true;
  clearInterval(globalTimer); globalTimer=null;
  stopLevelTimer();
  cleanupCurrentLevel();

  const final=(totalElapsed+penaltySeconds).toFixed(1);
  $('game-over-title').textContent=win?'SYSTEMS ONLINE':'SYSTEM FAILURE';
  $('go-sub').textContent=win?'All modules calibrated. Factory operational.':'Critical error. Factory shutdown initiated.';
  const dot=$('go-dot'); if(dot) dot.style.fill=win?'#00ff88':'#ff2840';
  $('stat-nodes').textContent=`${currentLevel}/${levels.length}`;
  $('stat-penalties').textContent=`+${penaltySeconds}s`;
  $('stat-time').textContent=final+'s';
  const prev=parseFloat(lsGet('machinecore_best','Infinity'));
  const isRec=win&&parseFloat(final)<prev;
  if(isRec) lsSet('machinecore_best',final);
  $('stat-best').textContent=isRec?final+'s':(prev===Infinity?'--':prev.toFixed(1)+'s');
  const rb=$('new-record-msg'); if(rb) rb.style.display=isRec?'flex':'none';
  showScreen('game-over-screen');
}

function startGame() {
  if(homeThree) { homeThree.dispose(); homeThree=null; }
  // Stop any previously running timers/drains before resetting
  stopLevelTimer();
  clearInterval(globalTimer); globalTimer=null;
  levels.forEach(lvl=>{ if(lvl.cleanup) lvl.cleanup(); });

  _gameOverFired=false;
  currentLevel=0; lives=3; penaltySeconds=0; totalElapsed=0; globalStart=Date.now();
  globalTimer=setInterval(()=>{totalElapsed=(Date.now()-globalStart)/1000;},100);
  $('level-total').textContent=levels.length; renderLives(); showScreen('game-screen'); loadLevel();
}

function updateHomeBest() {
  const b=lsGet('machinecore_best'), el=$('best-score-home');
  if(el) el.textContent=b?b+'s':'--';
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.body.addEventListener('reactorFail',()=>{
  if(_gameOverFired) return;
  lives=0; renderLives(); gameOver(false);
});
document.body.addEventListener('manualSubmit',e=>{if(e.detail) levelSuccess(); else levelFail();});

$('start-btn').onclick=startGame;
$('restart-btn').onclick=startGame;
$('menu-btn').onclick=()=>{updateHomeBest(); showScreen('start-screen'); initHomeThree();};
updateHomeBest();
initHomeThree();
