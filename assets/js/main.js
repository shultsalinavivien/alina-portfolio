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
    var W = 1000, H = 444, lonMin = -90, lonMax = 180, latMin = -40, latMax = 80;
    function px(lon) { return (lon - lonMin) / (lonMax - lonMin) * W; }
    function py(lat) { return (latMax - lat) / (latMax - latMin) * H; }
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

  /* ---- footer year ---- */
  var yr = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = yr; });
})();
