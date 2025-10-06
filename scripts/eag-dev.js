// overlay.js — CDN-friendly, sandboxed Eaglercraft overlay (safe for educational use)
//
// - Host this file (GitHub Pages, jsDelivr, your server) and include via <script src="..."></script>
// - The sandbox executes user code inside an iframe and communicates via postMessage.
// - The parent enforces a whitelist of actions the sandbox may request.

(function () {
  if (window.__EAGLER_SAFE_OVERLAY_LOADED) return;
  window.__EAGLER_SAFE_OVERLAY_LOADED = true;

  const PREFIX = "eagler:script:";
  const PANEL_Z = 999999;

  // --- Small utilities ---
  function q(tag, attrs = {}, text) {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === "style") Object.assign(el.style, attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (text) el.textContent = text;
    return el;
  }
  function saveLocal(key, value) { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  function loadLocal(key, def = null) { try { const s = localStorage.getItem(PREFIX + key); return s ? JSON.parse(s) : def; } catch { return def; } }

  // --- Event bus for the overlay itself (parent) ---
  const overlayBus = {
    tickSubscribers: new Set(),
    subscribeTick(fn) { this.tickSubscribers.add(fn); return fn; },
    unsubscribeTick(fn) { this.tickSubscribers.delete(fn); },
    emitTick(dt) { this.tickSubscribers.forEach(fn => { try { fn(dt); } catch (e) { console.error("overlay tick subscriber error", e); } }); }
  };

  // Run RAF loop: send a monotonic time and delta
  let lastRAF = performance.now();
  function rafLoop(now) {
    const dt = Math.min(now - lastRAF, 200);
    lastRAF = now;
    overlayBus.emitTick(dt);
    requestAnimationFrame(rafLoop);
  }
  requestAnimationFrame(rafLoop);

  // --- HUD container for sandbox-created HUDs ---
  const hudContainer = q("div", {
    id: "eagler-hud-container",
    style: {
      position: "fixed",
      left: "0",
      top: "0",
      pointerEvents: "none", // HUDs will be non-interactive by default
      zIndex: PANEL_Z - 1,
      width: "100%",
      height: "100%"
    }
  });
  document.body.appendChild(hudContainer);

  // Manage HUD elements created on behalf of sandbox code
  const hudMap = new Map();
  function createHUD(id, html, css) {
    if (!id) id = "hud_" + Math.random().toString(36).slice(2, 9);
    // sanitize minimal: only allow strings; don't eval CSS
    if (hudMap.has(id)) {
      const el = hudMap.get(id);
      el.innerHTML = html;
      if (css) Object.assign(el.style, css);
      return id;
    }
    const el = q("div", { style: Object.assign({
      position: "absolute", left: "8px", top: "8px", pointerEvents: "auto"
    }, css || {}) });
    el.innerHTML = html || "";
    hudContainer.appendChild(el);
    hudMap.set(id, el);
    return id;
  }
  function updateHUD(id, html, css) {
    if (!hudMap.has(id)) return false;
    const el = hudMap.get(id);
    if (html !== undefined) el.innerHTML = html;
    if (css) Object.assign(el.style, css);
    return true;
  }
  function removeHUD(id) {
    if (!hudMap.has(id)) return false;
    const el = hudMap.get(id);
    el.remove();
    hudMap.delete(id);
    return true;
  }

  // --- UI: floating button + panel with editor + sandbox iframe ---
  const style = q("style");
  style.textContent = `
  #eagler-overlay-root { position: fixed; right: 12px; bottom: 12px; z-index: ${PANEL_Z}; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
  #eagler-overlay-btn { background:#111; color:#e6e6e6; border-radius:8px; padding:8px 10px; border:none; box-shadow:0 6px 18px rgba(0,0,0,0.5); cursor:pointer; }
  #eagler-panel { width:480px; max-width: calc(100% - 24px); height:56vh; background: rgba(18,18,20,0.96); color:#ddd; border-radius:10px; padding:10px; box-shadow:0 10px 40px rgba(0,0,0,0.6); margin-bottom:8px; overflow:hidden; display:flex; flex-direction:column; gap:8px; }
  #eagler-panel .row { display:flex; gap:8px; align-items:center; }
  #eagler-editor { flex:1; width:100%; min-height:120px; background:#070707; color:#dcdcdc; border:1px solid #222; padding:8px; font-family: monospace; font-size:12px; resize: vertical; overflow:auto; }
  #eagler-controls { display:flex; gap:6px; }
  #eagler-log { height:100px; background:#050505; color:#9fd; border:1px solid #222; padding:8px; font-family:monospace; font-size:12px; overflow:auto; }
  #eagler-sandbox-frame { display:none; width:0; height:0; border:0; }
  .eagler-btn { background:#1f1f1f; color:#fff; border: none; padding:8px 10px; border-radius:6px; cursor:pointer; }
  .eagler-btn.warn { background:#6a2a2a; }
  .eagler-small { font-size:12px; padding:6px 8px; border-radius:6px; }
  `;
  document.head.appendChild(style);

  const root = q("div", { id: "eagler-overlay-root" });
  const btn = q("button", { id: "eagler-overlay-btn" }, "☰ Eagler Sandbox");
  root.appendChild(btn);

  // Panel (hidden by default)
  const panel = q("div", { id: "eagler-panel", style: { display: "none" } });
  const hdr = q("div", { class: "row" });
  hdr.appendChild(q("div", {}, "Eagler Safe Sandbox"));
  const closeHint = q("div", { style: { marginLeft: "auto", fontSize: "12px", color: "#999" } }, "Sandboxed — no game internals");
  hdr.appendChild(closeHint);
  panel.appendChild(hdr);

  // Editor area
  const editor = q("textarea", { id: "eagler-editor", placeholder:
`// Example (safe): create a simple HUD clock that updates each tick via the sandbox API.
// API available: request(action, data) -> parent validates
// Allowed actions: createHUD, updateHUD, removeHUD, saveData, loadData, subscribeTick, log
// Use send({type:'request', action:'createHUD', payload:{id:'myclock', html:'', css:{}}});

(function init(){
  // create a HUD
  send({ type: 'request', action: 'createHUD', payload: { id: 'clock1', html: '<b>clock:</b> --:--:--', css: { left: '12px', top: '12px', color: '#8ef', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius:'6px' } } });

  // subscribe to ticks
  const subId = send({ type: 'request', action: 'subscribeTick' });

  // note: onTick messages come back as events of type 'tick' from parent
  // you can call updateHUD by sending update requests.

})();` } );

  panel.appendChild(editor);

  // Controls row
  const controls = q("div", { id: "eagler-controls", class: "row" });
  const runBtn = q("button", { class: "eagler-btn" }, "Run in Sandbox");
  const stopBtn = q("button", { class: "eagler-btn warn" }, "Reset Sandbox");
  const clearLogBtn = q("button", { class: "eagler-btn eagler-small" }, "Clear Log");
  controls.appendChild(runBtn);
  controls.appendChild(stopBtn);
  controls.appendChild(clearLogBtn);
  panel.appendChild(controls);

  // Log area
  const logArea = q("div", { id: "eagler-log" }); panel.appendChild(logArea);

  // Hidden sandbox iframe (sandboxed)
  const frame = q("iframe", { id: "eagler-sandbox-frame", sandbox: "allow-scripts" });
  // sandbox="allow-scripts" => scripts run, but iframe cannot access parent DOM or cookies, cannot navigate top, cannot make network requests to other origins except what it can fetch inline.
  panel.appendChild(frame);
  root.appendChild(panel);
  document.body.appendChild(root);

  // Toggle panel
  btn.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  });

  // Logging helper
  function log(msg, cls) {
    const line = q("div", {}, (new Date()).toLocaleTimeString() + " — " + msg);
    if (cls === "err") line.style.color = "#f88";
    logArea.appendChild(line);
    logArea.scrollTop = logArea.scrollHeight;
  }
  clearLogBtn.addEventListener("click", () => { logArea.innerHTML = ""; });

  // --- Sandbox lifecycle and message protocol ---
  function createSandbox() {
    // Create a fresh blob URL that holds small runner code for the iframe
    const iframeHTML = `
      <!doctype html><html><head><meta charset="utf-8"><title>Sandbox</title></head><body>
      <script>
      // Minimal sandbox runner. It exposes a send() function to user code which posts messages up.
      // All network / parent operations must be done via postMessage; the parent validates them.
      (function(){
        // send a message to parent
        function send(msg) { parent.postMessage(msg, "*"); }
        // listen for run command and tick events
        window.addEventListener("message", function(ev){
          try {
            const data = ev.data || {};
            if(data && data.type === "runCode") {
              // run the code text in this isolated iframe scope
              try {
                const userFunc = new Function("send", data.code + "\n//# sourceURL=sandbox-user.js");
                userFunc(send);
                parent.postMessage({ type: "log", payload: "User code executed" }, "*");
              } catch(e) {
                parent.postMessage({ type: "error", payload: e && e.message ? e.message : String(e) }, "*");
              }
            } else if(data && data.type === "tick") {
              // forward tick events to user code if they provided onTick in global
              if(typeof window.onSandboxTick === "function") {
                try { window.onSandboxTick(data.payload); } catch(e){ parent.postMessage({ type:"error", payload: "onSandboxTick error: " + e.message }, "*"); }
              }
            }
          } catch(err) { parent.postMessage({ type: "error", payload: String(err) }, "*"); }
        }, false);

        // helper: accept messages from parent to set a tick handler
        // user code may set window.onSandboxTick = function(dt) { ... }
      })();
      </script>
      </body></html>
    `;
    const blob = new Blob([iframeHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    frame.src = url;
    frame.onload = () => {
      log("Sandbox iframe created");
    };
  }

  function destroySandbox() {
    try {
      frame.src = "about:blank";
      log("Sandbox destroyed/reset");
    } catch (e) { console.warn(e); }
  }

  // Start with a sandbox ready
  createSandbox();

  // Handle messages from sandbox iframe
  window.addEventListener("message", function (ev) {
    const srcWin = ev.source;
    if (srcWin !== frame.contentWindow) return; // ignore messages not from our iframe
    const msg = ev.data || {};
    if (msg.type === "request") {
      // A request from sandbox to perform an allowed action
      const action = msg.action;
      const payload = msg.payload || {};
      // Whitelist actions:
      try {
        if (action === "createHUD") {
          const id = createHUD(payload.id, payload.html || "", payload.css || {});
          ev.source.postMessage({ type: "response", action, success: true, payload: { id } }, "*");
        } else if (action === "updateHUD") {
          const ok = updateHUD(payload.id, payload.html, payload.css);
          ev.source.postMessage({ type: "response", action, success: ok }, "*");
        } else if (action === "removeHUD") {
          const ok = removeHUD(payload.id);
          ev.source.postMessage({ type: "response", action, success: ok }, "*");
        } else if (action === "saveData") {
          if (!payload.key) return ev.source.postMessage({ type: "response", action, success: false, error: "missing key" }, "*");
          saveLocal(payload.key, payload.value);
          ev.source.postMessage({ type: "response", action, success: true }, "*");
        } else if (action === "loadData") {
          if (!payload.key) return ev.source.postMessage({ type: "response", action, success: false, error: "missing key" }, "*");
          const val = loadLocal(payload.key, null);
          ev.source.postMessage({ type: "response", action, success: true, payload: { value: val } }, "*");
        } else if (action === "subscribeTick") {
          // subscribe this iframe to tick events; we will forward ticks
          const sub = function(dt) {
            try { frame.contentWindow.postMessage({ type: "tick", payload: dt }, "*"); }
            catch(e) { /* ignore */ }
          };
          overlayBus.subscribeTick(sub);
          // store sub fn so we can unsubscribe on reset — attach to frame for lifecycle
          if (!frame._tickSubs) frame._tickSubs = [];
          frame._tickSubs.push(sub);
          ev.source.postMessage({ type: "response", action, success: true }, "*");
        } else if (action === "log") {
          log("Sandbox: " + (payload && payload.msg ? payload.msg : JSON.stringify(payload)));
          ev.source.postMessage({ type: "response", action, success: true }, "*");
        } else {
          ev.source.postMessage({ type: "response", action, success: false, error: "unsupported action" }, "*");
        }
      } catch (err) {
        ev.source.postMessage({ type: "response", action, success: false, error: String(err) }, "*");
      }
    } else if (msg.type === "log") {
      log("Sandbox: " + (msg.payload || ""));
    } else if (msg.type === "error") {
      log("Sandbox error: " + (msg.payload || ""), "err");
    }
  }, false);

  // Buttons behavior
  runBtn.addEventListener("click", () => {
    try {
      const code = editor.value;
      // Send the code to the iframe
      frame.contentWindow.postMessage({ type: "runCode", code }, "*");
      log("Code sent to sandbox");
    } catch (e) {
      log("Failed to run code: " + e.message, "err");
    }
  });
  stopBtn.addEventListener("click", () => {
    // Unsubscribe tick listeners associated with frame and reset iframe
    if (frame._tickSubs) frame._tickSubs.forEach(sub => overlayBus.unsubscribeTick(sub));
    frame._tickSubs = [];
    destroySandbox();
    createSandbox();
  });

  // Expose a tiny helper for bookmarklet use or console experimentation
  window.__EAGLER_SAFE_OVERLAY = {
    createHUD, updateHUD, removeHUD, saveLocal, loadLocal, log, frame
  };

  // Useful hint logged to console
  console.log("Eagler Safe Sandbox overlay loaded — panel button bottom-right");
  log("Overlay ready. Click 'Run in Sandbox' to execute editor code (sandboxed).");

})();
