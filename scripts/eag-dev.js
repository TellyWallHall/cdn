/* eagler-probe-overlay.js
   Non-invasive probe + safe overlay for private Eaglercraft builds.
   - Requires: window.__EAGLER_ALLOW_INTERNALS = true (set in index.html before this script)
   - Exposes: window.__EAGLER_CLIENT_API (best-effort)
   - Safety: read-first; setLocalFov is visual-only (no networking).
*/

(function(){
  if (window.__EAGLER_PROBE_OVERLAY_LOADED) return;
  window.__EAGLER_PROBE_OVERLAY_LOADED = true;

  // ---------------- Utilities ----------------
  function once(fn){ let done=false; return (...a)=>{ if(done) return; done=true; return fn(...a); }; }
  function el(tag, attrs={}, txt){ const e=document.createElement(tag); for(const k in attrs){ if(k==='style') Object.assign(e.style, attrs[k]); else e.setAttribute(k, attrs[k]); } if(txt!==undefined) e.textContent = txt; return e; }
  function safe(fn){ try{ return fn(); }catch(e){ console.warn(e); return null; } }

  // ---------------- Probe shim (Option B, best-effort) ----------------
  function tryWrapTick(client, api){
    try {
      if (client && typeof client.tick === "function" && !client.__eagler_tick_wrapped) {
        const orig = client.tick;
        client.tick = function(){ const t0=performance.now(); try{ orig.apply(this, arguments);}catch(e){ try{ orig.call(this);}catch(e){} } const t1=performance.now(); const dt=Math.min(t1-t0,200); if(api && typeof api._dispatchTick==='function') api._dispatchTick(dt); };
        client.__eagler_tick_wrapped = true;
        return true;
      }
    } catch(e){}
    return false;
  }

  function makeApi(client){
    if (window.__EAGLER_CLIENT_API) return window.__EAGLER_CLIENT_API;
    const api = {
      version: "0.1",
      // best-effort read-only snapshot of player
      getPlayerState: function(){
        try {
          const p = client && (client.player || client.thePlayer || (client.getPlayer && client.getPlayer()));
          if(!p) return null;
          return {
            id: p.id || p.uuid || null,
            name: p.name || (p.getName && p.getName && p.getName()) || null,
            pos: {
              x: (p.posX !== undefined ? p.posX : (p.x !== undefined ? p.x : null)),
              y: (p.posY !== undefined ? p.posY : (p.y !== undefined ? p.y : null)),
              z: (p.posZ !== undefined ? p.posZ : (p.z !== undefined ? p.z : null))
            },
            onGround: !!(p.onGround || (typeof p.isOnGround === 'function' ? p.isOnGround() : false)),
            health: (p.getHealth ? p.getHealth() : (p.health !== undefined ? p.health : null)),
            yaw: (p.rotationYaw !== undefined ? p.rotationYaw : (p.yaw !== undefined ? p.yaw : null)),
            pitch: (p.rotationPitch !== undefined ? p.rotationPitch : (p.pitch !== undefined ? p.pitch : null))
          };
        } catch(e){ console.warn("getPlayerState failed", e); return null; }
      },
      getWorldInfo: function(){
        try {
          const w = client && (client.world || client.theWorld || null);
          if(!w) return null;
          return {
            time: (w.getWorldTime ? w.getWorldTime() : (w.time !== undefined ? w.time : null)),
            dim: (w.provider && (w.provider.getDimension ? w.provider.getDimension() : (w.dimension || null))) || null
          };
        } catch(e){ console.warn("getWorldInfo failed", e); return null; }
      },

      // subscribe/unsubscribe tick handlers (handlers run in page context)
      subscribeTick: function(handler){
        if(typeof handler !== 'function') return null;
        api._tickSubs = api._tickSubs || [];
        const id = Math.random().toString(36).slice(2,9);
        api._tickSubs.push({ id, handler });
        return id;
      },
      unsubscribeTick: function(id){
        api._tickSubs = (api._tickSubs || []).filter(x=>x.id !== id);
      },

      // visual-only FOV setter: try to set on client if available, otherwise use canvas-scale fallback
      setLocalFov: function(fov){
        try {
          // clamp plausible values
          if (typeof fov !== 'number') return false;
          if (fov < 10) fov = 10;
          if (fov > 170) fov = 170;

          // Try known client fields: options.fov or gameSettings.fov
          const options = client && (client.options || client.gameSettings || null);
          if (options && ('fov' in options || 'getFov' in options || 'setFov' in options)) {
            if ('fov' in options) { options.fov = fov; return true; }
            if (typeof options.setFov === 'function') { options.setFov(fov); return true; }
          }
          // Some builds store weapons/camera on client.renderManager or client.entityRenderer
          if (client && client.entityRenderer && typeof client.entityRenderer.setFOV === 'function') {
            try { client.entityRenderer.setFOV(fov); return true; } catch(e) {}
          }

          // Fallback: apply a non-authoritative visual transform on the <canvas> element
          const canvas = document.querySelector('canvas');
          if (canvas) {
            // map fov to CSS scale roughly: higher fov -> smaller scale, lower fov -> zoom in
            // this is approximate and purely visual
            const scale = Math.max(0.6, Math.min(1.6, 75 / fov)); // 75 is default-ish
            canvas.style.transformOrigin = '50% 50%';
            canvas.style.transition = 'transform 150ms linear';
            canvas.style.transform = `scale(${scale})`;
            // annotate current fallback fov for awareness
            canvas.dataset.__eagler_fov = String(fov);
            return true;
          }
          return false;
        } catch(e){ console.warn("setLocalFov failed", e); return false; }
      },

      clientLog: function(msg){
        try { console.log("[EAGLER_CLIENT_API] " + String(msg)); }catch(e){}
      },

      // internal dispatcher called when we wrap the client's tick loop or poll fallback
      _dispatchTick: function(dt){
        try {
          const arr = api._tickSubs || [];
          for(let i=0;i<arr.length;i++){
            try { arr[i].handler(dt); } catch(e){ console.warn("tick handler error", e); }
          }
        } catch(e){ console.warn("_dispatchTick error", e); }
      }
    };

    // freeze to avoid overwriting by accident
    Object.defineProperty(window, "__EAGLER_CLIENT_API", { value: api, writable: false, configurable: false });
    return api;
  }

  // Probe heuristics
  function probeForClient(){
    const candidates = [];
    try {
      // common names
      candidates.push(window.game);
      candidates.push(window.client);
      candidates.push(window.minecraft);
      candidates.push(window.MinecraftClient);
      candidates.push(window._minecraftClient);
      // also scan window for objects with likely properties
      for(const k in window){
        try {
          if(!window.hasOwnProperty || !window.hasOwnProperty(k)) continue;
          const v = window[k];
          if (!v || typeof v !== 'object') continue;
          if ('player' in v || 'thePlayer' in v || 'world' in v || typeof v.tick === 'function') candidates.push(v);
        } catch(e){}
        if (candidates.length > 60) break;
      }
    } catch(e){ console.warn("probe enumerate failed", e); }

    for(let i=0;i<candidates.length;i++){
      const c = candidates[i];
      if(!c || typeof c !== 'object') continue;
      if (('player' in c) || ('world' in c) || typeof c.tick === 'function') {
        try {
          // create api and try to wrap tick if we can
          const api = makeApi(c);
          tryWrapTick(c, api);
          console.info("Eagler probe: client object detected and API exported.");
          return true;
        } catch(e){ console.warn("makeApi failed", e); }
      }
    }
    return false;
  }

  // Try probing repeatedly for a short window (client may init async)
  if (!window.__EAGLER_ALLOW_INTERNALS) {
    console.info("Eagler probe: internals disabled. Set window.__EAGLER_ALLOW_INTERNALS = true before this script to enable.");
  } else {
    let tries=0;
    const maxTries = 40;
    const t = setInterval(function(){
      tries++;
      if (probeForClient() || tries>maxTries){
        clearInterval(t);
        if (tries>maxTries) console.warn("Eagler probe: client object not found - Option A (patching build) may be required for deeper access.");
      }
    }, 200);
  }

  // ---------------- Overlay UI ----------------
  // Basic floating panel with FPS, API state, player info, tick toggle, FOV slider
  const root = el('div', { style: { position:'fixed', right:'12px', bottom:'12px', zIndex:999999, fontFamily:'Inter,Arial,Helvetica,sans-serif' }});
  const btn = el('button', { style:{ background:'#131313', color:'#fff', padding:'8px 10px', borderRadius:'8px', border:'none', cursor:'pointer', boxShadow:'0 6px 18px rgba(0,0,0,0.5)' } }, 'Eagler Dev');
  root.appendChild(btn);

  const panel = el('div', { style:{ display:'none', width:'360px', maxWidth:'calc(100vw - 24px)', background:'rgba(18,18,20,0.96)', color:'#e6e6e6', borderRadius:'10px', padding:'10px', boxShadow:'0 8px 36px rgba(0,0,0,0.6)', marginBottom:'8px', fontSize:'13px' }});
  const hdr = el('div', {}, 'Eagler Dev Overlay (private)');
  const status = el('div', { style:{ marginTop:'6px', color:'#9bd' } }, 'API: probing...');
  const fpsEl = el('div', { style:{ marginTop:'8px' } }, 'FPS: -');
  const playerEl = el('div', { style:{ marginTop:'6px', whiteSpace:'pre-wrap' } }, 'Player: -');
  const tickBtn = el('button', { style:{ marginTop:'8px', padding:'6px 8px', borderRadius:'6px', border:'none', cursor:'pointer' } }, 'Subscribe Tick');
  const unsubBtn = el('button', { style:{ marginLeft:'8px', marginTop:'8px', padding:'6px 8px', borderRadius:'6px', border:'none', cursor:'pointer' } }, 'Unsubscribe');
  const fovRow = el('div', { style:{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px' } });
  const fovLabel = el('div', {}, 'Local FOV:');
  const fovSlider = el('input', { type:'range', min: '10', max:'170', value: '75', style:{ flex:'1' } });
  const fovVal = el('div', { style:{ width:'42px', textAlign:'right' } }, '75');
  fovRow.appendChild(fovLabel); fovRow.appendChild(fovSlider); fovRow.appendChild(fovVal);

  const consoleHint = el('div', { style:{ marginTop:'10px', fontSize:'12px', color:'#9aa' } }, 'Open DevTools console. Use: window.__EAGLER_CLIENT_API (if available)');

  panel.appendChild(hdr);
  panel.appendChild(status);
  panel.appendChild(fpsEl);
  panel.appendChild(playerEl);
  panel.appendChild(el('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } }, '') );
  panel.appendChild(tickBtn);
  panel.appendChild(unsubBtn);
  panel.appendChild(fovRow);
  panel.appendChild(consoleHint);
  root.appendChild(panel);
  document.body.appendChild(root);

  btn.addEventListener('click', ()=>{ panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });

  // FPS loop for display
  let last = performance.now();
  function fpsLoop(now){
    const dt = now - last; last = now;
    const fps = Math.round(1000/dt);
    fpsEl.textContent = 'FPS: '+fps;
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  // Periodic API status update & player info refresher
  let tickSubId = null;
  function refreshStatus(){
    const api = window.__EAGLER_CLIENT_API;
    status.textContent = api ? ('API v' + api.version + ' — ready') : 'API: not found';
    if(api){
      const p = safe(()=>api.getPlayerState());
      if(p){
        playerEl.textContent = `Player:\n x:${Math.round(p.pos.x||0)} y:${Math.round(p.pos.y||0)} z:${Math.round(p.pos.z||0)}\nHP: ${p.health===null?'?':p.health}`;
      } else {
        playerEl.textContent = 'Player: (not available)';
      }
    } else {
      playerEl.textContent = 'Player: (probe in progress or API disabled)';
    }
  }

  const statusInterval = setInterval(refreshStatus, 750);
  refreshStatus();

  // Tick subscription management
  tickBtn.addEventListener('click', ()=> {
    const api = window.__EAGLER_CLIENT_API;
    if(!api){ alert('API not available yet. Ensure __EAGLER_ALLOW_INTERNALS = true before this script and reload.'); return; }
    if (tickSubId) { alert('Already subscribed'); return; }
    tickSubId = api.subscribeTick(function(dt){
      // simple example tick handler — update player info more frequently
      const p = safe(()=>api.getPlayerState());
      if(p){
        playerEl.textContent = `Player:\n x:${Math.round(p.pos.x||0)} y:${Math.round(p.pos.y||0)} z:${Math.round(p.pos.z||0)}\nHP: ${p.health===null?'?':p.health}`;
      }
    });
    status.textContent = 'Subscribed to tick (id: ' + tickSubId + ')';
  });

  unsubBtn.addEventListener('click', ()=> {
    const api = window.__EAGLER_CLIENT_API;
    if(api && tickSubId){ api.unsubscribeTick(tickSubId); status.textContent = 'Unsubscribed'; tickSubId = null; }
    else { status.textContent = 'No active subscription'; }
  });

  // FOV slider
  fovSlider.addEventListener('input', ()=> {
    const api = window.__EAGLER_CLIENT_API;
    const val = Number(fovSlider.value);
    fovVal.textContent = String(val);
    if(!api){ /* apply fallback visual transform directly */ 
      const canvas = document.querySelector('canvas');
      if(canvas){ const scale = Math.max(0.6, Math.min(1.6, 75/val)); canvas.style.transformOrigin='50% 50%'; canvas.style.transform='scale('+scale+')'; canvas.dataset.__eagler_fov = String(val); }
      return;
    }
    const ok = safe(()=> api.setLocalFov(val));
    if(!ok) {
      // fallback visual transform if API couldn't set
      const canvas = document.querySelector('canvas');
      if(canvas){ const scale = Math.max(0.6, Math.min(1.6, 75/val)); canvas.style.transformOrigin='50% 50%'; canvas.style.transform='scale('+scale+')'; canvas.dataset.__eagler_fov = String(val); }
    }
  });

  // initial slider value from any existing canvas fallback
  const canvas = document.querySelector('canvas');
  if(canvas && canvas.dataset && canvas.dataset.__eagler_fov) { fovSlider.value = canvas.dataset.__eagler_fov; fovVal.textContent = canvas.dataset.__eagler_fov; }

  // small poll to update status if API appears later
  const poller = setInterval(()=>{ if(window.__EAGLER_CLIENT_API) refreshStatus(); }, 500);

  // cleanup on unload
  window.addEventListener('beforeunload', ()=>{ try{ clearInterval(statusInterval); clearInterval(poller); }catch(e){} });

  // helpful console alias
  window.__EAGLER_DEV = {
    refreshStatus: refreshStatus,
    showApi: ()=>{ console.log(window.__EAGLER_CLIENT_API || 'API not loaded'); },
    setFov: (v)=>{ if(window.__EAGLER_CLIENT_API) window.__EAGLER_CLIENT_API.setLocalFov(v); else { const c=document.querySelector('canvas'); if(c){ c.style.transform='scale('+Math.max(0.6,Math.min(1.6,75/v))+')'; } } }
  };

  console.log("Eagler probe overlay loaded (private). Set window.__EAGLER_ALLOW_INTERNALS = true before this script to enable deeper probing.");
})();
