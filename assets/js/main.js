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

  /* ---- skyline bits (above the "Let's build" CTA) ---- */
  (function () {
    var widgets = document.querySelectorAll(".skybits");
    if (!widgets.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function readInk() { return (getComputedStyle(document.documentElement).getPropertyValue("--ink") || "#15140F").trim() || "#15140F"; }
    var ink = readInk();
    new MutationObserver(function () { ink = readInk(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    [].forEach.call(widgets, function (wrap) {
      var canvas = wrap.querySelector("canvas");
      if (!canvas) { canvas = document.createElement("canvas"); wrap.appendChild(canvas); }
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var W = 0, H = 0, dpr = 1, BIT = 4, bits = [];
      var mx = -1e4, my = -1e4, active = false, t = 0;

      function build() {
        bits = [];
        var bx = 0, step = BIT + 3;
        while (bx < W) {
          var bw = 16 + Math.floor(Math.random() * 42);
          var bh = Math.round(H * (0.32 + Math.random() * 0.6));
          var x0 = bx, x1 = Math.min(W, bx + bw), top = H - bh;
          for (var x = x0; x < x1; x += step) {
            for (var y = H; y >= top; y -= step) {
              var edge = Math.round((y - top) / step);   // 0 at the building top
              var keep = edge < 4 ? (0.2 + edge * 0.2) : 0.92;
              if (Math.random() > keep) continue;
              bits.push({ hx: x, hy: y, x: x, y: y, vx: 0, vy: 0, a: 1, fly: 0, edge: edge });
            }
          }
          bx += bw + 3 + Math.floor(Math.random() * 5);
        }
      }
      function detach(b, dirx, diry, boost) {
        var len = Math.sqrt(dirx * dirx + diry * diry) || 1, sp = (0.3 + Math.random() * 0.7) * (boost || 1);
        b.vx = (dirx / len) * sp + (Math.random() - 0.5) * 0.3;
        b.vy = -(0.4 + Math.random() * 0.8) * (boost || 1);   // bits rise off the rooftops
        b.fly = 1; b.a = 0.95;
      }
      function draw(stat) {
        t += 0.01;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = ink;
        for (var i = 0; i < bits.length; i++) {
          var b = bits[i], alpha;
          if (b.fly === 0) {
            b.x = b.hx + Math.sin(t * 1.2 + b.hx * 0.06) * 0.35;
            b.y = b.hy + Math.cos(t * 1.0 + b.hy * 0.06) * 0.35;
            if (stat !== true) {
              if (b.edge < 3 && Math.random() < 0.004) detach(b, Math.random() - 0.5, -1, 1);
              if (active) { var ex = b.x - mx, ey = b.y - my; if (ex * ex + ey * ey < 5000) detach(b, ex, ey, 1.6); }
            }
            alpha = b.edge < 4 ? (0.28 + b.edge * 0.16) : 0.9;
          } else {
            b.x += b.vx; b.y += b.vy; b.vy += 0.012; b.vx *= 0.99;
            b.a -= 0.014;
            if (b.a <= 0) { b.fly = 0; b.a = 1; b.x = b.hx; b.y = b.hy; }
            alpha = b.a * 0.85;
          }
          ctx.globalAlpha = alpha < 0 ? 0 : alpha;
          ctx.fillRect(b.x - BIT / 2, b.y - BIT / 2, BIT, BIT);
        }
        ctx.globalAlpha = 1;
        if (stat !== true) requestAnimationFrame(draw);
      }
      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = wrap.clientWidth; H = wrap.clientHeight;
        canvas.width = Math.max(1, Math.floor(W * dpr));
        canvas.height = Math.max(1, Math.floor(H * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build(); draw(true);
      }
      wrap.addEventListener("mousemove", function (e) { var r = wrap.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; active = true; });
      wrap.addEventListener("mouseleave", function () { active = false; });
      window.addEventListener("resize", resize);
      if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
      resize();
      if (!reduce) requestAnimationFrame(draw);
    });
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

  /* ---- binary cursor trail (1/0 bits; non-home pages) ---- */
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
    var col = readInk(), digits = [], last = null, running = false, life = 780;
    new MutationObserver(function () { col = readInk(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("mousemove", function (e) {
      var now = performance.now();
      if (!last || Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y) > 7) {
        digits.push({ x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.5, vy: 0.45 + Math.random() * 0.85, t: now,
          ch: Math.random() < 0.5 ? "0" : "1", size: 9 + Math.floor(Math.random() * 4) });
        if (digits.length > 150) digits.shift();
        last = { x: e.clientX, y: e.clientY };
      }
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });
    function frame(now) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = col;
      for (var i = digits.length - 1; i >= 0; i--) {
        var d = digits[i], age = now - d.t;
        if (age > life) { digits.splice(i, 1); continue; }
        d.x += d.vx; d.y += d.vy; d.vy += 0.012;
        ctx.globalAlpha = Math.max(0, 1 - age / life) * 0.9;
        ctx.font = d.size + "px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(d.ch, d.x, d.y);
      }
      ctx.globalAlpha = 1;
      if (digits.length) requestAnimationFrame(frame); else running = false;
    }
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

  /* ---- header phyllotaxis mark (grows & turns clockwise on scroll) ---- */
  (function () {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var host = document.createElement("a");          // clickable → home
    host.className = "phyllo-mark";
    host.href = "index.html";
    host.setAttribute("aria-label", "Home");
    nav.appendChild(host);
    var cv = document.createElement("canvas");
    host.appendChild(cv);
    var ctx = cv.getContext("2d");

    var CFG = {
      spacing: 3.0,        // px between seeds (smaller = denser grain)
      dotFactor: 0.74,     // seed size vs spacing
      fitRatio: 0.5,       // head radius vs the little box
      twistDeg: 240,       // clockwise rotation; fully turned at the page bottom
      minSeeds: 1,         // starts from a single small dot at the top of the page
      fadeFrac: 0.08,      // soft growing edge
      GA: 137.50776 * Math.PI / 180,
      ease: 0.14
    };
    var TW = CFG.twistDeg * Math.PI / 180;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function rgb(name, fb) {
      var v = (getComputedStyle(root).getPropertyValue(name) || fb).trim() || fb;
      v = v.replace("#", "");
      if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      return [parseInt(v.substr(0, 2), 16), parseInt(v.substr(2, 2), 16), parseInt(v.substr(4, 2), 16)];
    }
    var C0, C1;
    function readColors() { C0 = rgb("--ink", "#15140F"); C1 = rgb("--ink-2", "#6F6B62"); }
    readColors();

    var W = 0, H = 0, scale = 1, maxR = 1, N = 0, fw = 8, cur = 0, target = 0;
    function resize() {
      var tgl = document.querySelector(".theme-toggle");          // match the Dark/Light button's box
      var box = tgl ? Math.round(tgl.getBoundingClientRect().height) : 0;
      if (box < 8) box = 32;                                      // fallback before the button lays out
      host.style.width = box + "px"; host.style.height = box + "px";
      var r = host.getBoundingClientRect();
      W = Math.round(r.width) || box; H = Math.round(r.height) || box;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      maxR = Math.min(W, H) * CFG.fitRatio;
      scale = CFG.spacing / 1.9;
      N = Math.max(30, Math.round(Math.pow(maxR / scale, 2)));
      fw = Math.max(6, Math.round(N * CFG.fadeFrac));
    }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function smooth(t) { return t * t * (3 - 2 * t); }

    function draw(p) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var revealed = CFG.minSeeds + (N - CFG.minSeeds) * p;     // one dot at p=0, full head at p=1
      var count = Math.min(N, Math.ceil(revealed)), tw = p * TW;
      for (var i = 0; i < count; i++) {
        var edge = revealed - i; if (edge <= 0) continue;
        var op = reduce ? 1 : clamp(edge, 0, 1);               // opacity: solid once born (1-seed AA)
        var sz = reduce ? 1 : (0.45 + 0.55 * smooth(clamp(edge / fw, 0, 1)));  // size eases in
        var r = scale * Math.sqrt(i), n = r / maxR, ang = i * CFG.GA + tw;
        var x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
        var dot = scale * CFG.dotFactor * sz;
        var R = Math.round(C0[0] + (C1[0] - C0[0]) * n), G = Math.round(C0[1] + (C1[1] - C0[1]) * n), B = Math.round(C0[2] + (C1[2] - C0[2]) * n);
        ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + (op * 0.95).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(x, y, dot, 0, 6.2831853); ctx.fill();
      }
    }
    function progress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;   // full page
      return max > 0 ? clamp(window.pageYOffset / max, 0, 1) : 0;             // 0 at top → 1 only at the very bottom
    }

    var running = false;
    function frame() {
      cur += (target - cur) * CFG.ease;
      var moving = Math.abs(target - cur) >= 0.0006;
      if (!moving) cur = target;
      draw(cur);
      running = moving; if (moving) requestAnimationFrame(frame);
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

    resize();
    if (reduce) {
      cur = target = 1; draw(1);
      window.addEventListener("resize", function () { resize(); draw(1); });
    } else {
      cur = target = progress(); draw(cur);
      window.addEventListener("scroll", function () { target = progress(); kick(); }, { passive: true });
      window.addEventListener("resize", function () { resize(); target = progress(); cur = target; draw(cur); });
    }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { resize(); draw(cur); });
      ro.observe(host);
      var tgl0 = document.querySelector(".theme-toggle");
      if (tgl0) ro.observe(tgl0);                                 // re-fit if the button resizes (font load)
    }

    var mo = new MutationObserver(function () { readColors(); draw(cur); });
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)"), onmq = function () { readColors(); draw(cur); };
      if (mq.addEventListener) mq.addEventListener("change", onmq); else if (mq.addListener) mq.addListener(onmq);
    }
  })();

  /* ---- expeditions: light up each region as its row scrolls in ---- */
  var expRows = document.querySelectorAll(".expeditions .row2");
  var expRegions = document.querySelectorAll(".exp-region");
  if (expRows.length && expRegions.length) {
    var expTick = false;
    var updateExp = function () {
      expTick = false;
      var triggerY = window.innerHeight * 0.85;
      var shown = {};
      for (var i = 0; i < expRows.length; i++) {
        var r = expRows[i].getBoundingClientRect();
        if ((r.top + r.bottom) / 2 < triggerY) shown[i] = true;
      }
      for (var j = 0; j < expRegions.length; j++) {
        var rows = (expRegions[j].getAttribute("data-rows") || "").split(/\s+/);
        var on = false;
        for (var k = 0; k < rows.length; k++) { if (shown[rows[k]]) { on = true; break; } }
        expRegions[j].classList.toggle("on", on);
      }
    };
    var onExpScroll = function () { if (!expTick) { expTick = true; requestAnimationFrame(updateExp); } };
    window.addEventListener("scroll", onExpScroll, { passive: true });
    window.addEventListener("resize", onExpScroll);
    updateExp();
  }

  /* ---- click-to-play video facade (no YouTube chrome on the cover) ---- */
  document.querySelectorAll(".video__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-yt");
      if (!id) return;
      var box = btn.closest(".video");
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1&modestbranding=1";
      f.title = btn.getAttribute("aria-label") || "Video";
      f.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      f.setAttribute("allowfullscreen", "");
      box.innerHTML = "";
      box.appendChild(f);
    });
  });

  /* ---- panel lightbox (click a B&W panel → zoom the colour version) ---- */
  (function () {
    var triggers = document.querySelectorAll("[data-zoom]");
    if (!triggers.length) return;
    var box, imgEl, lastFocus;
    function build() {
      box = document.createElement("div");
      box.className = "lightbox";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", "Panel preview");
      box.hidden = true;
      imgEl = document.createElement("img");
      imgEl.className = "lightbox__img";   /* colour: no grayscale filter here */
      imgEl.alt = "";
      box.appendChild(imgEl);
      var close = document.createElement("button");
      close.type = "button";
      close.className = "lightbox__close";
      close.setAttribute("aria-label", "Close");
      close.textContent = "×";
      box.appendChild(close);
      document.body.appendChild(box);
      box.addEventListener("click", function (e) { if (e.target === box || e.target === close) hide(); });
    }
    function show(src, alt) {
      if (!box) build();
      imgEl.src = src; imgEl.alt = alt || "";
      box.hidden = false;
      root.classList.add("lb-open");
      lastFocus = document.activeElement;
      box.querySelector(".lightbox__close").focus();
    }
    function hide() {
      if (!box || box.hidden) return;
      box.hidden = true;
      imgEl.removeAttribute("src");
      root.classList.remove("lb-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
    [].slice.call(triggers).forEach(function (im) {
      im.addEventListener("click", function () { show(im.getAttribute("data-zoom"), im.alt); });
    });
  })();

  /* ---- flipbook (page through the embedded brandbook as images) ---- */
  (function () {
    var books = document.querySelectorAll(".flipbook");
    if (!books.length) return;
    [].slice.call(books).forEach(function (book) {
      var base = book.getAttribute("data-flip-base");
      var ext = book.getAttribute("data-flip-ext") || ".jpg";
      var count = parseInt(book.getAttribute("data-flip-count"), 10) || 1;
      var page = book.querySelector(".flip__page");
      var prev = book.querySelector(".flip__prev");
      var next = book.querySelector(".flip__next");
      var counter = book.querySelector(".flip__count");
      var stage = book.querySelector(".flip__stage");
      var i = 1;
      function src(n) { return base + n + ext; }
      function preload(n) { if (n >= 1 && n <= count) { (new Image()).src = src(n); } }
      function render() {
        page.src = src(i);
        page.alt = "Khabarovsk brandbook — page " + i;
        if (counter) counter.textContent = i + " / " + count;
        prev.disabled = i <= 1; next.disabled = i >= count;
        preload(i + 1); preload(i - 1);
      }
      function go(n) { n = Math.min(count, Math.max(1, n)); if (n !== i) { i = n; render(); } }
      prev.addEventListener("click", function () { go(i - 1); });
      next.addEventListener("click", function () { go(i + 1); });
      stage.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); }
        else if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); }
      });
      var x0 = null;
      stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener("touchend", function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        x0 = null;
      }, { passive: true });
      render();
    });
  })();

  /* ---- footer year ---- */
  var yr = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (e) { e.textContent = yr; });
})();
