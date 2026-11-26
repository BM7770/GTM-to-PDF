/* GTM to PDF — remote rules.
 * Reads GTM_CONFIG.remoteConfigUrl at start, every 6 hours and when the app
 * comes back to the foreground. The last copy is kept, so the rules also hold
 * offline. This is how a change you publish online (new minimum version,
 * login required, message) reaches apps that are already installed. */
const GTMRemote = (() => {
  const C = GTM_CONFIG, KEY = "gtm_remote";
  const DEFAULTS = { minVersion: "0", latestVersion: C.version, updateUrl: "", requireLogin: true, requireVerifiedEmail: true, message: "" };
  let cfg = { ...DEFAULTS }, listeners = [];
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}")) } catch (e) { }

  /** Compares dotted versions: -1, 0 or 1. */
  function cmp(a, b) {
    const x = String(a).split("."), y = String(b).split(".");
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (parseInt(x[i]) || 0) - (parseInt(y[i]) || 0); if (d) return d < 0 ? -1 : 1 }
    return 0;
  }
  /** Firebase Remote Config (client REST API): values come back as strings. */
  function instanceId() {
    try { let id = localStorage.getItem("gtm_iid"); if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, ""); localStorage.setItem("gtm_iid", id) } return id } catch (e) { return "gtm-anon" }
  }
  async function fetchRemoteConfig(signal) {
    const F = C.firebase;
    const r = await fetch(`https://firebaseremoteconfig.googleapis.com/v1/projects/${encodeURIComponent(F.projectId)}/namespaces/firebase:fetch?key=${encodeURIComponent(F.apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ appId: F.appId, appInstanceId: instanceId() }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(), e = j.entries || {}, out = {};
    const bool = v => String(v).trim().toLowerCase() !== "false";
    for (const k of ["minVersion", "latestVersion", "updateUrl", "message"]) if (e[k] !== undefined) out[k] = String(e[k]).trim();
    for (const k of ["requireLogin", "requireVerifiedEmail"]) if (e[k] !== undefined) out[k] = bool(e[k]);
    return out;
  }
  async function refresh() {
    const useRC = C.remoteConfig && C.firebase && C.firebase.apiKey && C.firebase.appId;
    if (!useRC && !C.remoteConfigUrl) return cfg;
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 7000);
      let j = null;
      if (useRC) j = await fetchRemoteConfig(ctl.signal);
      else {
        const r = await fetch(C.remoteConfigUrl + (C.remoteConfigUrl.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store", signal: ctl.signal });
        if (r.ok) j = await r.json();
      }
      clearTimeout(tm);
      if (j) {
        cfg = { ...DEFAULTS, ...j };
        try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch (e) { }
        listeners.forEach(f => f(cfg));
      }
    } catch (e) { /* offline: keep the last known rules */ }
    return cfg;
  }
  function start() {
    setInterval(refresh, 6 * 3600 * 1000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh() });
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener("appStateChange", s => { if (s && s.isActive) refresh() });
    return refresh();
  }
  return {
    start, refresh, get: () => cfg, onChange: f => listeners.push(f),
    mustUpdate: () => cmp(C.version, cfg.minVersion) < 0,
    hasUpdate: () => cmp(C.version, cfg.latestVersion) < 0,
    version: C.version,
  };
})();
