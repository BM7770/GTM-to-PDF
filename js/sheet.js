/* Gemara Translator — A4 vocabulary sheet.
 * render() reproduces the website's render(): same page shell, same table
 * cells, same height measurement and pagination, same balancing of the two
 * columns on the last page. toPdfBlob() turns those exact pages into a real
 * PDF file on the device (pixel-identical to the preview); print() keeps the
 * website's print path (vector PDF with selectable text via the browser). */
const GTSheet = (() => {
  /* Titles, column labels and footers exactly as on each project's website. */
  const TTS = {
    gemara: { pt: "Vocabulário da Gemará", en: "Gemara Vocabulary", es: "Vocabulario de la Guemará", he: "אוצר מילים מהגמרא", fr: "Vocabulaire de la Guemara", it: "Vocabolario della Ghemarà", ru: "Словарь Гемары" },
    mishnah: { pt: "Vocabulário da Mishná", en: "Mishnah Vocabulary", es: "Vocabulario de la Mishná", he: "אוצר מילים מהגמרא", fr: "Vocabulaire de la Mishnah", it: "Vocabolario della Mishnah", ru: "Словарь Гемары" },
    tanach: { pt: "Vocabulário do Tanach", en: "Tanach Vocabulary", es: "Vocabulario del Tanach", he: "אוצר מילים מהתנ״ך", fr: "Vocabulaire du Tanach", it: "Vocabolario del Tanach", ru: "Словарь Танаха" },
  };
  const ARAM = { pt: ["Tradução", "Aramaico"], en: ["Translation", "Aramaic"], es: ["Traducción", "Arameo"], he: ["תרגום", "ארמית"], fr: ["Traduction", "Araméen"], it: ["Traduzione", "Aramaico"], ru: ["Перевод", "Арамейский"] };
  const HEB = { pt: ["Tradução", "Hebraico"], en: ["Translation", "Hebrew"], es: ["Traducción", "Hebreo"], he: ["תרגום", "עברית"], fr: ["Traduction", "Hébreu"], it: ["Traduzione", "Ebraico"], ru: ["Перевод", "Иврит"] };
  const LABS = { gemara: ARAM, mishnah: ARAM, tanach: HEB };
  const FOOT = { gemara: "Guemarah to PDF", mishnah: "Mishnah to PDF", tanach: "Tanach to PDF" };
  const TT = TTS.gemara;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  /** Main translation + alternative meanings for a word in a language. */
  function meanings(x, lang) {
    const translated = x.tr && typeof x.tr[lang] === "string" ? x.tr[lang] : "";
    const all = translated.split(/[;；]/).map(v => v.trim()).filter(Boolean);
    return { main: cap(all.shift() || ""), alts: all.map(cap) };
  }

  function cell(x, o) {
    const { main, alts } = meanings(x, o.lang);
    let sub = "";
    if (o.tl && x.tl) sub += `<i>${esc(x.tl)}</i>`;
    if (o.alt && alts.length) sub += `<em>${esc(alts.join("; "))}</em>`;
    return `<td class="tr" lang="${o.lang}" ${o.lang === "he" ? 'dir="rtl" style="text-align:right"' : ""}>${esc(main)}${x.unsure ? " ?" : ""}${sub}</td><td class="ar" lang="he"><span class="ar-inner"><span class="count" dir="ltr">X${x.count || 1}</span>${(o.work || "gemara") === "gemara" ? `<span class="ar-word${o.nek ? " nek" : ""}" dir="rtl">${esc(o.nek && x.voc ? x.voc : x.ar)}</span>` : `<span class="ar-word" dir="rtl">${esc(o.nek && x.disp ? x.disp : x.ar)}</span>`}</span></td>`;
  }
  function head(o) { const LB = LABS[o.work || "gemara"]; const l = LB[o.lang] || LB.pt; return `<tr><th>${l[0]}</th><th style="text-align:center">${l[1]}</th></tr>` }
  function shell(inner, n, p, o) {
    const w = o.work || "gemara", T = TTS[w];
    return `<div class="page${w === "gemara" ? "" : " w-" + w[0]}"><div class="ph"><h3 dir="${o.lang == "he" ? "rtl" : "ltr"}">${esc(T[o.lang] || T.pt)}</h3><span>${esc(o.ref || "")}</span></div>${o.sel ? `<div class="pdf-selection">${esc(o.sel)}</div>` : ""}${o.ctx ? `<p class="ctx" dir="rtl" lang="he">${esc(o.ctx)}</p>` : ""}<div class="lists">${inner}</div><div class="pf"><span>${FOOT[w]}</span><span>${p} / ${n}</span></div></div>`;
  }
  const tb = (a, o) => `<table><thead>${head(o)}</thead><tbody>${a.map(x => `<tr>${cell(x, o)}</tr>`).join("")}</tbody></table>`;

  /** @returns {{html:string, pages:number}} */
  function render(w, o, meas) {
    const two = !!o.two;
    meas.innerHTML = shell(tb([], o) + (two ? tb([], o) : ""), 1, 1, o);
    const H = meas.querySelector(".lists").clientHeight - meas.querySelector("thead").getBoundingClientRect().height - 30;
    meas.innerHTML = shell(tb(w, o) + (two ? "<table></table>" : ""), 1, 1, o);
    const hs = [...meas.querySelectorAll("tbody tr")].map(r => r.getBoundingClientRect().height); meas.innerHTML = "";
    const pg = []; let i = 0;
    while (i < w.length) {
      const L = [], R = []; let cur = L, ch = 0;
      while (i < w.length) {
        const x = hs[i] || 44;
        if (ch + x > H && cur.length) { if (cur === L && two) { cur = R; ch = 0; continue } else break }
        cur.push(w[i]); ch += x; i++;
      }
      pg.push([L, R]);
    }
    if (!pg.length) pg.push([[], []]);
    if (two && w.length) {
      const [L, R] = pg[pg.length - 1], all = L.concat(R), base = w.length - all.length;
      let tot = 0; all.forEach((_, k) => tot += hs[base + k] || 44);
      let acc = 0, k = 0; while (k < all.length && acc < tot / 2) { acc += hs[base + k] || 44; k++ }
      pg[pg.length - 1] = [all.slice(0, k), all.slice(k)];
    }
    return { html: pg.map(([L, R], p) => shell(tb(L, o) + (two ? tb(R, o) : ""), pg.length, p + 1, o)).join(""), pages: pg.length };
  }

  /** Same naming rule as the website: "GT - Berakhot - 2a-3b". */
  function fileBase(m, first, second) {
    const page = second && second !== first ? first + "-" + second : first;
    return ("GT - " + String(m || "Gemara").replace(/\s+/g, " ").trim() + (page ? " - " + page : "")).replace(/[\\/:*?"<>|]/g, "-").trim();
  }

  async function ensureFonts() {
    if (!document.fonts) return;
    try {
      await Promise.all([
        document.fonts.load('600 17pt "Nunito"'), document.fonts.load('10.5pt "Nunito"'),
        document.fonts.load('500 15.5pt "Frank Ruhl Libre"', "אב"), document.fonts.load('500 15.5pt "Noto Serif Hebrew"', "אָב"),
        document.fonts.load('10.5pt "Nunito"', "Пр"),
      ]);
      await document.fonts.ready;
    } catch (e) { }
  }

  let fontCSS = null, libs = null;
  /** Loads jsPDF and html-to-image (bundled in /vendor) the first time a PDF is made. */
  function loadLibs() {
    if (libs) return libs;
    const one = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s) });
    libs = Promise.all([window.jspdf ? 0 : one("vendor/jspdf.umd.min.js"), window.htmlToImage ? 0 : one("vendor/html-to-image.js")]).catch(e => { libs = null; throw e });
    return libs;
  }
  /** Rasterises each A4 page exactly as rendered by the browser (keeps RTL & nekudot intact). */
  async function toPdfBlob(html, title, onProgress) {
    await Promise.all([ensureFonts(), loadLibs()]);
    const host = document.getElementById("exportHost");
    host.innerHTML = html;
    try {
      const pages = [...host.querySelectorAll(".page")];
      if (fontCSS === null) { try { fontCSS = await htmlToImage.getFontEmbedCSS(pages[0]); } catch (e) { fontCSS = ""; } }
      const pdf = new jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      pdf.setProperties({ title, creator: "Gemara Translator", subject: "Guemarah to PDF" });
      for (let i = 0; i < pages.length; i++) {
        onProgress && onProgress(i, pages.length);
        const el = pages[i];
        const canvas = await htmlToImage.toCanvas(el, {
          pixelRatio: 2, backgroundColor: "#ffffff", fontEmbedCSS: fontCSS || undefined,
          width: el.offsetWidth, height: el.offsetHeight, cacheBust: false,
        });
        if (i) pdf.addPage("a4", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }
      onProgress && onProgress(pages.length, pages.length);
      return pdf.output("blob");
    } finally { host.innerHTML = ""; }
  }

  /** Browser print (vector, selectable text) — the website's original method. */
  function print(html, title, lang) {
    const fontsHref = new URL("fonts/fonts.css", location.href).href;
    const pdfCss = [...document.styleSheets].find(s => s.href && /pdf\.css/.test(s.href));
    let css = ""; try { css = [...pdfCss.cssRules].map(r => r.cssText).join("\n"); } catch (e) { }
    const prev = document.title; document.title = title;
    const f = document.createElement("iframe");
    f.title = title; f.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0";
    f.onload = () => {
      const w = f.contentWindow; const restore = () => { document.title = prev };
      addEventListener("afterprint", restore, { once: true }); if (w) w.addEventListener("afterprint", restore, { once: true });
      const go = () => { try { w.focus(); w.print() } catch (e) { window.print() } };
      (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 300));
    };
    f.srcdoc = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="${fontsHref}"><style>body{margin:0;background:#fff}${css}</style></head><body>${html}</body></html>`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 120000);
  }

  /* ---- Saving & sharing (web + Capacitor native) ---- */
  const cap_ = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;
  const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b) });

  async function save(blob, name) {
    const P = cap_();
    if (P && P.Filesystem) {
      await P.Filesystem.writeFile({ path: name, data: await blobToB64(blob), directory: "DOCUMENTS", recursive: true });
      return "native";
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "web";
  }
  async function share(blob, name, title) {
    const P = cap_();
    if (P && P.Filesystem && P.Share) {
      const r = await P.Filesystem.writeFile({ path: name, data: await blobToB64(blob), directory: "CACHE" });
      await P.Share.share({ title, files: [r.uri] });
      return "native";
    }
    const file = new File([blob], name, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "aborted"; }
    }
    await save(blob, name); return "downloaded";
  }
  const canPrint = () => !cap_() && typeof window.print === "function";

  return { loadLibs, render, meanings, fileBase, ensureFonts, toPdfBlob, print, save, share, canPrint, isNative: () => !!cap_(), esc, TT };
})();
