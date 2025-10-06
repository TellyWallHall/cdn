/* module-overlay.js
   Lightweight Module Manager + Sandbox Loader for private Eaglercraft modding.
   - Register modules in JS (trusted) via ClientModules.register(...)
   - Load untrusted modules into a sandbox iframe via manifest/URL
   - Persist modules in localStorage under "eagler:mods_v1"
   - Integrates with window.__EAGLER_CLIENT_API if available (read-only, tick)
*/

(function(){
  if (window.__EAGLER_MODULES_LOADED) return;
  window.__EAGLER_MODULES_LOADED = true;

  // --- storage helpers
  const KEY = "eagler:mods_v1";
  function save(v){ localStorage.setItem(KEY, JSON.stringify(v)); }
  function load(){ try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch(e) { return []; } }

  // --- tiny EventBus
  class Bus {
    constructor(){ this.map = {}; }
    on(evt, fn){ (this.map[evt] = this.map[evt] || []).push(fn); return fn; }
    off(evt, fn){ if(!this.map[evt]) return; this.map[evt] = this.map[evt].filter(f=>f!==fn); }
    emit(evt, ...a){ (this.map[evt]||[]).slice().forEach(f=>{ try{ f(...a); }catch(e){ console.error("bus err",e); } }); }
  }
  const bus = new Bus();

  // --- Module class (trusted modules run in page)
  class Module {
    constructor(meta, handlers){
      this.id = meta.id || ("m_"+Math.random().toString(36).slice(2,9));
      this.name = meta.name || this.id;
      this.meta = meta;
      this.handlers = handlers || {};
      this.enabled = !!meta.enabled;
      this.config = meta.config || {};
    }
    enable(){ if(this.enabled) return; this.enabled = true; try{ this.handlers.onEnable && this.handlers.onEnable(); }catch(e){console.error(e);} bus.emit("module:changed", this); persist(); }
    disable(){ if(!this.enabled) return; this.enabled = false; try{ this.handlers.onDisable && this.handlers.onDisable(); }catch(e){console.error(e);} bus.emit("module:changed", this); persist(); }
    toggle(){ this.enabled ? this.disable() : this.enable(); }
    tick(dt){ try{ this.handlers.onTick && this.handlers.onTick(dt); }catch(e){console.error(e);} }
    render2D(){ try{ this.handlers.onRender2D && this.handlers.onRender2D(); }catch(e){console.error(e);} }
  }

  // --- ModuleManager
  class ModuleManager {
    constructor(){ this.modules = {}; this.order = []; const saved = load(); saved.forEach(s=>{ this.order.push(s.id); this.modules[s.id] = new Module(s, {}); }); }
    register(meta, handlers){
      if(this.modules[meta.id]) return this.modules[meta.id];
      const m = new Module(meta, handlers);
      this.modules[m.id] = m;
      this.order.push(m.id);
      persist();
      return m;
    }
    unregister(id){ delete this.modules[id]; this.order = this.order.filter(x=>x!==id); persist(); }
    get(id){ return this.modules[id]; }
    all(){ return this.order.map(id=>this.modules[id]); }
    serialized(){ return this.order.map(id=>{ const m=this.modules[id]; return { id:m.id, name:m.name, enabled:m.enabled, meta:m.meta, config:m.config }; }); }
    restore(){ const s = load(); s.forEach(o=>{ if(this.modules[o.id]){ this.modules[o.id].enabled = !!o.enabled; this.modules[o.id].config = o.config || {}; } }); }
  }

  const manager = new ModuleManager();

  function persist(){ save(manager.serialized()); }

  // --- RAF tick to route onTick to enabled modules (and use client API if available)
  let last = performance.now();
  function raf(now){
    const dt = Math.min(now-last, 200); last = now;
    manager.all().forEach(m => { if(m.enabled) m.tick(dt); });
    bus.emit("raf", dt);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // --- Simple UI
  const root = document.createElement("div");
  root.style = "position:fixed; left:12px; top:12px; z-index:999999; font-family:Inter,Arial,Helvetica;";

  const panel = document.createElement("div");
  panel.style = "background:rgba(12,12,12,0.9); color:#eaeaea; padding:8px; border-radius:8px; width:320px; box-shadow:0 8px 32px rgba(0,0,0,0.6);";
  root.appendChild(panel);

  const title = document.createElement("div"); title.textContent = "Modules"; title.style = "font-weight:600;margin-bottom:6px;";
  panel.appendChild(title);

  const list = document.createElement("div"); panel.appendChild(list);

  function renderList(){
    list.innerHTML = "";
    manager.all().forEach(m=>{
      const row = document.createElement("div");
      row.style = "display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.04)";
      const left = document.createElement("div"); left.textContent = m.name;
      const right = document.createElement("div");
      const btn = document.createElement("button"); btn.textContent = m.enabled ? "ON":"OFF"; btn.style = "margin-left:6px;padding:4px 8px;border-radius:6px;background:#222;color:#fff;border:none;cursor:pointer;";
      btn.onclick = ()=>{ m.toggle(); btn.textContent = m.enabled ? "ON":"OFF"; renderList(); };
      const rm = document.createElement("button"); rm.textContent = "Remove"; rm.style="margin-left:6px;padding:4px 8px;border-radius:6px;background:#6a2a2a;color:#fff;border:none;cursor:pointer;";
      rm.onclick = ()=>{ if(confirm("Remove module "+m.name+"?")){ manager.unregister(m.id); renderList(); } };
      right.appendChild(btn); right.appendChild(rm);
      row.appendChild(left); row.appendChild(right);
      list.appendChild(row);
    });
  }
  panel.appendChild(document.createElement("hr"));

  // quick install from URL
  const installRow = document.createElement("div"); installRow.style="display:flex;gap:6px;margin-top:6px;";
  const urlIn = document.createElement("input"); urlIn.placeholder="Module URL (cdn)"; urlIn.style="flex:1;padding:6px;border-radius:6px;border:1px solid #333;background:#0e0e0e;color:#fff;";
  const installBtn = document.createElement("button"); installBtn.textContent="Install"; installBtn.style="padding:6px;border-radius:6px;border:none;background:#0b7;cursor:pointer;color:#000;";
  installRow.appendChild(urlIn); installRow.appendChild(installBtn);
  panel.appendChild(installRow);

  // example built-in make-trusted-module button
  const demoRow = document.createElement("div"); demoRow.style="margin-top:8px;";
  const demoBtn = document.createElement("button"); demoBtn.textContent="Add Demo: HUD Clock"; demoBtn.style="padding:6px;border-radius:6px;border:none;background:#3a7;color:#fff;cursor:pointer;";
  demoRow.appendChild(demoBtn); panel.appendChild(demoRow);

  document.body.appendChild(root);

  // --- Install from CDN (sandboxed) ---
  // We'll fetch the module file, then create a sandbox iframe to run it with a small bridge.
  function createSandboxRun(code, meta){
    // create iframe
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style = "display:none";
    document.body.appendChild(frame);
    const html = `
      <!doctype html><html><body><script>
        // small runtime: expose send() to user code to call parent bridge
        function send(msg){ parent.postMessage(msg, "*"); }
        window.addEventListener("message", function(ev){ if(ev.data && ev.data.type==="run"){ try{ (new Function("send", ev.data.code))(send); parent.postMessage({type:"done"}, "*"); }catch(e){ parent.postMessage({type:"error", error:String(e)}, "*"); } } }, false);
      <\/script></body></html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    frame.src = URL.createObjectURL(blob);

    const tidy = ()=>{ try{ setTimeout(()=>{ frame.remove(); }, 500); }catch(e){} };

    function onMessage(ev){
      if(ev.source !== frame.contentWindow) return;
      const d = ev.data || {};
      if(d.type === "createTrustedModule"){
        // create a trusted module using provided metadata & handlers (handlers are not serializable across postMessage, so modules run in-page only if trusted)
      } else if(d.type === "done"){
        window.removeEventListener("message", onMessage);
        tidy();
      } else if (d.type === "error"){
        window.removeEventListener("message", onMessage);
        console.error("Module sandbox error:", d.error);
        tidy();
      } else if (d.type === "request"){
        // handle allowed requests from sandbox (create HUD, save/load)
        // For now, respond with a simple ack
        // Extend this to route to a safe API like the earlier sandbox example.
      }
    }
    window.addEventListener("message", onMessage);
    // run
    frame.contentWindow.postMessage({ type: "run", code: code }, "*");
  }

  installBtn.addEventListener("click", async ()=>{
    const url = urlIn.value && urlIn.value.trim();
    if(!url) return alert("Enter module URL");
    try {
      const res = await fetch(url);
      if(!res.ok) throw new Error("fetch failed");
      const js = await res.text();
      // For safety, sandbox the module by default instead of running it trusted in-page
      createSandboxRun(js, { source: url });
      alert("Module fetched and executed in sandbox (check console for sandbox logs). If it's a trusted module, add it via the register API instead.");
    } catch(e){ console.error(e); alert("Install failed: "+e.message); }
  });

  // --- Demo trusted module: HUD Clock (trusted runs in-page) ---
  demoBtn.addEventListener("click", ()=>{
    const meta = { id: "demo_hud_clock", name: "HUD Clock", enabled: true };
    const handlers = {
      onEnable(){ this._el = document.createElement("div"); Object.assign(this._el.style, { position:'fixed', left:'8px', top:'8px', padding:'6px 8px', background:'rgba(0,0,0,0.4)', color:'#9ef', borderRadius:'6px', zIndex:999998, fontFamily:'monospace'}); document.body.appendChild(this._el); this._tick = ()=>{ this._el.textContent = (new Date()).toLocaleTimeString(); }; this._int = setInterval(this._tick, 1000); this._tick(); },
      onDisable(){ clearInterval(this._int); if(this._el) this._el.remove(); this._el = null; }
    };
    const m = manager.register(meta, handlers);
    if(meta.enabled) m.enable();
    renderList();
  });

  // --- Expose global API for trusted registration and simple module management ---
  window.ClientModules = {
    register: (meta, handlers) => { const m = manager.register(meta, handlers); if(meta.enabled) m.enable(); renderList(); return m; },
    unregister: (id) => { manager.unregister(id); renderList(); },
    list: () => manager.all(),
    bus,
    persist
  };

  // auto render initial list
  renderList();

  // handy console alias
  window.__EAGLER_MODULES = window.ClientModules;

  console.log("Module overlay loaded. Use window.ClientModules.register(...) to add trusted modules, or install from CDN via panel.");
})();
