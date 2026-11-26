/* GTM to PDF — application shell, screens and components. */
(() => {
  "use strict";
  const E = GTEngine, D = GTData, P = GTSheet, esc = P.esc;
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } },
    json(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  };

  /* ------------------------------------------------------------------ state */
  const LV = { "all": "var(--brand)", "1": "var(--lv1)", "2": "var(--lv2)", "3": "var(--lv3)", "4": "var(--lv4)" };
  const WORKS = ["gemara", "tanach", "mishnah"];
  const WNAME = { gemara: "wG", tanach: "wT", mishnah: "wM" };
  const WHE = { gemara: "גמרא", tanach: "תנ״ך", mishnah: "משנה" };
  const MAXU = { mishnah: 30, tanach: 200 }; // same limits as the Mishnah and Tanach websites
  let L = (() => { const v = store.get("gt_ui", null); if (v !== null && +v >= 0 && +v <= 6) return +v; const i = LC.indexOf((navigator.language || "en").slice(0, 2)); return i < 0 ? 1 : i })();
  const S = {
    lang: (v => LC.includes(v) ? v : "pt")(store.get("gt_target_lang", "pt")),
    lvl: "all", sort: store.get("gt_sort", "app"),
    opts: Object.assign({ ctx: false, tl: false, nek: false, two: true, alt: false }, store.json("gt_opts", {})),
    work: "gemara", src: "lib", text: "", ref: "", sel: "", fname: "", textWork: "", srcMsg: null, editing: false, loadingText: false,
    // Gemara selection
    m: store.get("gt_last_m", ""), daf: 2, amud: "a", rangeOn: false, daf2: 3, amud2: "a", first: "", second: "",
    // Mishnah / Tanach selection: chapter + unit (mishnah or verse); unit "" = whole chapter
    cv: { mishnah: { m: "", c1: "1", u1: "", rangeOn: false, c2: "", u2: "" }, tanach: { m: "", c1: "1", u1: "", rangeOn: false, c2: "", u2: "" } },
    result: null,
  };
  let levelCounts = null;

  /* ------------------------------------------------------------------- i18n */
  function t(k) { const a = APP_K[k] || SITE_K[k]; return a ? (a[L] || a[1] || a[0]) : k }
  function st(k, vars = {}) {
    const a = SITE_ST[k] || []; let out = a[L] || a[1] || a[0] || k;
    return out.replace(/\{(\w+)\}/g, (m, key) => { const v = vars[key]; if (v && typeof v === "object" && v.key) return st(v.key, v.vars || {}); return v === undefined ? "" : String(v) });
  }
  const nf = n => Number(n || 0).toLocaleString(LC[L]);
  const icon = (id, cls = "") => `<svg class="i ${cls}"><use href="#i-${id}"/></svg>`;
  const chev = () => icon("chev", "chev flip");
  const lvlLabel = v => ({ all: t("all"), "2": t("l2"), "3": t("l3"), "4": t("l4") }[v] || (t("level") + " " + v));
  const langName = c => LN[LC.indexOf(c)] || c;

  function applyLocale() {
    document.documentElement.lang = LC[L];
    document.documentElement.dir = LC[L] === "he" ? "rtl" : "ltr";
    document.querySelectorAll("[data-k]").forEach(e => e.textContent = t(e.dataset.k));
  }
  function setUI(i, syncTarget) {
    L = i; store.set("gt_ui", i);
    if (syncTarget) { S.lang = LC[i]; store.set("gt_target_lang", S.lang) }
    applyLocale(); route();
  }
  function setTheme(v) {
    store.set("gt_theme", v);
    const eff = v === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : v;
    document.documentElement.dataset.theme = eff;
    document.querySelector('meta[name="theme-color"]').content = eff === "light" ? "#14284b" : "#0f1f3c";
  }
  function saveOpts() { store.set("gt_opts", JSON.stringify(S.opts)); store.set("gt_sort", S.sort) }

  /* ------------------------------------------------------------- components */
  const langPill = () => `<button class="pill" id="hLang" type="button" aria-label="${esc(t("appLang"))}">${icon("globe")}<span>${LC[L].toUpperCase()}</span></button>`;
  function header(o) {
    const h = $("hdr");
    if (o.brand) {
      h.className = "hdr";
      h.innerHTML = `<div class="brand"><b>${t("appName")}</b><small>${esc(t("brandSub"))}</small></div>${langPill()}`;
    } else {
      h.className = "hdr" + (o.back ? "" : " big");
      h.innerHTML = `${o.back ? `<button class="icon-btn" id="hBack" type="button" aria-label="${esc(t("back"))}">${icon("back", "flip")}</button>` : ""}
        <div class="title">${esc(o.title)}${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</div>${o.right !== undefined ? o.right : langPill()}`;
      if (o.back) $("hBack").onclick = () => (typeof o.back === "string" ? go(o.back) : history.length > 1 ? history.back() : go("home"));
    }
    siteChrome(o);
    $("hLang") && ($("hLang").onclick = openAppLang);
  }
  /* Website layout (wide screens): side bar with brand, navigation and language; page title above the content. */
  function sideOpen(on) {
    document.body.classList.toggle("side-open", on);
    $("sMenu") && $("sMenu").setAttribute("aria-expanded", on ? "true" : "false");
  }
  function siteChrome(o) {
    const side = $("sside"), r = (location.hash.match(/^#\/(\w+)/) || [])[1] || "home", cur = tabOf[r] || "home";
    if (side) {
      const links = [["home", "home", "tabHome"], ["library", "books", "tabLib"], ["history", "clock", "tabHist"], ["about", "info", "n5"], ["more", "gear", "tabMore"]];
      side.innerHTML = `<a class="sbrand" href="#/home"><img src="icons/logo-128.png" alt=""><span><b>${esc(t("appName"))}</b><small>${esc(t("brandSub"))}</small></span></a>
        <a class="snew${cur === "translate" ? " on" : ""}" href="#/translate">${icon("plus")}<span>${esc(t("newTr"))}</span></a>
        <nav class="snav">${links.map(([k, ic, lab]) => `<a href="#/${k}" class="${(k === "about" ? r === "about" : k === cur && r !== "about") ? "on" : ""}">${icon(ic)}<span>${esc(t(lab))}</span></a>`).join("")}</nav>
        <button class="slang" id="sLang" type="button">${icon("globe")}<span>${esc(LN[L])}</span>${icon("down")}</button>`;
      $("sLang").onclick = openAppLang;
      side.querySelectorAll("a").forEach(x => x.addEventListener("click", () => sideOpen(false)));
    }
    const top = $("stop");
    if (top && !top.dataset.ready) {
      top.dataset.ready = "1";
      top.innerHTML = `<button class="sburger" id="sMenu" type="button" aria-label="Menu" aria-controls="sside" aria-expanded="false">${icon("bars")}</button>
        <a class="sbrand" href="#/home"><img src="icons/logo-128.png" alt=""><span><b>${esc(t("appName"))}</b><small>${esc(t("brandSub"))}</small></span></a>`;
      $("sMenu").onclick = () => sideOpen(!document.body.classList.contains("side-open"));
      $("sscrim").onclick = () => sideOpen(false);
      addEventListener("keydown", e => { if (e.key === "Escape") sideOpen(false) });
      // A row of options that scrolls sideways also follows the mouse wheel.
      document.addEventListener("wheel", e => {
        const row = e.target.closest && e.target.closest(".chips:not(.wrap)");
        if (!row || row.scrollWidth <= row.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = row.scrollWidth - row.clientWidth;
        if ((e.deltaY < 0 && row.scrollLeft <= 0) || (e.deltaY > 0 && row.scrollLeft >= max - 1)) return;
        row.scrollLeft += e.deltaY; e.preventDefault();
      }, { passive: false });
    }
    const pt = $("ptitle"); if (!pt) return;
    pt.innerHTML = o.brand ? "" : `${o.back ? `<button class="icon-btn" id="pBack" type="button" aria-label="${esc(t("back"))}">${icon("back", "flip")}</button>` : ""}<div><h1>${esc(o.title || "")}</h1>${o.sub ? `<p>${esc(o.sub)}</p>` : ""}</div>`;
    if (o.back) $("pBack").onclick = () => (typeof o.back === "string" ? go(o.back) : history.length > 1 ? history.back() : go("home"));
  }

  function cta(html) {
    // On the results page the buttons (View PDF, Download) sit at the top, above the word list.
    const top = /^#\/results/.test(location.hash) && $("ctaTop");
    if (top) { top.innerHTML = html ? `<div class="cta">${html}</div>` : ""; $("ctaHost").innerHTML = ""; $("view").classList.remove("has-cta"); return }
    $("ctaHost").innerHTML = html ? `<div class="cta">${html}</div>` : ""; $("view").classList.toggle("has-cta", !!html);
  }

  let sheetClose = null;
  function openSheet(title, html, mount) {
    const bs = $("bs"), sc = $("scrim");
    $("bsTitle").textContent = title; $("bsBody").innerHTML = html; $("bsBody").scrollTop = 0;
    bs.hidden = sc.hidden = false;
    requestAnimationFrame(() => { bs.classList.add("show"); sc.classList.add("show") });
    sheetClose = () => { bs.classList.remove("show"); sc.classList.remove("show"); setTimeout(() => { bs.hidden = sc.hidden = true; $("bsBody").innerHTML = "" }, 260); sheetClose = null };
    mount && mount($("bsBody"));
  }
  const closeSheet = () => sheetClose && sheetClose();
  $("scrim").onclick = closeSheet; $("bsClose").onclick = closeSheet;

  let toastT = null;
  function toast(msg, action) {
    const el = $("toast"), b = $("toastAct");
    $("toastMsg").textContent = msg;
    b.hidden = !action; if (action) { b.textContent = action.label; b.onclick = () => { action.run(); el.classList.remove("show") } }
    el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), action ? 5000 : 2800);
  }
  function optionList(items, cur, onPick) {
    return [`<div class="list">${items.map(([v, label, sub]) => `<button class="row" data-v="${esc(v)}" type="button"><div class="rt"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>${String(v) === String(cur) ? `<span class="rv" style="color:var(--brand)">${icon("check")}</span>` : ""}</button>`).join("")}</div>`,
    body => body.querySelectorAll(".row").forEach(r => r.onclick = () => { closeSheet(); onPick(r.dataset.v) })];
  }
  function openAppLang() {
    const [html, mount] = optionList(LN.map((n, i) => [i, n, LC[i].toUpperCase()]), L, v => setUI(+v, true));
    openSheet(t("appLang"), html, mount);
  }
  function openTargetLang(after) {
    const [html, mount] = optionList(LC.map((c, i) => [c, LN[i], c.toUpperCase()]), S.lang, v => { S.lang = v; store.set("gt_target_lang", v); after ? after() : route() });
    openSheet(t("trLang"), html, mount);
  }
  function openTheme() {
    const cur = store.get("gt_theme", "dark");
    const [html, mount] = optionList([["dark", t("dark")], ["light", t("light")], ["system", t("system")]], cur, v => { setTheme(v); route() });
    openSheet(t("theme"), html, mount);
  }
  function rangeLabel(x) { return x.first && x.last ? `${x.first}–${x.last}` : "" }
  /** Short description of a library item (Gemara: daf range; others: number of chapters). */
  function itemSub(w, x) {
    if (w === "gemara") return `${rangeLabel(x)} · ${nf(x.amudim)} ${t("amudim")}${x.imported ? " · " + t("imported") : ""}`;
    const n = Object.keys(x.chapters || {}).length; return `${nf(n)} ${t("chaptersN")}`;
  }
  const trItem = (w, x, on) => `<button class="tr-item${on ? " on" : ""}" data-w="${w}" data-m="${esc(x.m)}" type="button"><div class="meta"><b>${esc(x.m)}</b><small>${esc(itemSub(w, x))}</small></div><span class="hn">${esc(x.he || "")}</span>${chev()}</button>`;

  /* ----------------------------------------------------------------- router */
  const routes = { home: vHome, library: vLibrary, translate: vChoose, gemara: el => vTranslate(el, "gemara"), mishnah: el => vTranslate(el, "mishnah"), tanach: el => vTranslate(el, "tanach"), results: vResults, pdf: vPdf, history: vHistory, more: vMore, about: vAbout };
  const tabOf = { home: "home", library: "library", translate: "translate", gemara: "translate", mishnah: "translate", tanach: "translate", results: "translate", pdf: "translate", history: "history", more: "more", about: "more" };
  function go(r) { if (location.hash !== "#/" + r) location.hash = "#/" + r; else route() }
  function route() {
    let r = (location.hash.match(/^#\/(\w+)/) || [])[1] || "home";
    if (!routes[r]) r = "home";
    if ((r === "results" || r === "pdf") && !S.result) r = "translate";
    closeSheet(); cta("");
    const g = gate();
    $("tabbar").style.display = g ? "none" : "";
    document.querySelectorAll("#tabbar a").forEach(a => a.classList.toggle("on", a.dataset.tab === tabOf[r]));
    const v = $("view"); v.className = "sheet r-" + (g ? "gate" : r); v.innerHTML = `<div class="ptitle" id="ptitle"></div><div id="ctaTop"></div><div class="screen" id="scr"></div>`;
    document.body.classList.toggle("gated", !!g);
    if (g) { vGate(g, $("scr")); route.last = "gate:" + g; return }
    routes[r]($("scr"));
    if (route.last !== r) window.scrollTo(0, 0);
    route.last = r;
  }
  addEventListener("hashchange", route);

  /* ------------------------------------------------------------------- home */
  function vHome(el) {
    header({ brand: true });
    const hist = allHistory();
    el.innerHTML = `
      <section class="hero">
        <h1 class="display">${esc(t("heroT"))}</h1>
        <p>${esc(t("heroS"))}</p>
        <a class="btn primary" href="#/translate">${icon("plus")}<span>${esc(t("newTr"))}</span></a>
        <div class="stat-row">
          <span class="badge gold">${esc(t("wG"))}</span><span class="badge gold">${esc(t("wT"))}</span><span class="badge gold">${esc(t("wM"))}</span>
          <span class="badge">7 ${esc(t("langs"))}</span>
        </div>
      </section>
      <div class="sec"><h2 class="h2">${esc(t("quick"))}</h2></div>
      <div class="tiles">
        <a class="tile" href="#/library"><span class="ti">${icon("books")}</span><div><b>${esc(t("tabLib"))}</b><small>${esc(t("wG"))} · ${esc(t("wT"))} · ${esc(t("wM"))}</small></div></a>
        <button class="tile" id="tUp" type="button"><span class="ti">${icon("upload")}</span><div><b>${esc(t("n3"))}</b><small>${esc(t("upSub"))}</small></div></button>
        <a class="tile" href="#/history"><span class="ti">${icon("clock")}</span><div><b>${esc(t("tabHist"))}</b><small>${nf(hist.length)} ${esc(t("items"))}</small></div></a>
        <a class="tile" href="#/about"><span class="ti">${icon("info")}</span><div><b>${esc(t("n5"))}</b><small>${esc(t("aboutSub"))}</small></div></a>
      </div>
      <div class="sec"><h2 class="h2">${esc(t("recent"))}</h2>${hist.length ? `<a class="link" href="#/history">${esc(t("viewAll"))}${chev()}</a>` : ""}</div>
      ${hist.length ? `<div class="hscroll">${hist.slice(0, 8).map((x, i) => `<button class="rcard" data-i="${i}" type="button"><div class="meta"><b>${esc(histTitle(x))}</b><small>${esc(histWhen(x))}</small><div class="badges"><span class="badge gold">${esc(t(WNAME[x.work || "gemara"]))}</span><span class="badge brand">${esc((x.lang || "").toUpperCase())}</span><span class="badge">${nf(x.n)} ${esc(t("words"))}</span></div></div></button>`).join("")}</div>`
        : `<div class="card muted">${esc(t("emptyRecent"))}</div>`}`;
    $("tUp").onclick = () => { S.src = "up"; go("translate") };
    el.querySelectorAll(".rcard").forEach(b => b.onclick = () => reopen(hist[+b.dataset.i]));
  }

  /* --------------------------------------------------------- work chooser */
  function vChoose(el) {
    header({ title: t("newTr"), sub: t("chooseWork") });
    const img = { gemara: "talmud", tanach: "tanach", mishnah: "mishnah" };
    el.innerHTML = `<div class="works">${WORKS.map(w => `<a class="work" href="#/${w}"><span class="wimg" style="background-image:url(img/${img[w]}.jpg)"></span><span class="hn">${WHE[w]}</span><b>${esc(t(WNAME[w]))}</b></a>`).join("")}</div>`;
  }

  /* ---------------------------------------------------------------- library */
  let libKind = "gemara";
  function groupsOf(w) {
    if (w === "tanach") return D.SECTIONS.map(([k, n, he]) => [k, n, he]);
    const g = D.SEDARIM.map(([k, key, he]) => [k, t(key), he]);
    return w === "gemara" ? [...g, ["", t("imported"), ""]] : g;
  }
  function vLibrary(el) {
    el.innerHTML = `<div class="seg" id="lkind">${WORKS.map(k => `<button type="button" data-k="${k}" class="${k === libKind ? "on" : ""}">${esc(t(WNAME[k]))}</button>`).join("")}</div><div id="lbody"></div>`;
    $("lkind").onclick = e => {
      const b = e.target.closest("button"); if (!b || b.dataset.k === libKind) return;
      libKind = b.dataset.k; $("lkind").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); libBody();
    };
    libBody();
  }
  /** Header + search + list for the selected work (only this part animates on tab change). */
  function libBody() {
    const all = D.sorted(libKind);
    header({ title: t("tabLib"), sub: `${t(WNAME[libKind])} · ${nf(all.length)} ${t(libKind === "tanach" ? "books" : "tractates")}` });
    let q = "", grp = "";
    $("lbody").innerHTML = `<label class="search" style="margin-top:12px">${icon("search")}<input id="lq" type="search" placeholder="${esc(t(libKind === "tanach" ? "srchAny" : "srch"))}" autocomplete="off"></label>
      <div class="chips" id="lch" style="margin-top:12px"></div><div id="llist" style="margin-top:6px"></div>
      <div class="sec"><span class="eyebrow">${esc(t("addFile"))}</span></div>
      <button class="drop" id="lAdd" type="button">${icon("upload")}<span>${esc(t("addFile"))}</span><small class="muted">${esc(t("upn"))}</small></button>
      ${libKind === "gemara" ? `<button class="btn ghost sm block" id="lCsv" type="button" style="margin-top:10px">${icon("db")}${esc(t("pickCsv"))}</button>` : ""}`;
    $("lAdd").onclick = () => { S.work = libKind; S.src = "up"; pickTxtFor = libKind; $("fTxt").click() };
    $("lCsv") && ($("lCsv").onclick = () => $("fCsv").click());
    const groups = groupsOf(libKind).filter(([k]) => all.some(x => (x.grp || "") === k));
    const drawChips = () => $("lch").innerHTML = [["", t("allSedarim")], ...groups.map(([k, n]) => [k, n])].map(([k, n]) => `<button class="chip${k === grp ? " on" : ""}" data-k="${k}" type="button">${esc(n)}</button>`).join("");
    const draw = () => {
      $("llist").innerHTML = groupedItems(libKind, all, q, grp) || `<div class="empty">${icon("search")}<b>${esc(t("noResults"))}</b></div>`;
      $("llist").querySelectorAll(".tr-item").forEach(b => b.onclick = () => { selectItem(b.dataset.w, b.dataset.m); S.src = "lib"; go(b.dataset.w) });
    };
    $("lq").oninput = e => { q = e.target.value; draw() };
    $("lch").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; grp = b.dataset.k; drawChips(); draw() };
    drawChips(); draw();
  }
  /** List items grouped by Seder (Gemara, Mishnah) or Torah / Nevi'im / Ketuvim (Tanach). */
  function groupedItems(w, all, q, grp) {
    const ql = (q || "").trim().toLowerCase();
    const items = all.filter(x => (!grp || (x.grp || "") === grp) && (!ql || x.m.toLowerCase().includes(ql) || (x.he || "").includes((q || "").trim())));
    let html = "";
    for (const [k, name, he] of groupsOf(w)) {
      const g = items.filter(x => (x.grp || "") === k); if (!g.length) continue;
      html += `<div class="group-t"><span class="eyebrow">${esc(name)}</span><span class="he">${esc(he)}</span></div>` + g.map(x => trItem(w, x, x.m === curM(w))).join("");
    }
    return html;
  }
  const curM = w => w === "gemara" ? S.m : S.cv[w].m;
  function selectItem(w, m) {
    if (w === "gemara") return selectTractate(m);
    if (!D.get(w, m)) return;
    const ch = Object.keys(D.chapters(w, m)).map(Number).sort((a, b) => a - b);
    Object.assign(S.cv[w], { m, c1: String(ch[0] || 1), u1: "", rangeOn: false, c2: "", u2: "" });
    if (S.textWork === w) { S.text = ""; S.textWork = "" }
  }
  function selectTractate(m) {
    const x = D.get("gemara", m); if (!x) return;
    S.m = m; store.set("gt_last_m", m);
    S.daf = parseInt(x.first) || 2; S.amud = (x.first || "2a").slice(-1);
    S.daf2 = Math.min(S.daf + 1, parseInt(x.last) || S.daf); S.amud2 = "a"; S.rangeOn = false;
    if (S.textWork === "gemara") { S.text = ""; S.textWork = "" }
  }

  /* -------------------------------------------------------------- translate */
  const matcher = w => w === "mishnah" ? E.matchTextMishnah : w === "tanach" ? E.matchTextTanach : E.matchText;
  async function loadRaw() {
    const w = S.work;
    const m = curM(w); if (!m || !D.get(w, m)) return;
    S.loadingText = true; S.srcMsg = { key: "loadingText", app: true }; paintSrc();
    try {
      const d = await D.text(w, m);
      if (m !== curM(w) || w !== S.work) return;
      if (w === "gemara") {
        const { keys, capped } = E.rangeKeys(S.daf, S.amud, S.rangeOn ? S.daf2 : null, S.amud2);
        const got = keys.filter(k => d[k]);
        if (!got.length) { S.text = ""; S.ref = ""; S.srcMsg = { key: "pageMissing", warn: true } }
        else {
          S.text = got.map(k => d[k]).join("\n\n");
          S.ref = m + " " + (got.length > 1 ? got[0] + "–" + got[got.length - 1] : got[0]);
          S.first = got[0]; S.second = got.length > 1 ? got[got.length - 1] : "";
          S.sel = ""; S.fname = P.fileBase(m, S.first, S.second);
          S.srcMsg = { key: "pageLoaded", vars: { ref: S.ref, note: capped ? { key: "pageLimit" } : "" } };
        }
      } else {
        const c = S.cv[w];
        const { sel, capped } = E.selectCV(d, c.c1, c.u1, c.rangeOn ? c.c2 : "", c.rangeOn ? c.u2 : "", MAXU[w]);
        if (!sel.length) { S.text = ""; S.ref = ""; S.srcMsg = { key: "pageMissing", warn: true } }
        else {
          S.text = sel.map(x => d[x.k]).join(w === "mishnah" ? "\n\n" : "\n");
          const f = sel[0], l = sel[sel.length - 1];
          S.ref = m + " " + f.c + ":" + f.n + (sel.length > 1 ? "–" + (l.c !== f.c ? l.c + ":" : "") + l.n : "");
          const unit = t(w === "mishnah" ? "unitM" : "unitV");
          S.sel = [`${t(w === "mishnah" ? "tractateL" : "bookL")}: ${m}`, f.c === l.c ? `${t("chapterL")} ${f.c}, ${unit} ${f.n}${sel.length > 1 ? "–" + l.n : ""}` : `${t("chapterL")} ${f.c}:${f.n} – ${l.c}:${l.n}`].join(" · ");
          S.fname = w === "mishnah"
            ? ("Mishnah to PDF - " + m + " - P" + (c.c1 || "-") + "M" + (c.u1 || "-") + (c.rangeOn && (c.c2 || c.u2) ? "-P" + (c.c2 || "-") + "M" + (c.u2 || "-") : "")).replace(/[\\/:*?"<>|]/g, "-").trim()
            : ("Tanach to PDF - " + m + " - C" + (c.c1 || "-") + "V" + (c.u1 || "-")).replace(/[\\/:*?"<>|]/g, "-").trim();
          S.srcMsg = { key: "pageLoaded", vars: { ref: S.ref, note: capped ? { key: "pageLimit" } : "" } };
        }
      }
      S.textWork = w;
    } catch (e) { S.text = ""; S.srcMsg = { key: "tractateMissing", vars: { m }, warn: true } }
    S.loadingText = false; paintSrc(); paintText(); recount();
  }
  function srcMsgHtml() {
    const s = S.srcMsg; if (!s) return "";
    const txt = s.app ? t(s.key) : st(s.key, s.vars);
    return `<div class="status${s.warn ? " warn" : ""}">${icon(s.warn ? "alert" : "info")}<span>${esc(txt)}</span></div>`;
  }
  function paintSrc() { const h = $("srcMsg"); if (h) h.innerHTML = srcMsgHtml() }
  function paintText() {
    const h = $("txtBox"); if (!h) return;
    const n = E.norm(S.text).split(/\s+/).filter(Boolean).length;
    $("txtCount").textContent = S.text ? `${nf(n)} ${t("words")}` : ""; $("txtCount").hidden = !S.text;
    if (S.editing || S.src === "up") {
      if (!h.querySelector("textarea")) {
        h.innerHTML = `<textarea class="txt" id="txt" dir="rtl" lang="he" placeholder="${esc(t("ph"))}"></textarea>`;
        const ta = $("txt"); ta.value = S.text;
        ta.oninput = () => { S.text = ta.value; S.textWork = S.work; $("txtCount").textContent = `${nf(E.norm(S.text).split(/\s+/).filter(Boolean).length)} ${t("words")}`; $("txtCount").hidden = !S.text; recountSoon() };
      }
    } else h.innerHTML = S.text ? `<div class="preview-text" lang="he">${esc(S.text.slice(0, 600))}</div>` : `<div class="muted small">${esc(t("ph"))}</div>`;
  }
  let rcT = null;
  const recountSoon = () => { clearTimeout(rcT); rcT = setTimeout(recount, 300) };
  function recount() {
    const lex = D.lex(S.work); levelCounts = null;
    if (lex && S.text.trim()) { try { const r = matcher(S.work)(lex, S.text); levelCounts = { all: r.words.length }; ["2", "3", "4"].forEach(v => levelCounts[v] = E.pick(r.words, v).length) } catch (e) { } }
    document.querySelectorAll(".lvl").forEach(b => { const n = b.querySelector(".n"); if (n) n.textContent = levelCounts ? nf(levelCounts[b.dataset.v]) : "" });
  }

  function vTranslate(el, w) {
    if (S.work !== w) { S.work = w; S.editing = false; }
    if (S.textWork && S.textWork !== w) { S.text = ""; S.ref = ""; S.sel = ""; S.srcMsg = null; S.textWork = "" }
    header({ back: "translate", title: t(WNAME[w]), sub: t("newTr") });
    D.vocab(w).then(() => { if (route.last === w) recount() });
    if (!curM(w) || !D.get(w, curM(w))) { const first = D.sorted(w)[0]; if (first) selectItem(w, first.m) }
    const x = D.get(w, curM(w)) || {};
    const opt = (vals, cur, blank) => (blank ? `<option value=""${!cur ? " selected" : ""}>${esc(blank)}</option>` : "") + vals.map(d => `<option value="${d}"${String(d) === String(cur) ? " selected" : ""}>${d}</option>`).join("");
    const stepper = (id, inner, label) => `<div class="stepper"><button type="button" data-step="${id}" data-d="-1" aria-label="-">${icon("chev", "mirror")}</button><select id="${id}" class="${/^u/.test(id) ? "u" : ""}" aria-label="${esc(label)}">${inner}</select><button type="button" data-step="${id}" data-d="1" aria-label="+">${icon("chev", "flip")}</button></div>`;
    const ab = (id, cur) => `<div class="ab" data-ab="${id}"><button type="button" data-v="a" class="${cur === "a" ? "on" : ""}">A · א</button><button type="button" data-v="b" class="${cur === "b" ? "on" : ""}">B · ב</button></div>`;
    const sw = (k, label) => `<label class="opt-row"><span>${esc(label)}</span><span class="switch"><input type="checkbox" data-o="${k}"${S.opts[k] ? " checked" : ""}><i></i></span></label>`;
    const lvls = [["all", "lvlAllSub", "var(--brand)"], ["2", "lvl2Sub", "var(--lv2)"], ["3", "lvl3Sub", "var(--lv3)"], ["4", "lvl4Sub", "var(--lv4)"]];
    let rangeOn, rangeHtml, maxNote, rangeLbl = t("rangeOn");
    if (w === "gemara") {
      const dafs = D.dafRange(S.m);
      rangeOn = S.rangeOn; maxNote = t("maxAmudim");
      rangeHtml = `<div><span class="field-l">${esc(t("from").replace(":", ""))}</span>${stepper("daf", opt(dafs, S.daf), t("daf"))}${ab("amud", S.amud)}</div>
        <div ${rangeOn ? "" : 'style="opacity:.45"'} id="toCol"><span class="field-l">${esc(t("until").replace(":", ""))}</span>${stepper("daf2", opt(dafs, S.daf2), t("daf"))}${ab("amud2", S.amud2)}</div>`;
    } else {
      const c = S.cv[w], chs = D.chapters(w, c.m), chList = Object.keys(chs).map(Number).sort((a, b) => a - b);
      const units = ch => Array.from({ length: chs[ch] || 0 }, (_, i) => i + 1);
      const unitL = t(w === "mishnah" ? "unitM1" : "unitV1");
      rangeOn = c.rangeOn; maxNote = t(w === "mishnah" ? "maxM" : "maxV"); rangeLbl = t("rangeCh");
      rangeHtml = `<div><span class="field-l">${esc(t("from").replace(":", ""))}</span>${stepper("c1", opt(chList, c.c1), t("chapterL"))}<span class="field-l" style="margin-top:8px">${esc(unitL)}</span>${stepper("u1", opt(units(c.c1), c.u1, t("wholeCh")), unitL)}</div>
        <div ${rangeOn ? "" : 'style="opacity:.45"'} id="toCol"><span class="field-l">${esc(t("until").replace(":", ""))}</span>${stepper("c2", opt(chList, c.c2 || c.c1), t("chapterL"))}<span class="field-l" style="margin-top:8px">${esc(unitL)}</span>${stepper("u2", opt(units(c.c2 || c.c1), c.u2, t("wholeCh")), unitL)}</div>`;
    }
    const sub = w === "gemara" ? `<bdi lang="he" class="he">${esc(x.he || "")}</bdi>${x.first ? " · <bdi>" + esc(rangeLabel(x)) + "</bdi>" : ""}` : `<bdi lang="he" class="he">${esc(x.he || "")}</bdi> · ${esc(itemSub(w, x))}`;

    el.innerHTML = `
      <section class="card">
        <div class="card-hd"><span class="num">1</span><h2 class="h2">${esc(t("source"))}</h2></div>
        <div class="seg" id="srcSeg"><button type="button" data-s="lib" class="${S.src === "lib" ? "on" : ""}">${icon("books")}${esc(t("mLib"))}</button><button type="button" data-s="up" class="${S.src === "up" ? "on" : ""}">${icon("upload")}${esc(t("n3"))}</button></div>
        <div id="srcLib" ${S.src === "lib" ? "" : "hidden"} style="margin-top:14px">
          <button class="picker" id="pickT" type="button"><div class="meta"><b>${esc(curM(w) || t("chooseTr"))}</b><small>${sub}</small></div>${icon("down")}</button>
          <div class="range" style="margin-top:14px">${rangeHtml}</div>
          <label class="opt-row" style="margin-top:6px"><span>${esc(rangeLbl)} <small class="muted">· ${esc(maxNote)}</small></span><span class="switch"><input type="checkbox" id="rangeOn"${rangeOn ? " checked" : ""}><i></i></span></label>
        </div>
        <div id="srcUp" ${S.src === "up" ? "" : "hidden"} style="margin-top:14px">
          <button class="drop" id="dropTxt" type="button">${icon("file")}<span>${esc(t("pickTxt"))}</span><small class="muted">${esc(t("upn"))}</small></button>
          ${w === "gemara" ? `<button class="btn ghost sm block" id="impCsv" type="button" style="margin-top:10px">${icon("db")}${esc(t("pickCsv"))}</button>` : ""}
          <div class="status">${icon("paste")}<span>${esc(t("pasteHint"))}</span></div>
        </div>
        <div id="srcMsg">${srcMsgHtml()}</div>
        <div class="divider"></div>
        <div class="lbl-row"><span class="eyebrow">${esc(t("reviewText"))}</span><span class="badge gold" id="txtCount"></span>
          ${S.src === "lib" ? `<button class="btn tonal sm" id="editBtn" type="button">${icon(S.editing ? "check" : "edit")}${esc(S.editing ? t("done") : t("edit"))}</button>` : ""}</div>
        <div id="txtBox"></div>
      </section>

      <section class="card">
        <div class="card-hd"><span class="num">2</span><h2 class="h2">${esc(t("trLang"))}</h2></div>
        <div class="lang-grid">${LC.map((c, i) => `<button class="lang-opt${c === S.lang ? " on" : ""}" data-l="${c}" type="button"><span class="code">${c.toUpperCase()}</span><span ${c === "he" ? 'class="he"' : ""}>${esc(LN[i])}</span></button>`).join("")}</div>
      </section>

      <section class="card">
        <div class="card-hd"><span class="num">3</span><h2 class="h2">${esc(t("s3").replace(/^\d+\.\s*/, ""))}</h2></div>
        <div class="lvl-grid">${lvls.map(([v, sub, c]) => `<button class="lvl${S.lvl === v ? " on" : ""}" data-v="${v}" style="--c:${c}" type="button"><span class="n"></span><b>${esc(lvlLabel(v))}</b><small>${esc(t(sub))}</small></button>`).join("")}</div>
      </section>

      <section class="card">
        <div class="card-hd"><span class="num">4</span><h2 class="h2">${esc(t("pdfOpts"))}</h2></div>
        ${sw("two", t("ex3"))}${sw("ctx", t("ex1"))}${sw("tl", t("ex2"))}${sw("nek", t("ex7"))}${sw("alt", t("ex5"))}
        <div class="opt-row" style="cursor:default"><span>${esc(t("sort").replace(":", ""))}</span></div>
        <div class="seg" id="sortSeg"><button type="button" data-v="app" class="${S.sort === "app" ? "on" : ""}">${esc(t("so1"))}</button><button type="button" data-v="dif" class="${S.sort === "dif" ? "on" : ""}">${esc(t("so2"))}</button></div>
      </section>`;
    cta(`<button class="btn primary block" id="genBtn" type="button">${icon("file")}<span>${esc(t("generate"))}</span></button>`);

    const showTo = () => { $("rangeOn").checked = true; $("toCol").style.opacity = "" };
    $("srcSeg").onclick = e => { const b = e.target.closest("button"); if (!b || b.dataset.s === S.src) return; S.src = b.dataset.s; S.editing = false; S.text = ""; S.ref = ""; S.sel = ""; S.srcMsg = null; S.textWork = ""; route() };
    $("pickT").onclick = () => openItemPicker(w);
    el.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { const s = $(b.dataset.step); const i = s.selectedIndex + (+b.dataset.d); if (i >= 0 && i < s.options.length) { s.selectedIndex = i; s.dispatchEvent(new Event("change")) } });
    if (w === "gemara") {
      $("daf").onchange = e => { S.daf = +e.target.value; if (S.daf2 < S.daf) { S.daf2 = S.daf; $("daf2").value = S.daf } loadRaw() };
      $("daf2").onchange = e => { S.daf2 = +e.target.value; if (!S.rangeOn) { S.rangeOn = true; showTo() } loadRaw() };
      el.querySelectorAll("[data-ab]").forEach(g => g.onclick = e => { const b = e.target.closest("button"); if (!b) return; const k = g.dataset.ab; S[k] = b.dataset.v; g.querySelectorAll("button").forEach(c => c.classList.toggle("on", c === b)); if (k === "amud2" && !S.rangeOn) { S.rangeOn = true; showTo() } loadRaw() });
      $("rangeOn").onchange = e => { S.rangeOn = e.target.checked; $("toCol").style.opacity = S.rangeOn ? "" : ".45"; loadRaw() };
    } else {
      const c = S.cv[w];
      const fillUnits = (id, ch) => { const n = D.chapters(w, c.m)[ch] || 0; $(id).innerHTML = opt(Array.from({ length: n }, (_, i) => i + 1), "", t("wholeCh")) };
      $("c1").onchange = e => { c.c1 = e.target.value; c.u1 = ""; fillUnits("u1", c.c1); if (c.rangeOn && +c.c2 < +c.c1) { c.c2 = c.c1; $("c2").value = c.c2; c.u2 = ""; fillUnits("u2", c.c2) } loadRaw() };
      $("u1").onchange = e => { c.u1 = e.target.value; loadRaw() };
      $("c2").onchange = e => { c.c2 = e.target.value; c.u2 = ""; fillUnits("u2", c.c2); if (!c.rangeOn) { c.rangeOn = true; showTo() } loadRaw() };
      $("u2").onchange = e => { c.u2 = e.target.value; if (!c.c2) c.c2 = c.c1; if (!c.rangeOn) { c.rangeOn = true; showTo() } loadRaw() };
      $("rangeOn").onchange = e => { c.rangeOn = e.target.checked; if (c.rangeOn && !c.c2) c.c2 = c.c1; $("toCol").style.opacity = c.rangeOn ? "" : ".45"; loadRaw() };
    }
    $("dropTxt").onclick = () => { pickTxtFor = w; $("fTxt").click() };
    $("impCsv") && ($("impCsv").onclick = () => $("fCsv").click());
    $("editBtn") && ($("editBtn").onclick = () => { S.editing = !S.editing; route() });
    el.querySelectorAll(".lang-opt").forEach(b => b.onclick = () => { S.lang = b.dataset.l; store.set("gt_target_lang", S.lang); el.querySelectorAll(".lang-opt").forEach(c => c.classList.toggle("on", c === b)) });
    el.querySelectorAll(".lvl").forEach(b => b.onclick = () => { S.lvl = b.dataset.v; el.querySelectorAll(".lvl").forEach(c => c.classList.toggle("on", c === b)) });
    el.querySelectorAll("[data-o]").forEach(i => i.onchange = () => { S.opts[i.dataset.o] = i.checked; saveOpts() });
    $("sortSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.sort = b.dataset.v; saveOpts(); $("sortSeg").querySelectorAll("button").forEach(c => c.classList.toggle("on", c === b)) };
    $("genBtn").onclick = generate;

    paintText();
    if (S.src === "lib" && (!S.text || S.textWork !== w) && !S.loadingText) loadRaw(); else recount();
  }
  function openItemPicker(w) {
    const html = `<label class="search" style="margin-bottom:12px">${icon("search")}<input id="pq" type="search" placeholder="${esc(t(w === "tanach" ? "srchAny" : "srch"))}" autocomplete="off"></label><div id="plist"></div>`;
    openSheet(t(w === "tanach" ? "chooseBook" : "chooseTr"), html, body => {
      const draw = q => {
        body.querySelector("#plist").innerHTML = groupedItems(w, D.sorted(w), q, "") || `<div class="empty"><b>${esc(t("noResults"))}</b></div>`;
        body.querySelectorAll(".tr-item").forEach(b => b.onclick = () => { closeSheet(); selectItem(w, b.dataset.m); S.text = ""; S.textWork = ""; route() });
      };
      body.querySelector("#pq").oninput = e => draw(e.target.value); draw("");
    });
  }
  let pickTxtFor = "gemara";
  $("fTxt").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    S.work = pickTxtFor; S.src = "up";
    try { S.text = (await f.text()).trim(); S.ref = f.name.replace(/\.[^.]+$/, ""); S.first = S.second = ""; S.sel = ""; S.fname = ""; S.textWork = S.work; S.srcMsg = { key: "textLoaded" } }
    catch (err) { S.srcMsg = { key: "textFileError", warn: true } }
    e.target.value = ""; go(S.work);
  };
  $("fCsv").onchange = async e => {
    let n = 0, last = "";
    for (const f of e.target.files) { const m = await D.importCSV(await f.text(), f.name); if (m) { n++; last = m } }
    e.target.value = "";
    if (n) { selectTractate(last); S.work = "gemara"; S.src = "lib"; S.text = ""; S.srcMsg = { key: "importSuccess", vars: { n } }; toast(st("importSuccess", { n })); go("gemara"); if (location.hash === "#/gemara") route() }
    else { S.srcMsg = { key: "importUnknown", warn: true }; toast(st("importUnknown")); paintSrc() }
  };

  /* ------------------------------------------------------------- processing */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function generate() {
    const text = (S.text || "").trim(), w = S.work;
    if (!text) { toast(st("needText")); return }
    $("tabbar").style.display = "none";
    const steps = ["st1", "st2", "st3", "st4"];
    $("procHost").innerHTML = `<div class="proc" role="status" aria-live="polite">
      <div class="logo-ring"><svg viewBox="0 0 104 104"><circle class="bgc" cx="52" cy="52" r="48"/><circle class="fgc" id="ring" cx="52" cy="52" r="48" stroke-dasharray="301.6" stroke-dashoffset="301.6"/></svg><img src="icons/logo-128.png" alt=""></div>
      <h2>${esc(t("procTitle"))}</h2><div class="ref">${esc(S.ref || (S.src === "up" ? t("uploaded") : ""))}</div>
      <div class="steps">${steps.map((k, i) => `<div class="step" id="ps${i}"><span class="sd"></span><b>${esc(t(k))}</b><small id="pn${i}"></small></div>`).join("")}</div></div>`;
    const setStep = (i, state, note) => {
      const s = $("ps" + i); s.className = "step " + state; if (state === "done") s.querySelector(".sd").innerHTML = icon("check");
      if (note != null) $("pn" + i).textContent = note;
      $("ring").style.strokeDashoffset = 301.6 * (1 - (i + (state === "done" ? 1 : .35)) / steps.length);
    };
    const t0 = () => performance.now(); const pace = async s => { const d = performance.now() - s; if (d < 320) await wait(320 - d) };
    try {
      let s = t0(); setStep(0, "active");
      const total = E.norm(text).split(/\s+/).filter(Boolean).length;
      await pace(s); setStep(0, "done", `${nf(total)} ${t("words")}`);

      s = t0(); setStep(1, "active", D.vocabState(w).state === "ready" ? "" : t("loadingVocab"));
      await D.vocab(w);
      const lex = D.lex(w);
      if (!lex || !lex.entries.length) throw new Error(st("vocabNotLoaded"));
      const r = matcher(w)(lex, text);
      await pace(s); setStep(1, "done", `${nf(r.words.length)} ${t("found")}`);

      s = t0(); setStep(2, "active");
      const words = E.pick(r.words, S.lvl, S.sort);
      await pace(s); setStep(2, "done", `${nf(words.length)} · ${lvlLabel(S.lvl)}`);

      s = t0(); setStep(3, "active");
      const fname = S.fname || P.fileBase(S.ref || t(WNAME[w]), "", "");
      S.result = { work: w, words: r.words, cov: r.cov, total: r.total, ref: S.ref, sel: S.src === "lib" ? S.sel : "", fname, m: S.src === "lib" ? curM(w) : "", first: S.first || "", second: S.second || "", text, ctx: text.slice(0, 260) + (text.length > 260 ? "…" : ""), mode: S.src, ts: Date.now() };
      await P.ensureFonts();
      const sh = P.render(words, sheetOpts(), $("meas"));
      await pace(s); setStep(3, "done", `${nf(sh.pages)} A4`);
      saveHistory(S.result);
      await wait(260);
      $("procHost").innerHTML = ""; $("tabbar").style.display = ""; go("results");
    } catch (err) {
      $("procHost").innerHTML = ""; $("tabbar").style.display = "";
      toast(err && err.message === "vocabNotLoaded" ? st("vocabNotLoaded") : (err && err.message) || String(err));
    }
  }
  function sheetOpts() { const r = S.result; return { work: r ? r.work || "gemara" : S.work, sel: r ? r.sel : "", lang: S.lang, ref: r ? r.ref : S.ref, ctx: S.opts.ctx && r ? r.ctx : "", two: S.opts.two, tl: S.opts.tl, alt: S.opts.alt, nek: S.opts.nek } }

  /* ---------------------------------------------------------------- history */
  // Gemara entries keep the website's "gt_hist" store; Tanach and Mishnah entries use "gtm_hist".
  const HKEY = w => (w || "gemara") === "gemara" ? "gt_hist" : "gtm_hist";
  function saveHistory(r) {
    const meta = { work: r.work, id: r.ref || "", when: new Date(r.ts).toLocaleString("pt-BR"), lang: S.lang, lvl: S.lvl, n: r.words.length, text: r.text, words: r.words, ctx: r.ctx, cov: r.cov, mode: r.mode, ts: r.ts, m: r.m, first: r.first, second: r.second, sel: r.sel, fname: r.fname };
    const key = HKEY(r.work);
    let h = store.json(key, []); h.unshift(meta); h = h.slice(0, 30);
    while (h.length) { try { localStorage.setItem(key, JSON.stringify(h)); break } catch (e) { h.pop() } }
  }
  function allHistory() {
    const a = store.json("gt_hist", []).map((x, i) => ({ ...x, work: x.work || "gemara", _k: "gt_hist", _i: i }));
    const b = store.json("gtm_hist", []).map((x, i) => ({ ...x, _k: "gtm_hist", _i: i }));
    return [...a, ...b].sort((x, y) => (y.ts || 0) - (x.ts || 0));
  }
  const histM = x => x.m || ((x.id || "").replace(/\s+\d+[ab](?:[–-]\d+[ab])?$/i, "")) || "";
  const histTitle = x => x.mode === "up" ? (x.id || t("uploaded")) : (x.id || t("pasted"));
  const histWhen = x => x.ts ? new Date(x.ts).toLocaleString(LC[L], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : (x.when || "");
  function reopen(x) {
    const w = x.work || "gemara";
    const pm = (x.id || "").match(/(\d+[ab])(?:[–-](\d+[ab]))?$/i) || [];
    S.lang = LC.includes(x.lang) ? x.lang : S.lang; store.set("gt_target_lang", S.lang);
    S.lvl = ["2", "3", "4", "all"].includes(String(x.lvl)) ? String(x.lvl) : "all";
    const first = x.first || (w === "gemara" ? pm[1] : "") || "", second = x.second || (w === "gemara" ? pm[2] : "") || "";
    S.result = { work: w, words: x.words || [], cov: x.cov, total: 0, ref: x.id || "", sel: x.sel || "", fname: x.fname || (w === "gemara" ? P.fileBase(histM(x) || "Gemara", first, second) : P.fileBase(x.id || t(WNAME[w]), "", "")), m: histM(x), first, second, text: x.text || "", ctx: x.ctx || "", mode: x.mode || "lib", ts: x.ts || 0 };
    go("results");
  }
  function vHistory(el) {
    const draw = () => {
      const h = allHistory();
      header({ title: t("tabHist"), sub: `${nf(h.length)} ${t("items")}` });
      el.innerHTML = h.length ? h.map((x, i) => `<div class="hitem"><button class="meta" data-i="${i}" type="button"><b>${esc(histTitle(x))}</b><small>${esc(histWhen(x))}</small><div class="badges"><span class="badge gold">${esc(t(WNAME[x.work]))}</span><span class="badge brand">${esc((x.lang || "").toUpperCase())}</span><span class="badge">${nf(x.n)} ${esc(t("words"))}</span>${x.lvl && x.lvl !== "all" ? `<span class="badge" style="color:${LV[x.lvl]}">${esc(lvlLabel(String(x.lvl)))}</span>` : ""}</div></button><button class="icon-btn" data-del="${i}" type="button" aria-label="${esc(t("deleteOne"))}" style="color:var(--mute)">${icon("trash")}</button></div>`).join("")
        + `<button class="btn danger block" id="clr" type="button" style="margin-top:16px">${icon("trash")}${esc(t("clearHist"))}</button>`
        : `<div class="empty">${icon("clock")}<b>${esc(t("m_nohist"))}</b><span>${esc(t("emptyRecent"))}</span><div style="margin-top:18px"><a class="btn primary" href="#/translate">${icon("plus")}${esc(t("newTr"))}</a></div></div>`;
      el.querySelectorAll("[data-i]").forEach(b => b.onclick = () => reopen(h[+b.dataset.i]));
      el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
        const x = h[+b.dataset.del], items = store.json(x._k, []); const [gone] = items.splice(x._i, 1);
        store.set(x._k, JSON.stringify(items)); draw();
        toast(t("deleted"), { label: t("undo"), run: () => { const it = store.json(x._k, []); it.splice(x._i, 0, gone); store.set(x._k, JSON.stringify(it)); if (route.last === "history") draw() } });
      });
      $("clr") && ($("clr").onclick = () => openSheet(t("confirmClear"), `<div class="row2" style="display:flex;gap:10px;margin-top:4px"><button class="btn ghost" id="cNo" type="button" style="flex:1">${esc(t("cancel"))}</button><button class="btn primary" id="cYes" type="button" style="flex:1;background:var(--danger)">${esc(t("deleteOne"))}</button></div>`, b => {
        b.querySelector("#cNo").onclick = closeSheet; b.querySelector("#cYes").onclick = () => { try { localStorage.removeItem("gt_hist"); localStorage.removeItem("gtm_hist") } catch (e) { } closeSheet(); draw() };
      }));
    };
    draw();
  }

  /* ---------------------------------------------------------------- results */
  const dispOf = x => (S.result.work || "gemara") === "gemara" ? x.voc : x.disp;
  function vResults(el) {
    const r = S.result, w = r.work || "gemara";
    let q = "";
    el.innerHTML = `<div class="stats" id="rStats"></div>
      <div class="chips" id="rLv" style="margin-top:14px"></div>
      <label class="search" style="margin-top:12px">${icon("search")}<input id="rq" type="search" placeholder="${esc(t("searchWords"))}" autocomplete="off"></label>
      <div id="rMsg"></div>
      <div class="wlist" id="rList" style="margin-top:12px"></div>`;
    cta(`<div id="pgr"></div><div class="row2"><button class="btn ghost" id="toPdf" type="button">${icon("file")}${esc(t("viewPdf"))}</button><button class="btn primary" id="quickDl" type="button">${icon("download")}<span>${esc(t("dlShort"))}</span></button></div>`);
    $("toPdf").onclick = () => go("pdf");
    $("quickDl").onclick = () => downloadPdf($("quickDl"));
    $("rq").oninput = e => { q = e.target.value.trim(); drawList() };
    $("rLv").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; S.lvl = b.dataset.v; body() };
    function drawList() {
      const words = E.pick(r.words, S.lvl, S.sort);
      const ql = q.toLowerCase(), qn = E.norm(q);
      const shown = !q ? words : words.filter(x => (qn && E.norm(x.ar).includes(qn)) || Object.values(x.tr || {}).some(s => String(s).toLowerCase().includes(ql)) || (x.tl || "").toLowerCase().includes(ql));
      $("rList").innerHTML = shown.map(x => {
        const { main, alts } = P.meanings(x, S.lang);
        const d = S.opts.nek && dispOf(x);
        return `<div class="word" style="--c:${LV[x.level] || LV.all}"><div class="w-tr" ${S.lang === "he" ? 'dir="rtl" lang="he"' : `lang="${S.lang}"`}><b>${esc(main) || "—"}</b>${x.tl ? `<i dir="ltr">${esc(x.tl)}</i>` : ""}${alts.length ? `<em>${esc(alts.join("; "))}</em>` : ""}</div>
          <div class="w-ar"><span class="hw" lang="he" dir="rtl">${esc(d || x.ar)}</span><span class="meta"><span class="badge" dir="ltr">×${x.count || 1}</span><span class="lvdot" title="${esc(t("level"))} ${x.level}"></span></span></div></div>`;
      }).join("") || `<div class="empty">${icon("search")}<b>${esc(t("noResults"))}</b></div>`;
    }
    function body() {
      header({ back: w, title: r.ref || t("results"), sub: `${t(WNAME[w])} · ${langName(S.lang)}`, right: `<button class="pill" id="rLang" type="button">${icon("globe")}<span>${S.lang.toUpperCase()}</span></button>` });
      $("rLang").onclick = () => openTargetLang(body);
      const words = E.pick(r.words, S.lvl, S.sort);
      const pages = P.render(words, sheetOpts(), $("meas")).pages;
      $("rStats").innerHTML = `<div class="stat"><b>${nf(words.length)}</b><small>${esc(t("words"))}</small></div><div class="stat"><b>${r.cov != null ? Math.round(r.cov * 100) + "%" : "—"}</b><small>${esc(t("coverage"))}</small></div><div class="stat"><b>${nf(pages)}</b><small>A4 ${esc(t("pages"))}</small></div>`;
      $("rLv").innerHTML = ["all", "2", "3", "4"].map(v => `<button class="chip${S.lvl === v ? " on" : ""}" data-v="${v}" type="button"><span class="dot" style="background:${LV[v]}"></span>${esc(lvlLabel(v))} · ${nf(E.pick(r.words, v).length)}</button>`).join("");
      const msgs = [];
      if (r.words.length && !r.words.some(x => x.tr && x.tr[S.lang])) msgs.push(st("languageMissing"));
      if (w === "gemara" && S.opts.nek && r.words.length && !r.words.some(x => x.voc)) msgs.push(st("noNekudot"));
      if (!r.words.length) msgs.push(st("noMatches")); else if (r.cov != null) msgs.push(st("coverage", { n: r.words.length, p: Math.round(r.cov * 100) }));
      $("rMsg").innerHTML = msgs.map((m, i) => `<div class="status${i < msgs.length - 1 || !r.words.length ? " warn" : ""}">${icon(i < msgs.length - 1 || !r.words.length ? "alert" : "info")}<span>${esc(m)}</span></div>`).join("");
      drawList();
    }
    body();
  }

  /* -------------------------------------------------------------------- pdf */
  function currentSheet() { return P.render(E.pick(S.result.words, S.lvl, S.sort), sheetOpts(), $("meas")) }
  const pdfName = () => S.result.fname || "GTM to PDF";
  /* PDF cache: the PDF for the current settings is made once (in the background on the PDF page)
     and reused, so Download/Share are instant. Jobs run one at a time because they share #exportHost. */
  const pdfKey = () => JSON.stringify([S.result.ref, S.result.fname, S.result.words.length, S.lvl, S.sort, sheetOpts()]);
  const PC = { key: null, blob: null, job: null, prog: null, last: [0, 0] };
  let pdfQueue = Promise.resolve();
  function buildPdf() {
    const key = pdfKey();
    if (PC.key === key && (PC.blob || PC.job)) return PC.blob ? Promise.resolve(PC.blob) : PC.job;
    if (!S.result.words.length) return Promise.reject(Object.assign(new Error(st("noneYet")), { user: true }));
    const sh = currentSheet();
    PC.key = key; PC.blob = null; PC.last = [0, sh.pages];
    const job = pdfQueue.then(() => P.toPdfBlob(sh.html, pdfName(), (i, n) => { PC.last = [i, n]; PC.prog && PC.prog(i, n) }));
    pdfQueue = job.catch(() => { });
    PC.job = job;
    job.then(b => { if (PC.job === job) { PC.blob = b; PC.job = null } }, () => { if (PC.job === job) { PC.key = null; PC.job = null } });
    return job;
  }
  /** Shows a progress strip ("Generating PDF… 2/5") above the buttons while the PDF is made. */
  async function makeBlob(btn) {
    const bar = $("pgr"), btns = document.querySelectorAll(".cta .btn");
    const show = (i, n) => { if (!bar) return; const k = n ? Math.min(i + 1, n) : 0; bar.innerHTML = `<div class="pgr"><i style="width:${n ? Math.round(i / n * 100) : 5}%"></i><span>${esc(t("making"))}${n ? ` ${k}/${n}` : ""}</span></div>` };
    btns.forEach(b => b.disabled = true);
    try {
      const p = buildPdf();
      if (!PC.blob) { PC.prog = show; show(...PC.last) }
      return await p;
    } finally { PC.prog = null; if (bar) bar.innerHTML = ""; btns.forEach(b => b.disabled = false) }
  }
  /** Lets the user pick the folder/name (Chrome/Edge on computers); other browsers download normally. */
  const canPick = () => typeof window.showSaveFilePicker === "function" && !P.isNative();
  async function downloadPdf(btn) {
    let handle = null;
    if (canPick()) {
      // The dialog must open right on the click, before the PDF is made.
      try { handle = await window.showSaveFilePicker({ suggestedName: pdfName() + ".pdf", types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }] }) }
      catch (e) { if (e && e.name === "AbortError") return; handle = null }
    }
    try {
      const b = await makeBlob(btn);
      if (handle) { const w = await handle.createWritable(); await w.write(b); await w.close(); toast(t("saved")); return }
      const how = await P.save(b, pdfName() + ".pdf"); toast(how === "native" ? t("savedDocs") : t("saved"))
    }
    catch (e) { console.error(e); toast(e && e.user ? e.message : t("pdfErr")) }
  }
  async function sharePdf(btn) {
    try { const b = await makeBlob(btn); const how = await P.share(b, pdfName() + ".pdf", pdfName()); if (how === "downloaded") toast(t("saved")) }
    catch (e) { console.error(e); toast(e && e.user ? e.message : t("pdfErr")) }
  }
  function vPdf(el) {
    const r = S.result;
    header({ back: "results", title: "PDF", sub: r.ref || "", right: "" });
    const tog = [["two", t("ex3")], ["ctx", t("ex1")], ["tl", t("ex2")], ["nek", t("ex7")], ["alt", t("ex5")]];
    el.innerHTML = `<div class="chips" id="pOpts">${tog.map(([k, n]) => `<button class="chip${S.opts[k] ? " on" : ""}" data-o="${k}" type="button">${S.opts[k] ? icon("check") : ""}${esc(n)}</button>`).join("")}</div>
      <div class="pv-info" style="margin-top:14px"><span id="pInfo"></span><button class="chip" id="pLang" type="button">${icon("globe")}${esc(langName(S.lang))}</button></div>
      <div class="pv-wrap"><div class="pv-stage" id="stage"><div class="pv-sheets" id="sheets"></div></div></div>
      ${P.canPrint() ? `<p class="muted tiny" style="text-align:center;margin:6px 8px 0">${esc(t("vectorNote"))}</p>` : ""}`;
    cta(`<div id="pgr"></div><div class="row2"><button class="btn primary" id="pDl" type="button">${icon("download")}<span>${esc(t("dl"))}</span></button><button class="btn tonal ico" id="pSh" type="button" aria-label="${esc(t("share"))}">${icon("share")}</button>${P.canPrint() ? `<button class="btn ghost ico" id="pPr" type="button" aria-label="${esc(t("print"))}">${icon("print")}</button>` : ""}</div>`);
    const draw = async () => {
      await P.ensureFonts();
      const sh = currentSheet();
      $("sheets").innerHTML = sh.html;
      $("pInfo").textContent = `${nf(E.pick(r.words, S.lvl).length)} ${t("words")} · ${nf(sh.pages)} A4`;
      fit();
      // Start making the PDF quietly in the background so Download is instant.
      clearTimeout(vPdf.pre); vPdf.pre = setTimeout(() => { if (route.last === "pdf" && S.result.words.length) buildPdf().catch(() => { }) }, 700);
    };
    $("pOpts").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; const k = b.dataset.o; S.opts[k] = !S.opts[k]; saveOpts(); b.classList.toggle("on", S.opts[k]); b.innerHTML = (S.opts[k] ? icon("check") : "") + esc(tog.find(x => x[0] === k)[1]); draw() };
    $("pLang").onclick = () => openTargetLang(() => vPdf(el));
    $("pDl").onclick = () => downloadPdf($("pDl"));
    $("pSh").onclick = () => sharePdf($("pSh"));
    $("pPr") && ($("pPr").onclick = () => { if (!r.words.length) { toast(st("noneYet")); return } P.print(currentSheet().html, pdfName(), S.lang) });
    draw();
  }
  function fit() {
    const st_ = $("stage"), sh = $("sheets"); if (!st_ || !sh) return;
    sh.style.transform = "none"; const pw = sh.querySelector(".page"); if (!pw) return;
    const k = Math.min(1, st_.clientWidth / pw.offsetWidth);
    sh.style.transform = `scale(${k})`; st_.style.height = (sh.offsetHeight * k) + "px";
  }
  addEventListener("resize", fit);

  /* ------------------------------------------------------------ more/about */
  const SITES = [["Guemarah to PDF", "https://bm7770.github.io/Guemarah-to-PDF/", "wGs"], ["Tanach to PDF", "https://bm7770.github.io/Tanach-to-PDF/", "wTs"], ["Mishnah to PDF", "https://bm7770.github.io/Mishnah-to-PDF/", "wMs"]];
  /** Link to download the Android app: the update link set in Firebase, otherwise the one in config.js. */
  const appUrl = () => GTMRemote.get().updateUrl || GTM_CONFIG.appUrl || "";
  const signature = () => `<div class="sign"><span>${esc(t("sig"))}</span><small>${esc(t("appName"))} · ${esc(t("version"))} ${esc(GTMRemote.version)}</small></div>`;
  function vMore(el) {
    header({ title: t("tabMore"), sub: t("settings") });
    const theme = store.get("gt_theme", "dark");
        el.innerHTML = `
      ${GTMRemote.hasUpdate() ? `<a class="band" href="${esc(GTMRemote.get().updateUrl || "#/more")}" target="_blank" rel="noopener">${icon("download")}<div><b>${esc(t("updAvail"))}</b><small>${esc(t("version"))} ${esc(GTMRemote.get().latestVersion)}</small></div></a>` : ""}
      ${GTMAuth.configured && GTMAuth.user() ? `<div class="sec" style="margin-top:4px"><span class="eyebrow">${esc(t("account"))}</span></div>
      <div class="list">
        <div class="row"><span class="ri">${icon("mail")}</span><div class="rt"><b>${esc(GTMAuth.user().email)}</b><small>${esc(t(GTMAuth.user().emailVerified ? "verified" : "notVerified"))}</small></div></div>
        <button class="row" id="mOut" type="button"><span class="ri">${icon("back", "flip")}</span><div class="rt"><b>${esc(t("signOut"))}</b></div>${chev()}</button>
        <button class="row" id="mDel" type="button"><span class="ri" style="color:var(--danger)">${icon("trash")}</span><div class="rt"><b style="color:var(--danger)">${esc(t("delTitle"))}</b></div>${chev()}</button>
      </div>` : ""}
      <div class="sec"${GTMAuth.configured && GTMAuth.user() ? "" : ' style="margin-top:4px"'}><span class="eyebrow">${esc(t("general"))}</span></div>
      <div class="list">
        <button class="row" id="mUi" type="button"><span class="ri">${icon("globe")}</span><div class="rt"><b>${esc(t("appLang"))}</b></div><span class="rv">${esc(LN[L])}${chev()}</span></button>
        <button class="row" id="mTh" type="button"><span class="ri">${icon("moon")}</span><div class="rt"><b>${esc(t("theme"))}</b></div><span class="rv">${esc(t(theme))}${chev()}</span></button>
        <a class="row" href="#/about"><span class="ri">${icon("info")}</span><div class="rt"><b>${esc(t("n5"))}</b></div>${chev()}</a>
      </div>
      <div class="sec"><span class="eyebrow">${esc(t("share"))}</span></div>
      <div class="list"><button class="row" id="mShare" type="button"><span class="ri" style="color:var(--brand)">${icon("share")}</span><div class="rt"><b>${esc(t("shareApp"))}</b><small>${esc(t("shareAppSub"))}</small></div>${chev()}</button></div>
      ${appUrl() ? `<div class="sec"><span class="eyebrow">${esc(t("getApp"))}</span></div>
      <div class="list"><a class="row" href="${esc(appUrl())}" target="_blank" rel="noopener"><span class="ri" style="color:var(--brand)">${icon("install")}</span><div class="rt"><b>${esc(t("getAppT"))}</b><small>${esc(t("getAppSub"))}</small></div>${chev()}</a></div>` : ""}
      ${signature()}`;
    $("mUi").onclick = openAppLang; $("mTh").onclick = openTheme;
    $("mShare").onclick = shareApp;
    $("mOut") && ($("mOut").onclick = () => { GTMAuth.signOut(); authMode = "login"; route() });
    $("mDel") && ($("mDel").onclick = confirmDelete);
  }
  /** Opens the phone's share sheet with the app link (native share in the APK, Web Share in the browser). */
  const APP_URL = "https://bm7770.github.io/GTM-to-PDF/";
  async function shareApp() {
    const data = { title: t("appName"), text: t("shareAppText"), url: APP_URL };
    const P_ = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins;
    // 1) Android app: the system share sheet (it also offers "Copy").
    if (P_ && P_.Share) { try { await P_.Share.share({ ...data, dialogTitle: t("shareApp") }); } catch (e) { } return; }
    // 2) Phone browser: the system share sheet (Web Share).
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    // 3) Where the system sheet is blocked: our own share sheet.
    openShareSheet(data);
  }
  function openShareSheet(data) {
    const msg = encodeURIComponent(data.text + " " + data.url), u = encodeURIComponent(data.url), tx = encodeURIComponent(data.text);
    const targets = [
      ["WhatsApp", "https://wa.me/?text=" + msg, "#25D366"],
      ["Telegram", "https://t.me/share/url?url=" + u + "&text=" + tx, "#2AABEE"],
      ["E-mail", "mailto:?subject=" + encodeURIComponent(data.title) + "&body=" + msg, "#486FB1"],
      ["SMS", "sms:?&body=" + msg, "#6f93d0"],
    ];
    openSheet(t("shareApp"), `<div class="share-grid">${targets.map(([n, href, c]) => `<a class="share-t" href="${href}" target="_blank" rel="noopener"><span class="share-i" style="--c:${c}">${icon(n === "E-mail" ? "mail" : "share")}</span><span>${n}</span></a>`).join("")}</div>
      <div class="share-link"><input id="shLink" type="text" readonly value="${esc(data.url)}"><button class="btn primary sm" id="shCopy" type="button">${icon("paste")}${esc(t("copyLink"))}</button></div>`, body => {
      body.querySelector("#shCopy").onclick = async () => {
        const inp = body.querySelector("#shLink");
        try { await navigator.clipboard.writeText(data.url); } catch (e) { inp.select(); try { document.execCommand("copy"); } catch (_) { } }
        toast(t("linkCopied"));
      };
    });
  }
  function vAbout(el) {
    header({ back: "more", title: t("n5"), right: "" });
    el.innerHTML = `<section class="card prose"><img src="icons/gtm-logo.png" alt="" style="height:84px;width:auto;display:block;margin:0 auto 14px">
      <h2 class="display" style="text-align:center;font-size:30px;margin-bottom:14px">${esc(t("appName"))}</h2>
      <p>${esc(t("ab1"))}</p><p>${esc(t("ab2"))}</p><p>${esc(t("appNote"))}</p></section>
      <div class="list" style="margin-top:12px"><a class="row" href="mailto:moscovicberale@gmail.com?subject=GTM%20to%20PDF%20-%20Revis%C3%A3o%20ou%20sugest%C3%A3o"><span class="ri">${icon("mail")}</span><div class="rt"><b>${esc(t("contact"))}</b><small>moscovicberale@gmail.com</small></div>${chev()}</a></div>
      ${signature()}`;
  }

  /* --------------------------------------------------------------- accounts */
  // What the app must show before anything else: forced update, login, e-mail confirmation.
  function gate() {
    if (GTMRemote.mustUpdate()) return "update";
    const R = GTMRemote.get();
    if (!GTMAuth.configured || R.requireLogin === false) return null;
    const u = GTMAuth.user();
    if (!u) return "login";
    if (R.requireVerifiedEmail !== false && !u.emailVerified) return "verify";
    return null;
  }
  let authMode = "login";
  const authErr = e => { const c = e && e.code || "UNKNOWN"; const k = { EMAIL_EXISTS: "aeExists", EMAIL_NOT_FOUND: "aeWrong", INVALID_PASSWORD: "aeWrong", INVALID_LOGIN_CREDENTIALS: "aeWrong", WEAK_PASSWORD: "aeWeak", INVALID_EMAIL: "aeEmail", MISSING_PASSWORD: "aeWeak", TOO_MANY_ATTEMPTS_TRY_LATER: "aeMany", USER_DISABLED: "aeDisabled", NETWORK: "aeNet" }[c]; return t(k || "aeGeneric") };
  function vGate(g, el) {
    header({ title: t("appName"), sub: t("brandSub") });
    $("hdr").className = "hdr big";
    if (g === "update") {
      const R = GTMRemote.get();
      el.innerHTML = `<section class="card auth"><img class="auth-logo" src="icons/gtm-logo.png" alt=""><h1 class="display">${esc(t("updTitle"))}</h1><p class="muted">${esc(R.message || t("updText"))}</p>
        ${R.updateUrl ? `<a class="btn primary block" href="${esc(R.updateUrl)}" target="_blank" rel="noopener">${icon("download")}${esc(t("updBtn"))}</a>` : ""}
        <p class="tiny muted" style="text-align:center;margin-top:12px">${esc(t("version"))} ${esc(GTMRemote.version)} → ${esc(R.minVersion)}</p></section>`;
      return;
    }
    if (g === "verify") {
      const u = GTMAuth.user();
      el.innerHTML = `<section class="card auth"><img class="auth-logo" src="icons/gtm-logo.png" alt=""><h1 class="display">${esc(t("verTitle"))}</h1>
        <p class="muted">${esc(t("verText"))} <b class="ink2">${esc(u.email)}</b></p>
        <button class="btn primary block" id="vDone" type="button">${icon("check")}${esc(t("verDone"))}</button>
        <button class="btn ghost block" id="vSend" type="button" style="margin-top:10px">${icon("mail")}${esc(t("verResend"))}</button>
        <button class="btn danger block" id="vOut" type="button" style="margin-top:10px">${esc(t("signOut"))}</button>
        <div id="aMsg"></div></section>`;
      const msg = (m, ok) => $("aMsg").innerHTML = `<div class="status ${ok ? "" : "warn"}">${icon(ok ? "check" : "alert")}<span>${esc(m)}</span></div>`;
      $("vDone").onclick = async () => { try { const x = await GTMAuth.reload(); if (x.emailVerified) route(); else msg(t("verNotYet")) } catch (e) { msg(authErr(e)) } };
      $("vSend").onclick = async () => { try { await GTMAuth.resendVerification(); msg(t("verSent"), true) } catch (e) { msg(authErr(e)) } };
      $("vOut").onclick = () => { GTMAuth.signOut(); authMode = "login"; route() };
      return;
    }
    // login / signup / reset
    const m = authMode;
    el.innerHTML = `<section class="card auth"><img class="auth-logo" src="icons/gtm-logo.png" alt="">
      <h1 class="display">${esc(t(m === "signup" ? "suTitle" : m === "reset" ? "rsTitle" : "liTitle"))}</h1>
      <p class="muted">${esc(t(m === "signup" ? "suText" : m === "reset" ? "rsText" : "liText"))}</p>
      <form id="aForm" novalidate>
        <label class="field-l" for="aEmail">${esc(t("email"))}</label>
        <input class="inp" id="aEmail" type="email" autocomplete="email" inputmode="email" required>
        ${m !== "reset" ? `<label class="field-l" for="aPass">${esc(t("password"))}</label>
        <div class="pw"><input class="inp" id="aPass" type="password" autocomplete="${m === "signup" ? "new-password" : "current-password"}" required><button class="icon-btn" id="aEye" type="button" aria-label="${esc(t("showPw"))}">${icon("eye")}</button></div>` : ""}
        ${m === "signup" ? `<label class="field-l" for="aPass2">${esc(t("password2"))}</label><input class="inp" id="aPass2" type="password" autocomplete="new-password" required><p class="tiny muted" style="margin:6px 2px 0">${esc(t("pwRule"))}</p>` : ""}
        <button class="btn primary block" id="aGo" type="submit" style="margin-top:16px">${esc(t(m === "signup" ? "suBtn" : m === "reset" ? "rsBtn" : "liBtn"))}</button>
      </form>
      <div id="aMsg"></div>
      <div class="auth-links">
        ${m === "login" ? `<button type="button" class="link" data-m="reset">${esc(t("forgot"))}</button><button type="button" class="link" data-m="signup">${esc(t("noAccount"))}</button>` : `<button type="button" class="link" data-m="login">${esc(t("haveAccount"))}</button>`}
      </div></section>`;
    const msg = (x, ok) => $("aMsg").innerHTML = `<div class="status ${ok ? "" : "warn"}">${icon(ok ? "check" : "alert")}<span>${esc(x)}</span></div>`;
    el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { authMode = b.dataset.m; route() });
    $("aEye") && ($("aEye").onclick = () => { const p = $("aPass"); p.type = p.type === "password" ? "text" : "password" });
    $("aForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("aEmail").value.trim(), pass = $("aPass") ? $("aPass").value : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg(t("aeEmail"));
      if (m === "signup") { if (pass.length < 8) return msg(t("aeWeak")); if (pass !== $("aPass2").value) return msg(t("aeMatch")) }
      const b = $("aGo"); b.disabled = true;
      try {
        if (m === "reset") { await GTMAuth.resetPassword(email); msg(t("rsSent"), true) }
        else { await (m === "signup" ? GTMAuth.signUp(email, pass) : GTMAuth.signIn(email, pass)); authMode = "login"; route() }
      } catch (err) { msg(m === "reset" && err.code === "EMAIL_NOT_FOUND" ? t("rsSent") : authErr(err), m === "reset" && err.code === "EMAIL_NOT_FOUND") }
      finally { if (b.isConnected) b.disabled = false }
    };
  }
  function confirmDelete() {
    openSheet(t("delTitle"), `<p class="muted" style="margin:0 0 12px">${esc(t("delText"))}</p>
      <input class="inp" id="dPass" type="password" autocomplete="current-password" placeholder="${esc(t("password"))}">
      <div id="dMsg"></div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn ghost" id="dNo" type="button" style="flex:1">${esc(t("cancel"))}</button><button class="btn primary" id="dYes" type="button" style="flex:1;background:var(--danger)">${esc(t("delBtn"))}</button></div>`, b => {
      b.querySelector("#dNo").onclick = closeSheet;
      b.querySelector("#dYes").onclick = async () => {
        try { await GTMAuth.deleteAccount(b.querySelector("#dPass").value); closeSheet(); toast(t("delDone")); authMode = "login"; route() }
        catch (e) { b.querySelector("#dMsg").innerHTML = `<div class="status warn">${icon("alert")}<span>${esc(authErr(e))}</span></div>` }
      };
    });
  }

  /* ------------------------------------------------------------------- boot */
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if (store.get("gt_theme", "dark") === "system") setTheme("system") });
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp && CapApp.addListener) CapApp.addListener("backButton", () => {
    if (sheetClose) return closeSheet();
    if ($("procHost").innerHTML) return;
    if ((route.last || "home") !== "home") history.back(); else CapApp.exitApp();
  });

  async function boot() {
    const t0 = Date.now();
    applyLocale();
    GTMotion.watch($("view"));
    try { await D.loadIndex() } catch (e) { console.warn("index", e) }
    await Promise.race([GTMRemote.start(), wait(2500)]);   // latest rules (cached copy when offline)
    await Promise.race([GTMAuth.init(), wait(3000)]);      // restore the session
    GTMRemote.onChange(() => { if (!sheetClose) route() });
    route();
    // Splash: the blue screen with the logo stays at least ~1.3 s, then fades out.
    await (document.fonts ? Promise.race([document.fonts.ready, wait(1500)]) : Promise.resolve());
    await wait(Math.max(0, 1300 - (Date.now() - t0)));
    $("boot").classList.add("hide"); setTimeout(() => $("boot").remove(), 600);
    D.vocab("gemara");
  }
  boot();
})();
