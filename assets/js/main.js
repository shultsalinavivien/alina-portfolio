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
    var W = 1000, H = 679, lonMin = -90, lonMax = 180, latMin = -40, latMax = 80;
    function px(lon) { return (lon - lonMin) / (lonMax - lonMin) * W; }
    var mY = function (l) { l = Math.max(-84, Math.min(84, l)); return Math.log(Math.tan(Math.PI / 4 + l * Math.PI / 360)); };
    var yTop = mY(latMax), yBot = mY(latMin);
    function py(lat) { return (yTop - mY(lat)) / (yTop - yBot) * H; }
    function mk(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    var readout = document.getElementById("mapreadout");
    var defaultMsg = readout ? readout.textContent : "";
    var grat = mk("g", {});
    for (var lon = -60; lon <= 180; lon += 30) { var lx = px(lon); grat.appendChild(mk("line", { x1: lx, y1: 0, x2: lx, y2: H, "class": "graticule" })); }
    for (var lat = -40; lat <= 80; lat += 20) { var ly = py(lat); grat.appendChild(mk("line", { x1: 0, y1: ly, x2: W, y2: ly, "class": "graticule" })); }
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

  /* ---- Julia set (generative) ---- */
  (function () {
    var canvas = document.getElementById("julia-canvas");
    if (!canvas) return;
    var wrap = document.getElementById("julia");
    var hint = document.getElementById("julia-hint");
    var glo = { alpha: true, premultipliedAlpha: false };
    var gl = canvas.getContext("webgl", glo) || canvas.getContext("experimental-webgl", glo);
    if (!gl) { if (hint) hint.textContent = "WebGL not supported"; return; }
    var vertSrc = "attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }";
    var fragSrc = [
      "precision highp float;",
      "uniform vec2 u_res; uniform vec2 u_c;",
      "void main(){",
      "  vec2 uv = (gl_FragCoord.xy - 0.5*u_res)/min(u_res.x,u_res.y);",
      "  uv *= 2.6;",
      "  vec2 z = uv; vec2 c = u_c; const float MAX = 180.0; float n = 0.0;",
      "  for(int i=0;i<180;i++){",
      "    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;",
      "    if(dot(z,z) > 64.0) break;",
      "    n += 1.0;",
      "  }",
      "  if(n >= MAX){ gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }",
      "  float sn = n + 1.0 - log(log(sqrt(dot(z,z))))/log(2.0);",
      "  float t = clamp(sn/40.0, 0.0, 1.0);",
      "  float g = pow(1.0 - t, 0.85);",
      "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - g);",
      "}"
    ].join("\n");
    function compile(t, s) { var sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "u_res"), uC = gl.getUniformLocation(prog, "u_c");
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(wrap.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(wrap.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
    resize();
    var target = { x: -0.74, y: 0.18 }, cur = { x: -0.74, y: 0.18 };
    function setFromPoint(x, y) {
      var r = wrap.getBoundingClientRect();
      var mx = (x - r.left) / r.width, my = (y - r.top) / r.height;
      target.x = -0.85 + mx * 1.25; target.y = 0.45 - my * 0.90;
      if (hint) hint.style.opacity = "0";
    }
    wrap.addEventListener("mousemove", function (e) { setFromPoint(e.clientX, e.clientY); });
    wrap.addEventListener("touchmove", function (e) { if (e.touches[0]) setFromPoint(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    function frame() {
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uC, cur.x, cur.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---- skills chips: invert while passing the viewport centre ---- */
  var chips = document.querySelectorAll(".chip");
  if (chips.length) {
    var chipTick = false;
    var updateChips = function () {
      chipTick = false;
      var triggerY = window.innerHeight * 0.8;
      for (var i = 0; i < chips.length; i++) {
        var r = chips[i].getBoundingClientRect();
        chips[i].classList.toggle("is-inverted", (r.top + r.bottom) / 2 < triggerY);
      }
    };
    var onChipScroll = function () { if (!chipTick) { chipTick = true; requestAnimationFrame(updateChips); } };
    window.addEventListener("scroll", onChipScroll, { passive: true });
    window.addEventListener("resize", onChipScroll);
    updateChips();
  }

  /* ---- ink cursor (calligraphy trail) ---- */
  (function () {
    if (!window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (root.getAttribute("data-page") === "home") return;
    var canvas = document.createElement("canvas");
    canvas.id = "ink-cursor";
    (document.body || document.documentElement).appendChild(canvas);
    var ctx = canvas.getContext("2d"), dpr = 1;
    function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener("resize", size);
    function readInk() { return (getComputedStyle(document.documentElement).getPropertyValue("--ink") || "#15140F").trim() || "#15140F"; }
    var col = readInk(), pts = [], last = null, life = 520, running = false;
    window.addEventListener("mousemove", function (e) {
      var now = performance.now(), x = e.clientX, y = e.clientY, w = 6;
      if (last) { var dx = x - last.x, dy = y - last.y, d = Math.sqrt(dx * dx + dy * dy), speed = d / Math.max(1, now - last.t); w = Math.max(0.6, Math.min(7, 7 - speed * 6)); }
      pts.push({ x: x, y: y, t: now, w: w }); last = { x: x, y: y, t: now };
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });
    function frame(now) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      while (pts.length && now - pts[0].t > life) pts.shift();
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = col;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], alpha = Math.max(0, 1 - (now - b.t) / life);
        ctx.globalAlpha = alpha * 0.85; ctx.lineWidth = b.w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (pts.length) requestAnimationFrame(frame); else running = false;
    }
    var mo = new MutationObserver(function () { col = readInk(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  })();

  /* ---- custom cursor dot (black circle; larger on home) ---- */
  (function () {
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    var dot = document.createElement("div");
    dot.id = "cursor-dot";
    if (root.getAttribute("data-page") === "home") dot.className = "cursor-dot--lg";
    (document.body || root).appendChild(dot);
    root.classList.add("has-cursor-dot");
    window.addEventListener("mousemove", function (e) {
      dot.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
      dot.style.opacity = "1";
    }, { passive: true });
    document.addEventListener("mouseleave", function () { dot.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { dot.style.opacity = "1"; });
  })();

  /* ---- header clock (viewer's local time) ---- */
  (function () {
    var row = document.querySelector(".site-header__row");
    if (!row) return;
    var clock = document.createElement("span");
    clock.className = "clock"; clock.setAttribute("aria-hidden", "true");
    row.appendChild(clock);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    function tick() { var d = new Date(); clock.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); }
    tick(); setInterval(tick, 1000);
  })();

  /* ---- expeditions: reveal Russia-map dots one-by-one on scroll ---- */
  var expRows = document.querySelectorAll(".expeditions .row2");
  var expDots = document.querySelectorAll(".exp-dot");
  if (expRows.length && expDots.length) {
    var expTick = false;
    var updateExp = function () {
      expTick = false;
      var triggerY = window.innerHeight * 0.85;
      for (var i = 0; i < expRows.length && i < expDots.length; i++) {
        var r = expRows[i].getBoundingClientRect();
        expDots[i].classList.toggle("on", (r.top + r.bottom) / 2 < triggerY);
      }
    };
    var onExpScroll = function () { if (!expTick) { expTick = true; requestAnimationFrame(updateExp); } };
    window.addEventListener("scroll", onExpScroll, { passive: true });
    window.addEventListener("resize", onExpScroll);
    updateExp();
  }

  /* ---- footer year ---- */
  var yr = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = yr; });
})();
