/* GTM to PDF — data layer for the three works (Gemara, Tanach, Mishnah).
 * Texts load on demand from each project's data folder; the vocabulary of each
 * work loads from its packed file (app/vocab/*.bin), never from plain batch files. */
const GTData = (() => {
  const E = GTEngine;
  const RAW_G = "https://raw.githubusercontent.com/BM7770/Guemarah-to-PDF/main/";

  /* Gemara: canonical order, Hebrew names and Seder. */
  const META = [
    ["Berakhot", "ברכות", "Z"],
    ["Shabbat", "שבת", "M"], ["Eruvin", "עירובין", "M"], ["Pesachim", "פסחים", "M"], ["Shekalim", "שקלים", "M"], ["Yoma", "יומא", "M"], ["Sukkah", "סוכה", "M"], ["Beitzah", "ביצה", "M"], ["Rosh Hashanah", "ראש השנה", "M"], ["Taanit", "תענית", "M"], ["Megillah", "מגילה", "M"], ["Moed Katan", "מועד קטן", "M"], ["Chagigah", "חגיגה", "M"],
    ["Yevamot", "יבמות", "N"], ["Ketubot", "כתובות", "N"], ["Nedarim", "נדרים", "N"], ["Nazir", "נזיר", "N"], ["Sotah", "סוטה", "N"], ["Gittin", "גיטין", "N"], ["Kiddushin", "קידושין", "N"],
    ["Bava Kamma", "בבא קמא", "Nz"], ["Bava Metzia", "בבא מציעא", "Nz"], ["Bava Batra", "בבא בתרא", "Nz"], ["Sanhedrin", "סנהדרין", "Nz"], ["Makkot", "מכות", "Nz"], ["Shevuot", "שבועות", "Nz"], ["Avodah Zarah", "עבודה זרה", "Nz"], ["Horayot", "הוריות", "Nz"],
    ["Zevachim", "זבחים", "K"], ["Menachot", "מנחות", "K"], ["Chullin", "חולין", "K"], ["Bekhorot", "בכורות", "K"], ["Arakhin", "ערכין", "K"], ["Temurah", "תמורה", "K"], ["Keritot", "כריתות", "K"], ["Meilah", "מעילה", "K"], ["Tamid", "תמיד", "K"],
    ["Niddah", "נדה", "T"],
  ];
  /* Mishnah: names as in the Mishnah-to-PDF data folder. */
  const META_M = [
    ["Berakhot", "ברכות", "Z"], ["Peah", "פאה", "Z"], ["Demai", "דמאי", "Z"], ["Kilayim", "כלאים", "Z"], ["Sheviit", "שביעית", "Z"], ["Terumot", "תרומות", "Z"], ["Maasrot", "מעשרות", "Z"], ["Maaser Sheni", "מעשר שני", "Z"], ["Challah", "חלה", "Z"], ["Orlah", "ערלה", "Z"], ["Bikkurim", "ביכורים", "Z"],
    ["Shabbat", "שבת", "M"], ["Eruvin", "עירובין", "M"], ["Pesachim", "פסחים", "M"], ["Shekalim", "שקלים", "M"], ["Yoma", "יומא", "M"], ["Sukkah", "סוכה", "M"], ["Beitzah", "ביצה", "M"], ["Rosh Hashanah", "ראש השנה", "M"], ["Ta'anit", "תענית", "M"], ["Megillah", "מגילה", "M"], ["Moed Katan", "מועד קטן", "M"], ["Chagigah", "חגיגה", "M"],
    ["Yevamot", "יבמות", "N"], ["Ketubot", "כתובות", "N"], ["Nedarim", "נדרים", "N"], ["Nazir", "נזיר", "N"], ["Sotah", "סוטה", "N"], ["Gittin", "גיטין", "N"], ["Kiddushin", "קידושין", "N"],
    ["Bava Kamma", "בבא קמא", "Nz"], ["Bava Metzia", "בבא מציעא", "Nz"], ["Bava Batra", "בבא בתרא", "Nz"], ["Sanhedrin", "סנהדרין", "Nz"], ["Makkot", "מכות", "Nz"], ["Shevuot", "שבועות", "Nz"], ["Eduyot", "עדיות", "Nz"], ["Avodah Zarah", "עבודה זרה", "Nz"], ["Horayot", "הוריות", "Nz"],
    ["Zevachim", "זבחים", "K"], ["Menachot", "מנחות", "K"], ["Chullin", "חולין", "K"], ["Bekhorot", "בכורות", "K"], ["Arakhin", "ערכין", "K"], ["Temurah", "תמורה", "K"], ["Keritot", "כריתות", "K"], ["Meilah", "מעילה", "K"], ["Tamid", "תמיד", "K"], ["Middot", "מידות", "K"], ["Kinnim", "קינים", "K"],
    ["Kelim", "כלים", "T"], ["Oholot", "אהלות", "T"], ["Negaim", "נגעים", "T"], ["Parah", "פרה", "T"], ["Tahorot", "טהרות", "T"], ["Mikvaot", "מקואות", "T"], ["Niddah", "נדה", "T"], ["Makhshirin", "מכשירין", "T"], ["Zavim", "זבים", "T"], ["Tevul Yom", "טבול יום", "T"], ["Yadayim", "ידים", "T"], ["Oktzin", "עוקצין", "T"],
  ];
  /* Tanach: book names as inside the Tanach-to-PDF CSV files, with Hebrew names and section. */
  const META_T = [
    ["Genesis", "בראשית", "torah"], ["Exodus", "שמות", "torah"], ["Leviticus", "ויקרא", "torah"], ["Numbers", "במדבר", "torah"], ["Deuteronomy", "דברים", "torah"],
    ["Joshua", "יהושע", "neviim"], ["Judges", "שופטים", "neviim"], ["I Samuel", "שמואל א", "neviim"], ["II Samuel", "שמואל ב", "neviim"], ["I Kings", "מלכים א", "neviim"], ["II Kings", "מלכים ב", "neviim"], ["Isaiah", "ישעיהו", "neviim"], ["Jeremiah", "ירמיהו", "neviim"], ["Ezekiel", "יחזקאל", "neviim"],
    ["Hosea", "הושע", "neviim"], ["Joel", "יואל", "neviim"], ["Amos", "עמוס", "neviim"], ["Obadiah", "עובדיה", "neviim"], ["Jonah", "יונה", "neviim"], ["Micah", "מיכה", "neviim"], ["Nahum", "נחום", "neviim"], ["Habakkuk", "חבקוק", "neviim"], ["Zephaniah", "צפניה", "neviim"], ["Haggai", "חגי", "neviim"], ["Zechariah", "זכריה", "neviim"], ["Malachi", "מלאכי", "neviim"],
    ["Psalms", "תהילים", "ketuvim"], ["Proverbs", "משלי", "ketuvim"], ["Job", "איוב", "ketuvim"], ["Song of Songs", "שיר השירים", "ketuvim"], ["Ruth", "רות", "ketuvim"], ["Lamentations", "איכה", "ketuvim"], ["Ecclesiastes", "קהלת", "ketuvim"], ["Esther", "אסתר", "ketuvim"], ["Daniel", "דניאל", "ketuvim"], ["Ezra", "עזרא", "ketuvim"], ["Nehemiah", "נחמיה", "ketuvim"], ["I Chronicles", "דברי הימים א", "ketuvim"], ["II Chronicles", "דברי הימים ב", "ketuvim"],
  ];
  const METAS = { gemara: META, mishnah: META_M, tanach: META_T };
  const SEDARIM = [["Z", "sederZ", "זרעים"], ["M", "sederM", "מועד"], ["N", "sederN", "נשים"], ["Nz", "sederNz", "נזיקין"], ["K", "sederK", "קדשים"], ["T", "sederT", "טהרות"]];
  const SECTIONS = [["torah", "Torah", "תורה"], ["neviim", "Nevi'im", "נביאים"], ["ketuvim", "Ketuvim", "כתובים"]];

  let index = null;
  const W = {}; // work -> {list: Map, texts: Map, pending: Map, lex, vocab, base, raw}
  for (const w of ["gemara", "mishnah", "tanach"]) {
    const meta = METAS[w];
    W[w] = { list: new Map(), texts: new Map(), pending: new Map(), lex: null, base: "../", raw: w === "gemara" ? RAW_G : "", vocabPromise: null,
      order: new Map(meta.map((x, i) => [x[0], i])), he: new Map(meta.map(x => [x[0], x[1]])), grp: new Map(meta.map(x => [x[0], x[2]])),
      vocab: { state: "idle", words: 0 } };
  }

  async function getBuf(url, asText) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error("HTTP " + r.status); return asText ? r.text() : r.arrayBuffer() }
  const enc = p => p.split("/").map(encodeURIComponent).join("/");
  async function fetchWorkFile(w, path) {
    const x = W[w];
    try { return await getBuf(x.base + enc(path), true); }
    catch (e) { if (!x.raw) throw e; return await getBuf(x.raw + enc(path), true); }
  }

  function upsert(w, o) {
    const x = W[w], prev = x.list.get(o.m) || {};
    x.list.set(o.m, { ...prev, ...o, he: x.he.get(o.m) || prev.he || "", grp: x.grp.get(o.m) || prev.grp || "" });
  }
  function boundsOf(d) {
    const keys = Object.keys(d).sort((a, b) => E.ix(parseInt(a), a.slice(-1)) - E.ix(parseInt(b), b.slice(-1)));
    return { first: keys[0], last: keys[keys.length - 1], amudim: keys.length };
  }

  async function loadIndex() {
    const r = await fetch("data-index.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    index = await r.json();
    for (const [w, def] of Object.entries(index.works || {})) {
      if (!W[w]) continue;
      W[w].base = def.base; if (def.raw) W[w].raw = def.raw; W[w].vocabFile = def.vocab;
      for (const it of def.items) upsert(w, { ...it });
    }
    await loadImported();
  }

  /* IndexedDB "gt" / store "t" — the same store the Gemara website uses for imported tractates. */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open("gt", 1); r.onupgradeneeded = () => r.result.createObjectStore("t"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  async function idbPut(k, v) { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction("t", "readwrite"); tx.objectStore("t").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error) }) }
  async function idbAll() { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction("t").objectStore("t").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) }) }
  async function loadImported() {
    const x = W.gemara;
    try {
      for (const o of await idbAll()) if (o && o.m && o.d) {
        if (!x.list.has(o.m) || x.list.get(o.m).imported) { x.texts.set(o.m, o.d); upsert("gemara", { m: o.m, imported: true, ...boundsOf(o.d) }); }
      }
    } catch (e) { }
  }
  async function importCSV(text, filename) {
    const o = E.csvToT((text || "").replace(/^﻿/, ""), filename);
    if (!o) return null;
    const x = W.gemara; x.texts.set(o.m, o.d);
    const known = x.list.get(o.m);
    upsert("gemara", { m: o.m, ...boundsOf(o.d), imported: !(known && known.file) });
    try { await idbPut(o.m, o); } catch (e) { }
    return o.m;
  }

  /** Loads the text of one tractate / book. Tanach files can hold several books. */
  async function text(w, m) {
    const x = W[w];
    if (x.texts.has(m)) return x.texts.get(m);
    const meta = x.list.get(m); if (!meta || !meta.file) throw new Error("tractateMissing");
    if (x.pending.has(meta.file)) { await x.pending.get(meta.file); return x.texts.get(m); }
    const p = fetchWorkFile(w, meta.file).then(s => {
      const fn = meta.file.split("/").pop();
      if (w === "gemara") { const o = E.csvToT(s, fn); if (!o) throw new Error("unrecognized"); x.texts.set(m, o.d); }
      else if (w === "mishnah") { const o = E.csvMishnah(s, fn); if (!o) throw new Error("unrecognized"); x.texts.set(m, o.d); }
      else for (const o of E.csvTanach(s)) x.texts.set(o.m, o.d);
    }).finally(() => x.pending.delete(meta.file));
    x.pending.set(meta.file, p); await p;
    if (!x.texts.has(m)) throw new Error("unrecognized");
    return x.texts.get(m);
  }

  /** Vocabulary of one work, from its packed file. */
  function vocab(w) {
    const x = W[w];
    if (x.vocabPromise) return x.vocabPromise;
    x.vocab.state = "loading";
    x.vocabPromise = (async () => {
      try {
        const raw = await E.unpackVocab(await getBuf(x.vocabFile || `vocab/${w[0]}.json`, true));
        x.lex = E.buildLexFromRows(E.parseBatchFile(raw));
        x.vocab.words = x.lex.entries.length; x.vocab.state = x.lex.entries.length ? "ready" : "error";
      } catch (e) { x.vocab.state = "error"; x.vocabPromise = null; console.warn("vocab", w, e); }
      return x.vocab;
    })();
    return x.vocabPromise;
  }

  function sorted(w) {
    const x = W[w];
    return [...x.list.values()].sort((a, b) => (x.order.has(a.m) ? x.order.get(a.m) : 999) - (x.order.has(b.m) ? x.order.get(b.m) : 999) || a.m.localeCompare(b.m));
  }
  function dafRange(m) {
    const t = W.gemara.list.get(m); if (!t) return [];
    const s = parseInt(t.first) || 2, e = parseInt(t.last) || s;
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }
  /** {chapter: units} for a Mishnah tractate or Tanach book. */
  const chapters = (w, m) => (W[w].list.get(m) || {}).chapters || {};

  return {
    loadIndex, vocab, text, importCSV, sorted, dafRange, chapters, SEDARIM, SECTIONS,
    get: (w, m) => W[w].list.get(m), heName: (w, m) => W[w].he.get(m) || "", lex: w => W[w].lex, vocabState: w => W[w].vocab, hasText: (w, m) => W[w].texts.has(m),
  };
})();
