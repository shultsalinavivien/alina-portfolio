/* Alina Shults — portfolio. Theme toggle (light/dark, persisted, follows
   system by default), mobile nav, scroll reveal, footer year. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  /* ---- theme ---- */
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

  function currentTheme() {
    var a = root.getAttribute("data-theme");
    if (a) return a;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function syncToggles() {
    var t = currentTheme();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      var lab = b.querySelector("[data-theme-label]");
      if (lab) lab.textContent = t === "dark" ? "Light" : "Dark";
    });
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    syncToggles();
  }

  document.addEventListener("click", function (e) {
    var tt = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (tt) { e.preventDefault(); setTheme(currentTheme() === "dark" ? "light" : "dark"); return; }
    var nt = e.target.closest && e.target.closest("[data-nav-toggle]");
    if (nt) {
      var nav = document.getElementById("nav");
      if (nav) { var open = nav.classList.toggle("is-open"); nt.setAttribute("aria-expanded", open ? "true" : "false"); }
    }
  });
  syncToggles();

  /* ---- scroll reveal ---- */
  var els = document.querySelectorAll("[data-reveal]");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("is-visible"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- places map ---- */
  var mapEl = document.getElementById("placemap");
  if (mapEl) {
    var NS = "http://www.w3.org/2000/svg";
    var dataEl = document.getElementById("placedata");
    var places = [];
    try { places = JSON.parse(dataEl.textContent); } catch (e) { places = []; }
    var W = 1000, H = 393, lonMin = 2, lonMax = 165, latMin = 8, latMax = 72;
    function px(lon) { return (lon - lonMin) / (lonMax - lonMin) * W; }
    function py(lat) { return (latMax - lat) / (latMax - latMin) * H; }
    function mk(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    var readout = document.getElementById("mapreadout");
    var defaultMsg = readout ? readout.textContent : "";
    var grat = mk("g", {});
    for (var lon = 20; lon < lonMax; lon += 20) { var lx = px(lon); grat.appendChild(mk("line", { x1: lx, y1: 0, x2: lx, y2: H, "class": "graticule" })); }
    for (var lat = 20; lat <= 70; lat += 10) { var ly = py(lat); grat.appendChild(mk("line", { x1: 0, y1: ly, x2: W, y2: ly, "class": "graticule" })); }
    mapEl.appendChild(grat);
    places.forEach(function (p) {
      var x = px(p.lon), y = py(p.lat);
      var g = mk("g", { "class": "pt pt--" + p.cat, tabindex: "0", role: "button", "aria-label": p.place + " — " + p.what });
      var shape;
      if (p.cat === "design") shape = mk("rect", { x: x - 4, y: y - 4, width: 8, height: 8, "class": "mk" });
      else if (p.cat === "build") shape = mk("path", { d: "M" + x + " " + (y - 5.5) + "L" + (x + 5.5) + " " + y + "L" + x + " " + (y + 5.5) + "L" + (x - 5.5) + " " + y + "Z", "class": "mk" });
      else if (p.cat === "hub") shape = mk("circle", { cx: x, cy: y, r: 5.5, "class": "mk" });
      else shape = mk("circle", { cx: x, cy: y, r: 4, "class": "mk hollow" });
      g.appendChild(shape);
      var t = mk("text", { "class": "pt-label", y: y + 3.5 });
      if (x > 800) { t.setAttribute("x", x - 10); t.setAttribute("text-anchor", "end"); } else { t.setAttribute("x", x + 10); }
      t.textContent = p.place;
      g.appendChild(t);
      function on() { g.classList.add("is-active"); if (readout) readout.textContent = p.place + " — " + p.what; mapEl.appendChild(g); }
      function off() { g.classList.remove("is-active"); if (readout) readout.textContent = defaultMsg; }
      g.addEventListener("mouseenter", on); g.addEventListener("mouseleave", off);
      g.addEventListener("focus", on); g.addEventListener("blur", off);
      mapEl.appendChild(g);
    });
  }

  /* ---- footer year ---- */
  var yr = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = yr; });
})();
