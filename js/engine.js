/*
 * Gemara Translator — matching engine.
 *
 * This is a faithful port of the logic in the website's index.html
 * (parseCSV, csvToT, parseBatchFile, buildLexFromRows, lookup2, matchText,
 * normV/vocTokens/stemV). The behaviour is intentionally identical so the
 * app and the website produce the same vocabulary lists from the same
 * /data and /batch files. Works in the browser (window.GTEngine) and in Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GTEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clean = x => (x || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

  function parseCSV(s) {
    const rows = []; let r = [], f = "", q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c == '"') { if (s[i + 1] == '"') { f += '"'; i++ } else q = false } else f += c }
      else if (c == '"') q = true;
      else if (c == ",") { r.push(f); f = "" }
      else if (c == "\n") { r.push(f); rows.push(r); r = []; f = "" }
      else if (c != "\r") f += c;
    }
    if (f || r.length) { r.push(f); rows.push(r) }
    return rows;
  }

  /** Tractate CSV (or generic ref,text CSV) → {m: tractate, d: {"2a": text, ...}} */
  function csvToT(s, filename = "") {
    const rows = parseCSV((s || "").replace(/^﻿/, "")); if (!rows.length) return null;
    const d = {}; let m = "";
    for (const row of rows) {
      const ref = (row[0] || "").trim();
      if (ref === "Index Title") { m = (row[1] || "").trim(); continue }
      const hit = /^(.+?)\s+(\d+[ab]):\d+(?:-\d+)?$/i.exec(ref);
      if (!hit) continue;
      if (!m) m = hit[1].trim();
      const daf = hit[2].toLowerCase(), body = clean(row.slice(1).join(" "));
      if (body) d[daf] = (d[daf] ? d[daf] + " " : "") + body;
    }
    if (m && Object.keys(d).length) return { m, d };
    const header = rows[0].map(x => (x || "").trim().toLowerCase());
    const refCol = header.findIndex(x => /^(ref|reference|refs|source|citation|daf|page)$/.test(x));
    const textCol = header.findIndex(x => /^(text|hebrew|aramaic|hebrew text|text hebrew|content|original|gemara)$/.test(x));
    const titleCol = header.findIndex(x => /^(tractate|massechet|index title|book)$/.test(x));
    if (refCol >= 0 || textCol >= 0) {
      const data = rows.slice(1);
      if (titleCol >= 0) { for (const row of data) { const v = (row[titleCol] || "").trim(); if (v) { m = v; break } } }
      for (const row of data) {
        const ref = (row[refCol] || "").trim();
        const hit = /^(.*?)(?:\s+)?(\d+[ab])(?::\d+(?:-\d+)?)?$/i.exec(ref);
        if (!hit) continue;
        if (!m && hit[1]) m = hit[1].trim();
        const daf = hit[2].toLowerCase();
        const body = clean(textCol >= 0 ? (row[textCol] || "") : row.filter((_, i) => i !== refCol).join(" "));
        if (body) d[daf] = (d[daf] ? d[daf] + " " : "") + body;
      }
    }
    if (!Object.keys(d).length) {
      for (const row of rows) {
        if ((row[0] || "").trim() === "Index Title") { m = (row[1] || "").trim(); continue }
        const ref = (row[0] || "").trim();
        const hit = /^(.*?)(?:\s+)?(\d+[ab])(?::\d+(?:-\d+)?)?$/i.exec(ref);
        if (!hit) continue;
        if (!m && hit[1]) m = hit[1].trim();
        const body = clean(row.slice(1).join(" ")), daf = hit[2].toLowerCase();
        if (body) d[daf] = (d[daf] ? d[daf] + " " : "") + body;
      }
    }
    if (!m && filename) m = filename.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();
    return m && Object.keys(d).length ? { m, d } : null;
  }

  const norm = s => (s || "").replace(/<[^>]*>/g, " ").replace(/־/g, " ").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();

  function parseBatchFile(text) {
    const source = (text || "").replace(/^﻿/, "");
    const first = source.split(/\r?\n/).find(line => line.trim()) || "";
    const delimiter = first.includes("|") ? "|" : first.includes("\t") ? "\t" : null;
    if (delimiter) return source.split(/\r?\n/).map(line => line.split(delimiter).map(x => x.trim())).filter(row => row.some(Boolean));
    return parseCSV(source).map(row => row.map(x => (x || "").trim()));
  }

  function buildLexFromRows(rows) {
    const byTerm = new Map();
    for (const f of rows) {
      if (!f || f.length < 6 || !f[0] || !/^\d+$/.test(f[1] || "")) continue;
      const col11 = Number(f[10]);
      const last = Number(f[f.length - 1]);
      const hasCol11Difficulty = f.length >= 11 && Number.isInteger(col11) && col11 >= 1 && col11 <= 4;
      const hasFinalDifficulty = f.length >= 11 && Number.isInteger(last) && last >= 1 && last <= 4;
      const difficultyIndex = hasCol11Difficulty ? 10 : (hasFinalDifficulty ? f.length - 1 : -1);
      const level = difficultyIndex >= 0 ? Number(f[difficultyIndex]) : Number(f[1]);
      if (!Number.isInteger(level) || level < 1 || level > 4) continue;
      const term = f[0].trim(), key = norm(term); if (!key) continue;
      const tr = { pt: f[3] || "", en: f[4] || "", es: f[5] || "", he: f[6] || "", fr: f[7] || "", it: f[8] || "", ru: f[9] || "" };
      let ent = byTerm.get(key);
      if (!ent) { ent = { ar: term, level, tl: f[2] || "", tr, aliases: new Set([term]), count: 0 }; byTerm.set(key, ent) }
      else {
        if (!ent.tl && f[2]) ent.tl = f[2];
        for (const lang of Object.keys(tr)) if (!ent.tr[lang] && tr[lang]) ent.tr[lang] = tr[lang];
      }
      const extraFields = f.slice(10).filter((value, index) => 10 + index !== difficultyIndex);
      for (const alias of extraFields.flatMap(value => (value || "").split(";")).map(x => x.trim()).filter(Boolean)) ent.aliases.add(alias);
    }
    const lex = { single: new Map(), phr: new Map(), maxN: 1, entries: [...byTerm.values()] };
    for (const ent of lex.entries) for (const alias of ent.aliases) {
      const k = norm(alias); if (!k) continue; const n = k.split(" ").length;
      if (n > 1) { if (!lex.phr.has(k)) lex.phr.set(k, ent); lex.maxN = Math.max(lex.maxN, n) }
      else if (!lex.single.has(k)) lex.single.set(k, ent);
    }
    return lex;
  }

  function lookup2(lex, w) {
    const m = lex.single; if (m.has(w)) return [m.get(w), 0];
    const P = "וכהבלמדש";
    for (let i = 1; i <= 2 && w.length - i >= 2; i++) { if (!P.includes(w[i - 1])) break; const b = w.slice(i); if (m.has(b)) return [m.get(b), i] }
    return null;
  }

  const NKMARK = /[ְ-ׇֽֿׁׂ]/g;
  const normV = s => (s || "").replace(/<[^>]*>/g, " ").replace(/־/g, " ").replace(/[֑-֯׀׃-׆]/g, "").replace(/[^א-תְ-ׇֽֿׁׂ\s]/g, " ").replace(/\s+/g, " ").trim();
  function vocTokens(text, n) { const t = normV(text).split(/\s+/).filter(x => x.replace(NKMARK, "")); return t.length === n ? t : null }
  function stemV(tok, skip) { if (!skip) return tok; let c = 0, i = 0; for (; i < tok.length; i++) { if (/[א-ת]/.test(tok[i])) { if (c === skip) break; c++ } } return tok.slice(i) }

  /** Returns {words, cov, total}. Words keep the order of first appearance. */
  function matchText(lex, text) {
    if (!lex || !lex.entries || !lex.entries.length) throw new Error("vocabNotLoaded");
    const words = norm(text).split(/\s+/).filter(Boolean), found = new Map(); let cov = 0;
    const vt = vocTokens(text, words.length);
    for (let i = 0; i < words.length;) {
      let hit = null, n = 0;
      for (let k = Math.min(lex.maxN, words.length - i); k >= 2; k--) { const key = words.slice(i, i + k).join(" "); if (lex.phr.has(key)) { hit = lex.phr.get(key); n = k; break } }
      let skip = 0; if (!hit) { const r = lookup2(lex, words[i]); if (r) { hit = r[0]; skip = r[1]; n = 1 } }
      if (hit) {
        cov += n; let item = found.get(hit.ar);
        if (!item) { item = { ...hit, count: 0, _e: new Map(), _a: new Map() }; found.set(hit.ar, item) }
        item.count++;
        if (vt) { const f = n > 1 ? vt.slice(i, i + n).join(" ") : stemV(vt[i], skip); const mp = norm(f) === norm(hit.ar) ? item._e : item._a; mp.set(f, (mp.get(f) || 0) + 1) }
        i += n;
      } else i++;
    }
    const best = mp => { let b = "", bc = 0; for (const [f, c] of mp) if (c > bc) { b = f; bc = c } return b };
    const outW = [...found.values()];
    outW.forEach(x => { const v = best(x._e) || best(x._a); delete x._e; delete x._a; delete x.aliases; if (v && v !== x.ar && v.replace(NKMARK, "") !== v) x.voc = v });
    return { words: outW, cov: words.length ? cov / words.length : 0, total: words.length };
  }

  /** Cumulative level filter + sort, as on the website (pick()). */
  function pick(words, lvl, sort) {
    let w = words.slice();
    if (String(lvl) !== "all") w = w.filter(x => Number(x.level) >= Number(lvl));
    if (sort == "dif") w.sort((a, b) => b.level - a.level);
    return w;
  }

  /** Index helpers for daf/amud ranges (same as the website's ix()). */
  const ix = (d, a) => (+d) * 2 + (a == "b" ? 1 : 0);
  function rangeKeys(fromDaf, fromAmud, toDaf, toAmud) {
    let i = ix(fromDaf, fromAmud), j = toDaf ? ix(toDaf, toAmud) : i;
    if (j < i) [i, j] = [j, i];
    let capped = false; if (j - i >= 10) { j = i + 9; capped = true }
    const keys = []; for (let x = i; x <= j; x++) keys.push(Math.floor(x / 2) + (x % 2 ? "b" : "a"));
    return { keys, capped };
  }

  /* ---- Mishnah (port of Mishnah-to-PDF): header chapter,mishnah,hebrew; name from the file name ---- */
  function csvMishnah(s, filename = "") {
    const rows = parseCSV((s || "").replace(/^﻿/, "")); if (!rows.length) return null;
    const h0 = rows[0].map(x => (x || "").trim().toLowerCase());
    const ci = h0.indexOf("chapter"), mi = h0.indexOf("mishnah"), hi = h0.indexOf("hebrew");
    if (ci < 0 || mi < 0 || hi < 0) return null;
    const md = {};
    for (const row of rows.slice(1)) { const c = (row[ci] || "").trim(), n = (row[mi] || "").trim(); if (!/^\d+$/.test(c) || !/^\d+$/.test(n)) continue; const body = clean(row[hi] || ""); if (body) md[+c + ":" + (+n)] = body }
    const mm = String(filename || "").replace(/^.*\//, "").replace(/\.csv$/i, "").replace(/_/g, " ").trim();
    return mm && Object.keys(md).length ? { m: mm, d: md } : null;
  }
  /* ---- Tanach (port of Tanach-to-PDF): header sefer,chapter,verse,hebrew; may hold several books ---- */
  function csvTanach(s) {
    const rows = parseCSV((s || "").replace(/^﻿/, "")); if (!rows.length) return [];
    const header = rows[0].map(x => (x || "").trim().toLowerCase());
    const bi = header.indexOf("sefer"), ci = header.indexOf("chapter"), vi = header.indexOf("verse"), hi = header.indexOf("hebrew");
    if (bi < 0 || ci < 0 || vi < 0 || hi < 0) return [];
    const books = new Map();
    for (const row of rows.slice(1)) {
      const b = (row[bi] || "").trim(), c = (row[ci] || "").trim(), v = (row[vi] || "").trim();
      if (!b || !/^\d+$/.test(c) || !/^\d+$/.test(v)) continue;
      const body = clean(row[hi] || ""); if (!body) continue;
      if (!books.has(b)) books.set(b, {}); books.get(b)[+c + ":" + (+v)] = body;
    }
    return [...books].map(([m, d]) => ({ m, d }));
  }
  /** Chapter/unit selection exactly as on the Mishnah and Tanach sites (unit blank = whole chapter). */
  function selectCV(d, c1, u1, c2, u2, max) {
    const all = Object.keys(d).map(k => { const p = k.split(":"); return { c: +p[0], n: +p[1], k } }).sort((a, b) => a.c - b.c || a.n - b.n);
    const lastOf = c => { const a = all.filter(x => x.c === c); return a.length ? a[a.length - 1].n : 0 };
    const sc = +c1, sm = u1 ? +u1 : 1; let ec, em;
    if (c2) { ec = +c2; em = u2 ? +u2 : lastOf(ec) }
    else if (u2) { ec = sc; em = +u2 }
    else if (!u1) { ec = sc; em = lastOf(sc) }
    else { ec = sc; em = sm }
    let a = sc * 1000 + sm, b = ec * 1000 + em; if (b < a) [a, b] = [b, a];
    let sel = all.filter(x => { const v = x.c * 1000 + x.n; return v >= a && v <= b });
    let capped = false; if (sel.length > max) { sel = sel.slice(0, max); capped = true }
    return { sel, capped };
  }
  function lookupPlain(lex, w) { const r = lookup2(lex, w); return r ? r[0] : null }
  /** Mishnah matcher: keeps the exact source spelling (with niqqud) as the display form. */
  function matchTextMishnah(lex, text) {
    if (!lex || !lex.entries || !lex.entries.length) throw new Error("vocabNotLoaded");
    const originalWords = (String(text || "").match(/[א-ת][֑-ׇא-ת]*/g) || []);
    const words = originalWords.map(w => norm(w)).filter(Boolean), found = new Map(); let cov = 0;
    for (let i = 0; i < words.length;) {
      let hit = null, n = 0;
      for (let k = Math.min(lex.maxN, words.length - i); k >= 2; k--) { const key = words.slice(i, i + k).join(" "); if (lex.phr.has(key)) { hit = lex.phr.get(key); n = k; break } }
      if (!hit) { hit = lookupPlain(lex, words[i]); n = hit ? 1 : 0 }
      if (hit) { cov += n; let item = found.get(hit.ar); if (!item) { item = { ...hit, count: 0, disp: originalWords.slice(i, i + n).join(" ") }; delete item.aliases; found.set(hit.ar, item) } item.count++; i += n } else i++;
    }
    return { words: [...found.values()], cov: words.length ? cov / words.length : 0, total: words.length };
  }
  /** Tanach matcher: the display form is the source token(s) with all Hebrew marks. */
  function matchTextTanach(lex, text) {
    if (!lex || !lex.entries || !lex.entries.length) throw new Error("vocabNotLoaded");
    const rawWords = String(text).split(/\s+/).filter(Boolean);
    const words = norm(text).split(/\s+/).filter(Boolean), found = new Map(); let cov = 0;
    const sourceForm = (start, count) => rawWords.slice(start, start + count).map(token => token.replace(/[^֐-׿יִ-ﭏ]/g, "")).filter(Boolean).join(" ");
    for (let i = 0; i < words.length;) {
      let hit = null, n = 0;
      for (let k = Math.min(lex.maxN, words.length - i); k >= 2; k--) { const key = words.slice(i, i + k).join(" "); if (lex.phr.has(key)) { hit = lex.phr.get(key); n = k; break } }
      if (!hit) { hit = lookupPlain(lex, words[i]); n = hit ? 1 : 0 }
      if (hit) { cov += n; let item = found.get(hit.ar); if (!item) { item = { ...hit, count: 0, disp: sourceForm(i, n) }; delete item.aliases; found.set(hit.ar, item) } item.count++; i += n } else i++;
    }
    return { words: [...found.values()], cov: words.length ? cov / words.length : 0, total: words.length };
  }
  /** Packed vocabulary key (obfuscation of the shipped vocab files, see scripts/build-app.mjs). */
  const VOCAB_KEY = "gtm•pdf·v1‖b.m";
  async function unpackVocab(packed) {
    const b64 = typeof packed === "string" ? JSON.parse(packed).d : packed.d;
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const k = new TextEncoder().encode(VOCAB_KEY), u = Uint8Array.from(bin, c => c.charCodeAt(0));
    for (let i = 0; i < u.length; i++) u[i] ^= k[i % k.length];
    const stream = new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }

  return { csvMishnah, csvTanach, selectCV, matchTextMishnah, matchTextTanach, VOCAB_KEY, unpackVocab, clean, parseCSV, csvToT, norm, normV, parseBatchFile, buildLexFromRows, lookup2, matchText, pick, rangeKeys, ix, NKMARK };
});
