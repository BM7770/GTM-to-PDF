/* GTM to PDF — motion layer.
 * 1) Scroll reveal: cards, tiles and list items fade/slide in as they enter
 *    the screen, scrolling down or up (they reset when they leave).
 * 2) Touch feedback: every button/link gets a ripple from the touch point
 *    (the press scale itself is in CSS).
 */
const GTMotion = (() => {
  // Animations are always on (Android battery saver turns on "reduce motion" and would hide them).
  const reduce = false;
  const SEL = ".hero,.sec,.tile,.card,.list,.work,.tr-item,.group-t,.word,.hitem,.rcard,.stat,.lang-opt,.lvl,.drop,.picker,.pv-sheets .page,.sign,.seg,.search,.chips,.empty";
  let io = null;

  function observer() {
    if (io || reduce || !("IntersectionObserver" in window)) return io;
    io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add("mv-in");
        else if (e.boundingClientRect.bottom < 0 || e.boundingClientRect.top > innerHeight) { e.target.classList.remove("mv-in"); e.target.style.removeProperty("--rv-d"); }
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    return io;
  }
  /** Tags new elements for reveal; the first screenful gets a short stagger. */
  function scan(root) {
    const o = observer(); if (!o) return;
    let k = 0;
    root.querySelectorAll(SEL).forEach(el => {
      if (el.classList.contains("mv")) return;
      el.classList.add("mv");
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) { el.style.setProperty("--rv-d", Math.min(k++ * 45, 360) + "ms"); }
      o.observe(el);
    });
  }
  function watch(root) {
    scan(root);
    if (reduce) return;
    new MutationObserver(() => { scan(root); root.querySelectorAll(".seg").forEach(sg => { if (!sg.querySelector(":scope > .ind")) placeInd(sg, false); }); }).observe(root, { childList: true, subtree: true });
  }

  /* Ripple on press */
  const TAP = "button,a,.chip,label.opt-row";
  function ripple(e) {
    if (reduce) return;
    const el = e.target.closest(TAP); if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement("span"); s.className = "rpl";
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.classList.add("rp-host"); el.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
  document.addEventListener("pointerdown", ripple, { passive: true });

  /* Sliding pill for segmented controls (.seg). */
  function placeInd(seg, animate) {
    const on = seg.querySelector(":scope > button.on"); if (!on) return;
    let ind = seg.querySelector(":scope > .ind");
    if (!ind) { ind = document.createElement("i"); ind.className = "ind no-anim"; seg.appendChild(ind); animate = false; }
    ind.classList.toggle("no-anim", !animate);
    ind.style.left = on.offsetLeft + "px"; ind.style.width = on.offsetWidth + "px";
    if (!animate) requestAnimationFrame(() => ind.classList.remove("no-anim"));
  }
  function segs(root) { (root || document).querySelectorAll(".seg").forEach(s => placeInd(s, false)); }
  document.addEventListener("click", e => {
    const b = e.target.closest(".seg > button"); if (!b) return;
    const seg = b.parentElement; setTimeout(() => { if (seg.isConnected) placeInd(seg, true); }, 0);
  });
  addEventListener("resize", () => segs());

  return { watch, scan, reduce, segs, placeInd };
})();
