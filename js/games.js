/* La Mujer de Rojo — 10 minijuegos. Cada juego: Games[i](stage, ui, onWin) -> destroy() */
(function () {
  const Games = [];
  window.Games = Games;

  // ---------- helpers ----------
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function mkCanvas(parent, w, h) {
    const c = el("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = "min(100%, " + w + "px)";
    c.style.aspectRatio = w + " / " + h;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    parent.appendChild(c);
    return { c, ctx, w, h };
  }
  // posición del puntero en coordenadas lógicas del canvas
  function ptr(cv, e) {
    const r = cv.c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * cv.w / r.width, y: (e.clientY - r.top) * cv.h / r.height };
  }
  function pad(parent, defs) {
    const p = el("div", "pad");
    defs.forEach(d => {
      const b = el("button", "", d.label);
      b.setAttribute("aria-label", d.aria || d.label);
      const down = e => { e.preventDefault(); b.classList.add("on"); d.down && d.down(); };
      const up = e => { if (!b.classList.contains("on")) return; b.classList.remove("on"); d.up && d.up(); };
      b.addEventListener("pointerdown", down);
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, up));
      b.addEventListener("contextmenu", e => e.preventDefault());
      p.appendChild(b);
    });
    parent.appendChild(p);
    return p;
  }
  function keys(map) {
    const kd = e => { const f = map[e.key]; if (f && f.down) { e.preventDefault(); if (!e.repeat || f.repeat) f.down(); } };
    const ku = e => { const f = map[e.key]; if (f && f.up) { e.preventDefault(); f.up(); } };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }
  function overlay(stage, ui, msg, onRetry) {
    const o = el("div", "overlay");
    o.innerHTML = '<div><div class="big">' + msg + '</div><br></div>';
    const b = el("button", "btn", ui.again);
    b.onclick = () => { o.remove(); onRetry(); };
    o.firstChild.appendChild(b);
    stage.appendChild(o);
    return o;
  }
  function hud(stage) { const h = el("div", "hud"); stage.parentNode.insertBefore(h, stage); return h; }
  function loop(fn) {
    let on = true, last = performance.now();
    function f(t) { if (!on) return; const dt = Math.min(50, t - last); last = t; fn(dt / 16.667, t); requestAnimationFrame(f); }
    requestAnimationFrame(f);
    return () => { on = false; };
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  // ---------- 1. Plataformas estilo Super Mario ----------
  Games[0] = function (stage, ui, onWin) {
    const W = 480, H = 270, GY = 230;
    const cv = mkCanvas(stage, W, H), ctx = cv.ctx;
    const hd = hud(stage);
    const ground = [[0, 600], [680, 1200], [1290, 1800], [1900, 2400], [2480, 3450]];
    const plats = [[300, 175, 90], [520, 150, 80], [760, 175, 100], [1000, 145, 80], [1205, 180, 70], [1450, 165, 100], [1650, 125, 80], [1830, 175, 60], [2100, 155, 100], [2300, 115, 80], [2410, 180, 60], [2650, 155, 90], [2900, 175, 100]];
    const enemyDef = [[350, 580], [800, 1150], [1350, 1750], [2000, 2350], [2600, 2950], [3000, 3200]];
    const DOOR = 3330;
    let P, enemies, coins, camX, score, dead, won, input = { l: 0, r: 0, j: 0 };
    const city = Array.from({ length: 40 }, (_, i) => ({ x: i * 90 + Math.random() * 40, w: 50 + Math.random() * 40, h: 60 + Math.random() * 110 }));
    function reset() {
      P = { x: 40, y: GY - 26, w: 16, h: 26, vx: 0, vy: 0, on: false, face: 1 };
      enemies = enemyDef.map(([a, b]) => ({ x: a + 20, a, b, v: 1.1, alive: true, y: GY - 12 }));
      coins = [];
      plats.forEach(([x, y, w]) => { for (let i = 0; i < Math.floor(w / 30); i++) coins.push({ x: x + 15 + i * 30, y: y - 22, got: false }); });
      [[150, 200], [200, 200], [900, 200], [1500, 200], [2200, 200], [2750, 200], [3100, 200]].forEach(([x, y]) => coins.push({ x, y, got: false }));
      camX = 0; score = 0; dead = false; won = false;
    }
    reset();
    const stopKeys = keys({
      ArrowLeft: { down: () => input.l = 1, up: () => input.l = 0 },
      ArrowRight: { down: () => input.r = 1, up: () => input.r = 0 },
      ArrowUp: { down: () => input.j = 1, up: () => input.j = 0 },
      " ": { down: () => input.j = 1, up: () => input.j = 0 }
    });
    pad(stage, [
      { label: "◀", down: () => input.l = 1, up: () => input.l = 0 },
      { label: "▶", down: () => input.r = 1, up: () => input.r = 0 },
      { label: "⤒", down: () => input.j = 1, up: () => input.j = 0 }
    ]);
    function die() {
      if (dead) return; dead = true;
      overlay(stage, ui, ui.lose, () => { reset(); });
    }
    function solidsAt() {
      const s = ground.map(([a, b]) => ({ x: a, y: GY, w: b - a }));
      plats.forEach(([x, y, w]) => s.push({ x, y, w }));
      return s;
    }
    const solids = solidsAt();
    const stop = loop(dt => {
      if (!dead && !won) {
        const acc = 0.5 * dt;
        if (input.l) { P.vx -= acc; P.face = -1; }
        if (input.r) { P.vx += acc; P.face = 1; }
        if (!input.l && !input.r) P.vx *= Math.pow(0.8, dt);
        P.vx = Math.max(-3.4, Math.min(3.4, P.vx));
        if (input.j && P.on) { P.vy = -11; P.on = false; }
        if (!input.j && P.vy < -4) P.vy = -4; // salto variable
        P.vy += 0.55 * dt; if (P.vy > 12) P.vy = 12;
        const prevB = P.y + P.h;
        P.x += P.vx * dt; P.y += P.vy * dt;
        if (P.x < 0) { P.x = 0; P.vx = 0; }
        P.on = false;
        if (P.vy >= 0) for (const s of solids) {
          if (P.x + P.w > s.x && P.x < s.x + s.w && prevB <= s.y + 1 && P.y + P.h >= s.y) { P.y = s.y - P.h; P.vy = 0; P.on = true; }
        }
        if (P.y > H + 40) die();
        for (const e of enemies) {
          if (!e.alive) continue;
          e.x += e.v * dt; if (e.x < e.a || e.x > e.b) e.v *= -1;
          const ew = 26, eh = 12;
          if (P.x + P.w > e.x && P.x < e.x + ew && P.y + P.h > e.y && P.y < e.y + eh) {
            if (P.vy > 0 && prevB <= e.y + 6) { e.alive = false; P.vy = -7; score += 5; }
            else die();
          }
        }
        for (const c of coins) if (!c.got && Math.abs(P.x + 8 - c.x) < 14 && Math.abs(P.y + 13 - c.y) < 18) { c.got = true; score++; }
        if (P.x > DOOR) { won = true; setTimeout(onWin, 500); }
        camX += ((P.x - W * 0.35) - camX) * 0.15;
        camX = Math.max(0, Math.min(DOOR + 120 - W, camX));
      }
      draw();
      hd.textContent = "😊 " + score;
    });
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c1430"); g.addColorStop(1, "#24345e");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f4f1e6"; ctx.beginPath(); ctx.arc(400 - camX * 0.05, 45, 18, 0, 7); ctx.fill();
      ctx.fillStyle = "#18223f";
      city.forEach(b => { const x = b.x - camX * 0.3; const xx = ((x % 3600) + 3600) % 3600 - 100; ctx.fillRect(xx, GY - b.h, b.w, b.h); });
      ctx.fillStyle = "#f5d76e";
      city.forEach((b, i) => { const x = b.x - camX * 0.3; const xx = ((x % 3600) + 3600) % 3600 - 100; if (i % 2) ctx.fillRect(xx + 10, GY - b.h + 15, 5, 7); });
      ctx.save(); ctx.translate(-Math.round(camX), 0);
      ground.forEach(([a, b]) => { ctx.fillStyle = "#3b2a22"; ctx.fillRect(a, GY, b - a, H - GY); ctx.fillStyle = "#f2f6ff"; ctx.fillRect(a, GY, b - a, 6); });
      const cols = ["#c8102e", "#2a5caa", "#e8c370", "#3d8b5a", "#7a3fa0"];
      plats.forEach(([x, y, w], i) => {
        for (let k = 0; k < w; k += 15) { ctx.fillStyle = cols[(i + k / 15) % 5 | 0]; ctx.fillRect(x + k, y, 14, 12); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x + k + 2, y + 3, 10, 2); }
        ctx.fillStyle = "#f2f6ff"; ctx.fillRect(x, y - 3, w, 3);
      });
      coins.forEach(c => { if (c.got) return; ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill(); ctx.strokeStyle = "#7a4b00"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(c.x, c.y + 1, 3.5, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.fillStyle = "#7a4b00"; ctx.fillRect(c.x - 3, c.y - 3, 1.6, 2); ctx.fillRect(c.x + 1.5, c.y - 3, 1.6, 2); });
      enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = "#c8102e"; ctx.fillRect(e.x, e.y, 20, 12);
        ctx.fillStyle = "#f3d9a8"; ctx.beginPath(); const tx = e.v > 0 ? e.x + 20 : e.x; const d = e.v > 0 ? 8 : -8; ctx.moveTo(tx, e.y); ctx.lineTo(tx + d, e.y + 6); ctx.lineTo(tx, e.y + 12); ctx.fill();
        ctx.fillStyle = "#222"; ctx.fillRect(tx + d * 0.8 - 1, e.y + 5, 2, 2);
        ctx.fillStyle = "#fff"; ctx.fillRect(e.x + 4, e.y + 3, 3, 3); ctx.fillRect(e.x + 11, e.y + 3, 3, 3);
      });
      // puerta del aula
      ctx.fillStyle = "#5a1020"; ctx.fillRect(DOOR - 4, GY - 64, 44, 64);
      ctx.fillStyle = "#c8102e"; ctx.fillRect(DOOR, GY - 60, 36, 60);
      ctx.fillStyle = "#e8c370"; ctx.beginPath(); ctx.arc(DOOR + 29, GY - 30, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "16px serif"; ctx.fillText("❤", DOOR + 11, GY - 38);
      // Luis
      const x = P.x, y = P.y;
      ctx.fillStyle = "#2b2f3a"; ctx.fillRect(x + 2, y + 18, 5, 8); ctx.fillRect(x + 9, y + 18, 5, 8);
      ctx.fillStyle = "#2a5caa"; ctx.fillRect(x, y + 8, 16, 11);
      ctx.fillStyle = "#f0c9a0"; ctx.fillRect(x + 3, y, 10, 9);
      ctx.fillStyle = "#3a2618"; ctx.fillRect(x + 2, y - 1, 12, 3); ctx.fillRect(P.face > 0 ? x + 2 : x + 12, y, 2, 5);
      ctx.fillStyle = "#111"; ctx.fillRect(P.face > 0 ? x + 10 : x + 5, y + 3, 2, 2);
      ctx.fillStyle = "#c8102e"; ctx.fillRect(x, y + 8, 16, 2);
      ctx.restore();
      // barra de progreso
      ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(10, 8, W - 20, 4);
      ctx.fillStyle = "#e8c370"; ctx.fillRect(10, 8, (W - 20) * Math.min(1, P.x / DOOR), 4);
    }
    return () => { stop(); stopKeys(); };
  };

  // ---------- 2. Tetris ----------
  Games[1] = function (stage, ui, onWin) {
    const COLS = 10, ROWS = 18, S = 22, GOAL = 4;
    const cv = mkCanvas(stage, COLS * S, ROWS * S), ctx = cv.ctx;
    const hd = hud(stage);
    const SH = [
      [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]]
    ];
    const COL = ["#2a5caa", "#c8102e", "#1f3f8a", "#e8c370", "#4d7cd1", "#a30d26", "#88a9e8"];
    let B, cur, lines, over, acc, done;
    function newPiece() {
      const i = Math.random() * 7 | 0;
      cur = { m: SH[i].map(r => r.slice()), c: i, x: 3, y: 0 };
      if (hit(cur.m, cur.x, cur.y)) { over = true; overlay(stage, ui, ui.lose, reset); }
    }
    function reset() { B = Array.from({ length: ROWS }, () => Array(COLS).fill(-1)); lines = 0; over = false; acc = 0; done = false; newPiece(); }
    function hit(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) {
        const X = x + c, Y = y + r; if (X < 0 || X >= COLS || Y >= ROWS || (Y >= 0 && B[Y][X] >= 0)) return true;
      } return false;
    }
    function lock() {
      cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) B[cur.y + r][cur.x + c] = cur.c; }));
      for (let r = ROWS - 1; r >= 0; r--) if (B[r].every(v => v >= 0)) { B.splice(r, 1); B.unshift(Array(COLS).fill(-1)); lines++; r++; }
      if (lines >= GOAL) { done = true; setTimeout(onWin, 400); return; }
      newPiece();
    }
    function move(dx) { if (!over && !done && !hit(cur.m, cur.x + dx, cur.y)) cur.x += dx; }
    function rot() {
      if (over || done) return;
      const m = cur.m[0].map((_, c) => cur.m.map(r => r[c]).reverse());
      for (const k of [0, -1, 1, -2, 2]) if (!hit(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; return; }
    }
    function down() { if (over || done) return; if (!hit(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); acc = 0; }
    function drop() { if (over || done) return; while (!hit(cur.m, cur.x, cur.y + 1)) cur.y++; lock(); }
    reset();
    let soft = 0;
    const stopKeys = keys({
      ArrowLeft: { down: () => move(-1), repeat: true }, ArrowRight: { down: () => move(1), repeat: true },
      ArrowUp: { down: rot }, ArrowDown: { down: () => soft = 1, up: () => soft = 0 }, " ": { down: drop }
    });
    let rep = null;
    const hold = f => ({ down: () => { f(); clearInterval(rep); rep = setInterval(f, 120); }, up: () => clearInterval(rep) });
    pad(stage, [
      Object.assign({ label: "◀" }, hold(() => move(-1))),
      { label: "⟳", down: rot },
      Object.assign({ label: "▼" }, hold(down)),
      Object.assign({ label: "▶" }, hold(() => move(1))),
      { label: "⤓", down: drop }
    ]);
    function cell(x, y, c) {
      ctx.fillStyle = COL[c]; roundRect(ctx, x * S + 1, y * S + 1, S - 2, S - 2, 4); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x * S + S / 2, y * S + S / 2, 5, 0, 7); ctx.stroke();
    }
    const stop = loop(dt => {
      if (!over && !done) { acc += dt * 16.667; if (acc > (soft ? 50 : 650)) down(); }
      ctx.fillStyle = "#0e1730"; ctx.fillRect(0, 0, cv.w, cv.h);
      ctx.strokeStyle = "rgba(188,214,255,.06)";
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * S, 0); ctx.lineTo(x * S, cv.h); ctx.stroke(); }
      B.forEach((row, y) => row.forEach((v, x) => { if (v >= 0) cell(x, y, v); }));
      if (cur && !done) {
        let gy = cur.y; while (!hit(cur.m, cur.x, gy + 1)) gy++;
        ctx.globalAlpha = .2; cur.m.forEach((row, r) => row.forEach((v, c) => { if (v) cell(cur.x + c, gy + r, cur.c); })); ctx.globalAlpha = 1;
        cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) cell(cur.x + c, cur.y + r, cur.c); }));
      }
      hd.textContent = ui.lines + ": " + lines + " / " + GOAL;
    });
    return () => { stop(); stopKeys(); clearInterval(rep); };
  };

  // ---------- 3. Dominó ----------
  Games[2] = function (stage, ui, onWin) {
    const PIPS = { 0: [], 1: [[50, 50]], 2: [[25, 25], [75, 75]], 3: [[25, 25], [50, 50], [75, 75]], 4: [[25, 25], [75, 25], [25, 75], [75, 75]], 5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]] };
    const wrap = el("div"); stage.appendChild(wrap);
    let chain, hand, sel;
    function gen() {
      for (let tries = 0; tries < 500; tries++) {
        const seq = [Math.random() * 7 | 0], used = new Set();
        let ok = true;
        for (let i = 0; i < 8; i++) {
          const a = seq[seq.length - 1];
          const opts = shuffle([0, 1, 2, 3, 4, 5, 6]).filter(b => !used.has(Math.min(a, b) + "-" + Math.max(a, b)));
          if (!opts.length) { ok = false; break; }
          used.add(Math.min(a, opts[0]) + "-" + Math.max(a, opts[0])); seq.push(opts[0]);
        }
        if (ok) return seq;
      }
    }
    function reset() {
      const seq = gen();
      const tiles = []; for (let i = 0; i < 8; i++) tiles.push([seq[i], seq[i + 1]]);
      chain = [tiles[3]];
      hand = shuffle(tiles.filter((_, i) => i !== 3)).map(t => Math.random() < .5 ? t : [t[1], t[0]]);
      sel = -1; render();
    }
    function tileEl(t) {
      const d = el("div", "tile");
      t.forEach(v => { const h = el("div", "h"); PIPS[v].forEach(([x, y]) => { const i = el("i"); i.style.left = x + "%"; i.style.top = y + "%"; h.appendChild(i); }); d.appendChild(h); });
      return d;
    }
    function place(side) {
      if (sel < 0) return;
      const t = hand[sel];
      const L = chain[0][0], R = chain[chain.length - 1][1];
      if (side === "L" && (t[0] === L || t[1] === L)) { chain.unshift(t[1] === L ? t : [t[1], t[0]]); }
      else if (side === "R" && (t[0] === R || t[1] === R)) { chain.push(t[0] === R ? t : [t[1], t[0]]); }
      else { const h = wrap.querySelector(".hand"); h.classList.add("shake"); setTimeout(() => h.classList.remove("shake"), 400); return; }
      hand.splice(sel, 1); sel = -1; render();
      if (!hand.length) setTimeout(onWin, 500);
    }
    function render() {
      wrap.innerHTML = "";
      const ch = el("div", "chain"); chain.forEach(t => ch.appendChild(tileEl(t))); wrap.appendChild(ch);
      const L = chain[0][0], R = chain[chain.length - 1][1];
      const ends = el("div", "ends");
      const t = sel >= 0 ? hand[sel] : null;
      const bl = el("button", t && (t[0] === L || t[1] === L) ? "ok" : "", "◀ " + L);
      const br = el("button", t && (t[0] === R || t[1] === R) ? "ok" : "", R + " ▶");
      bl.onclick = () => place("L"); br.onclick = () => place("R");
      ends.append(bl, br); wrap.appendChild(ends);
      const hd = el("div", "hand"); hd.style.marginTop = "16px";
      hand.forEach((t, i) => { const d = tileEl(t); if (i === sel) d.classList.add("sel"); d.onclick = () => { sel = i; render(); }; hd.appendChild(d); });
      wrap.appendChild(hd);
      const r = el("div", "center"); r.style.marginTop = "18px";
      const rb = el("button", "btn outline", ui.restart); rb.onclick = reset; r.appendChild(rb); wrap.appendChild(r);
    }
    reset();
    return () => { };
  };

  // ---------- 4. Memoria ----------
  Games[3] = function (stage, ui, onWin) {
    const SYM = ["🌹", "🕯️", "🍷", "❄️", "🔮", "💋", "🌙", "✉️"], MAX = 26;
    const hd = el("div", "hud"); stage.appendChild(hd);
    const grid = el("div", "mem"); stage.appendChild(grid);
    let cards, open, moves, matched, busy;
    function reset() {
      cards = shuffle(SYM.concat(SYM)); open = []; moves = 0; matched = 0; busy = false;
      grid.innerHTML = "";
      cards.forEach((s, i) => {
        const c = el("button", "card", "<span>" + s + "</span>");
        c.onclick = () => flip(i, c);
        grid.appendChild(c);
      });
      upd();
    }
    function upd() { hd.textContent = ui.moves + ": " + moves + " / " + MAX; }
    function flip(i, c) {
      if (busy || c.classList.contains("up")) return;
      c.classList.add("up"); open.push([i, c]);
      if (open.length === 2) {
        moves++; upd();
        const [[a, ca], [b, cb]] = open; open = [];
        if (cards[a] === cards[b]) {
          ca.classList.add("ok"); cb.classList.add("ok"); matched++;
          if (matched === SYM.length) setTimeout(onWin, 500);
        } else {
          busy = true;
          setTimeout(() => { ca.classList.remove("up"); cb.classList.remove("up"); busy = false; if (moves >= MAX) { busy = true; overlay(stage, ui, ui.lose, reset); } }, 750);
        }
      }
    }
    stage.style.position = "relative";
    reset();
    return () => { };
  };

  // ---------- 5. La llave de la palabra (anagramas) ----------
  Games[4] = function (stage, ui, onWin) {
    const words = ui.anagram;
    let wi = 0, picked;
    const hd = el("div", "hud"); const slots = el("div", "slots"); const lets = el("div", "letters");
    const ctr = el("div", "center"); ctr.style.marginTop = "18px";
    const del = el("button", "btn outline", "⌫"); ctr.appendChild(del);
    stage.append(hd, slots, lets, ctr);
    function setup() {
      const w = words[wi]; picked = [];
      let sh; do { sh = shuffle(w.split("").map((ch, i) => ({ ch, i }))); } while (sh.map(o => o.ch).join("") === w);
      hd.textContent = (wi + 1) + " / " + words.length;
      lets.innerHTML = "";
      sh.forEach(o => { const b = el("button", "letter", o.ch); b.onclick = () => pick(b, o); lets.appendChild(b); });
      draw();
    }
    function draw() {
      slots.innerHTML = "";
      for (let i = 0; i < words[wi].length; i++) slots.appendChild(el("div", "slot", picked[i] ? picked[i].o.ch : ""));
    }
    function pick(b, o) {
      if (b.classList.contains("used")) return;
      b.classList.add("used"); picked.push({ b, o }); draw();
      if (picked.length === words[wi].length) {
        if (picked.map(p => p.o.ch).join("") === words[wi]) {
          slots.querySelectorAll(".slot").forEach(s => s.style.color = "var(--gold)");
          setTimeout(() => { wi++; if (wi >= words.length) onWin(); else setup(); }, 600);
        } else {
          slots.classList.add("shake");
          setTimeout(() => { slots.classList.remove("shake"); picked.forEach(p => p.b.classList.remove("used")); picked = []; draw(); }, 450);
        }
      }
    }
    del.onclick = () => { const p = picked.pop(); if (p) { p.b.classList.remove("used"); draw(); } };
    setup();
    return () => { };
  };

  // ---------- 6. Huida en taxi ----------
  Games[5] = function (stage, ui, onWin) {
    const W = 300, H = 450, LANES = 3, LW = 70, X0 = (W - LW * LANES) / 2, GOAL = 25;
    const cv = mkCanvas(stage, W, H), ctx = cv.ctx;
    const hd = hud(stage);
    let lane, obs, t, spawn, off, dead, won, carX;
    function reset() { lane = 1; carX = X0 + LW * 1.5; obs = []; t = 0; spawn = 0; off = 0; dead = false; won = false; }
    reset();
    const go = d => { if (!dead && !won) lane = Math.max(0, Math.min(LANES - 1, lane + d)); };
    cv.c.addEventListener("pointerdown", e => { const p = ptr(cv, e); go(p.x < W / 2 ? -1 : 1); });
    const stopKeys = keys({ ArrowLeft: { down: () => go(-1) }, ArrowRight: { down: () => go(1) } });
    pad(stage, [{ label: "◀", down: () => go(-1) }, { label: "▶", down: () => go(1) }]);
    const trees = Array.from({ length: 14 }, (_, i) => ({ y: i * 40, s: i % 2 }));
    const stop = loop(dt => {
      if (!dead && !won) {
        t += dt / 60;
        const sp = 4 + t * 0.22;
        off = (off + sp * dt) % 40;
        trees.forEach(tr => { tr.y += sp * dt; if (tr.y > H) tr.y -= 560; });
        spawn -= dt;
        if (spawn <= 0) {
          const free = Math.random() * LANES | 0;
          const n = t > 10 && Math.random() < .45 ? 2 : 1;
          const ls = shuffle([0, 1, 2].filter(l => l !== free)).slice(0, n);
          ls.forEach(l => obs.push({ l, y: -40, k: Math.random() < .5 ? 0 : 1 }));
          spawn = Math.max(26, 55 - t * 1.4);
        }
        obs.forEach(o => o.y += sp * dt);
        obs = obs.filter(o => o.y < H + 40);
        carX += ((X0 + LW * (lane + .5)) - carX) * Math.min(1, 0.35 * dt);
        for (const o of obs) {
          const ox = X0 + LW * (o.l + .5);
          if (Math.abs(ox - carX) < 36 && o.y + 18 > H - 92 && o.y - 18 < H - 30) { dead = true; overlay(stage, ui, ui.lose, reset); break; }
        }
        if (t >= GOAL) { won = true; setTimeout(onWin, 400); }
      }
      ctx.fillStyle = "#e9eff8"; ctx.fillRect(0, 0, W, H);
      trees.forEach(tr => { [12, W - 28].forEach((x, k) => { ctx.fillStyle = "#1e4a35"; ctx.beginPath(); const y = tr.y + (k ? 20 : 0); ctx.moveTo(x + 8, y); ctx.lineTo(x + 18, y + 26); ctx.lineTo(x - 2, y + 26); ctx.fill(); }); });
      ctx.fillStyle = "#2a3040"; ctx.fillRect(X0, 0, LW * LANES, H);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.setLineDash([18, 22]); ctx.lineDashOffset = -off;
      for (let i = 1; i < LANES; i++) { ctx.beginPath(); ctx.moveTo(X0 + LW * i, 0); ctx.lineTo(X0 + LW * i, H); ctx.stroke(); }
      ctx.setLineDash([]);
      obs.forEach(o => {
        const x = X0 + LW * (o.l + .5);
        if (o.k === 0) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x, o.y + 6, 28, 16, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#cfd9ea"; ctx.fillRect(x - 28, o.y + 4, 56, 4); }
        else { ctx.fillStyle = "rgba(95,211,138,.85)"; ctx.beginPath(); ctx.arc(x, o.y - 4, 16, Math.PI, 0); ctx.lineTo(x + 16, o.y + 16); for (let k = 0; k < 4; k++) ctx.lineTo(x + 16 - (k + .5) * 8, o.y + (k % 2 ? 16 : 8)); ctx.lineTo(x - 16, o.y + 16); ctx.fill(); ctx.fillStyle = "#0a2a17"; ctx.fillRect(x - 7, o.y - 6, 4, 4); ctx.fillRect(x + 3, o.y - 6, 4, 4); }
      });
      const y = H - 92;
      ctx.fillStyle = "#f5c518"; roundRect(ctx, carX - 20, y, 40, 62, 8); ctx.fill();
      ctx.fillStyle = "#1a2540"; ctx.fillRect(carX - 15, y + 12, 30, 12); ctx.fillRect(carX - 15, y + 40, 30, 9);
      ctx.fillStyle = "#222"; ctx.fillRect(carX - 8, y + 28, 16, 6); ctx.fillStyle = "#f5c518"; ctx.font = "bold 6px sans-serif"; ctx.fillText("TAXI", carX - 7, y + 33);
      ctx.fillStyle = "#c8102e"; ctx.fillRect(carX - 18, y + 58, 8, 4); ctx.fillRect(carX + 10, y + 58, 8, 4);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(10, 10, W - 20, 6);
      ctx.fillStyle = "#c8102e"; ctx.fillRect(10, 10, (W - 20) * Math.min(1, t / GOAL), 6);
      hd.textContent = ui.time + ": " + Math.max(0, GOAL - t).toFixed(0) + " s";
    });
    return () => { stop(); stopKeys(); };
  };

  // ---------- 7. Laberinto del bosque ----------
  Games[6] = function (stage, ui, onWin) {
    const C = 9, R = 13, S = 30;
    const cv = mkCanvas(stage, C * S, R * S), ctx = cv.ctx;
    const hd = hud(stage);
    let wall, pos, won, steps, trail;
    function gen() {
      // wall[y][x] = {n,s,e,w}
      wall = Array.from({ length: R }, () => Array.from({ length: C }, () => ({ n: 1, s: 1, e: 1, w: 1 })));
      const seen = Array.from({ length: R }, () => Array(C).fill(0));
      const st = [[0, 0]]; seen[0][0] = 1;
      while (st.length) {
        const [x, y] = st[st.length - 1];
        const nb = shuffle([[0, -1, "n", "s"], [0, 1, "s", "n"], [1, 0, "e", "w"], [-1, 0, "w", "e"]]).filter(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < C && Y < R && !seen[Y][X]; });
        if (!nb.length) { st.pop(); continue; }
        const [dx, dy, a, b] = nb[0]; wall[y][x][a] = 0; wall[y + dy][x + dx][b] = 0; seen[y + dy][x + dx] = 1; st.push([x + dx, y + dy]);
      }
      pos = { x: 0, y: 0 }; won = false; steps = 0; trail = [{ x: 0, y: 0 }];
    }
    gen();
    function mv(dx, dy) {
      if (won) return;
      const w = wall[pos.y][pos.x], d = dy < 0 ? "n" : dy > 0 ? "s" : dx > 0 ? "e" : "w";
      if (w[d]) return;
      pos.x += dx; pos.y += dy; steps++; trail.push({ x: pos.x, y: pos.y }); if (trail.length > 6) trail.shift();
      if (pos.x === C - 1 && pos.y === R - 1) { won = true; setTimeout(onWin, 500); }
    }
    const stopKeys = keys({ ArrowUp: { down: () => mv(0, -1), repeat: true }, ArrowDown: { down: () => mv(0, 1), repeat: true }, ArrowLeft: { down: () => mv(-1, 0), repeat: true }, ArrowRight: { down: () => mv(1, 0), repeat: true } });
    let rep = null;
    const hold = (dx, dy) => ({ down: () => { mv(dx, dy); clearInterval(rep); rep = setInterval(() => mv(dx, dy), 170); }, up: () => clearInterval(rep) });
    pad(stage, [Object.assign({ label: "◀" }, hold(-1, 0)), Object.assign({ label: "▲" }, hold(0, -1)), Object.assign({ label: "▼" }, hold(0, 1)), Object.assign({ label: "▶" }, hold(1, 0))]);
    let sx = 0, sy = 0;
    cv.c.addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; });
    cv.c.addEventListener("pointerup", e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; if (Math.abs(dx) > Math.abs(dy)) mv(dx > 0 ? 1 : -1, 0); else mv(0, dy > 0 ? 1 : -1); });
    const flakes = Array.from({ length: 60 }, () => ({ x: Math.random() * C * S, y: Math.random() * R * S, v: .3 + Math.random() * .7 }));
    const stop = loop(dt => {
      ctx.fillStyle = "#dfe8f5"; ctx.fillRect(0, 0, cv.w, cv.h);
      ctx.strokeStyle = "#1e4a35"; ctx.lineWidth = 4; ctx.lineCap = "round";
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        const w = wall[y][x], X = x * S, Y = y * S;
        ctx.beginPath();
        if (w.n) { ctx.moveTo(X, Y); ctx.lineTo(X + S, Y); }
        if (w.w) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + S); }
        if (y === R - 1 && w.s) { ctx.moveTo(X, Y + S); ctx.lineTo(X + S, Y + S); }
        if (x === C - 1 && w.e) { ctx.moveTo(X + S, Y); ctx.lineTo(X + S, Y + S); }
        ctx.stroke();
      }
      // huellas de zorro
      ctx.fillStyle = "rgba(200,90,30,.55)";
      trail.forEach(p => { ctx.beginPath(); ctx.arc(p.x * S + S / 2 - 4, p.y * S + S / 2 + 3, 2.2, 0, 7); ctx.arc(p.x * S + S / 2 + 4, p.y * S + S / 2 - 3, 2.2, 0, 7); ctx.fill(); });
      // dacha
      const gx = (C - 1) * S, gy = (R - 1) * S;
      ctx.fillStyle = "#7a4a2a"; ctx.fillRect(gx + 6, gy + 13, 18, 13); ctx.fillStyle = "#c8102e"; ctx.beginPath(); ctx.moveTo(gx + 3, gy + 14); ctx.lineTo(gx + 15, gy + 4); ctx.lineTo(gx + 27, gy + 14); ctx.fill(); ctx.fillStyle = "#ffd54a"; ctx.fillRect(gx + 12, gy + 17, 6, 6);
      // Luis y Natalia
      const px = pos.x * S + S / 2, py = pos.y * S + S / 2;
      ctx.fillStyle = "#2a5caa"; ctx.beginPath(); ctx.arc(px - 5, py, 6, 0, 7); ctx.fill();
      ctx.fillStyle = "#c8102e"; ctx.beginPath(); ctx.arc(px + 5, py, 6, 0, 7); ctx.fill();
      // niebla de la ventisca
      const g = ctx.createRadialGradient(px, py, S * 1.6, px, py, S * 3.6);
      g.addColorStop(0, "rgba(14,23,48,0)"); g.addColorStop(1, "rgba(14,23,48,.96)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.w, cv.h);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      flakes.forEach(f => { f.y += f.v * dt; f.x += Math.sin(f.y / 20) * .3; if (f.y > cv.h) f.y = 0; ctx.fillRect(f.x, f.y, 2, 2); });
      ctx.fillStyle = "#ffd54a"; ctx.font = "13px serif"; ctx.fillText("🏠", gx + 8, gy - 2 < 0 ? 12 : gy - 2);
      hd.textContent = ui.moves + ": " + steps;
    });
    return () => { stop(); stopKeys(); clearInterval(rep); };
  };

  // ---------- 8. Verdadero o falso ----------
  Games[7] = function (stage, ui, onWin) {
    let qs, i, right;
    const prog = el("div", "prog", "<i></i>"), q = el("div", "tfq"), bs = el("div", "tfb"), res = el("div", "tfres");
    const bt = el("button", "btn", ui.tfTrue), bf = el("button", "btn outline", ui.tfFalse);
    bs.append(bt, bf); stage.append(prog, q, bs, res); stage.style.position = "relative";
    let lock = false;
    function reset() { qs = shuffle(ui.tf.slice()); i = 0; right = 0; res.textContent = ""; show(); }
    function show() { q.textContent = qs[i][0]; prog.firstChild.style.width = (i * 10) + "%"; q.style.color = ""; lock = false; }
    function ans(v) {
      if (lock) return; lock = true;
      const ok = v === qs[i][1]; if (ok) right++;
      q.style.color = ok ? "var(--green)" : "var(--red2)";
      q.textContent = (ok ? "✓ " : "✗ ") + qs[i][0];
      setTimeout(() => {
        i++;
        if (i < qs.length) show();
        else {
          prog.firstChild.style.width = "100%";
          res.textContent = ui.tfResult.replace("{n}", right);
          if (right >= 8) setTimeout(onWin, 700);
          else overlay(stage, ui, ui.tfResult.replace("{n}", right), reset);
        }
      }, 800);
    }
    bt.onclick = () => ans(true); bf.onclick = () => ans(false);
    reset();
    return () => { };
  };

  // ---------- 9. Rompehielo de la envidia ----------
  Games[8] = function (stage, ui, onWin) {
    const W = 320, H = 420, COLS = 7, ROWS = 5, BW = 40, BH = 16, GAP = 4, X0 = (W - (COLS * (BW + GAP) - GAP)) / 2, Y0 = 50;
    const cv = mkCanvas(stage, W, H), ctx = cv.ctx;
    const hd = hud(stage);
    let bricks, ball, padX, lives, stuck, over, won, kL = 0, kR = 0;
    const PW = 72;
    function reset() {
      bricks = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) bricks.push({ x: X0 + c * (BW + GAP), y: Y0 + r * (BH + GAP), hp: r < 1 ? 2 : 1 });
      padX = W / 2; lives = 3; over = false; won = false; serve();
    }
    function serve() { stuck = true; ball = { x: padX, y: H - 40, vx: 0, vy: 0, r: 6 }; }
    function launch() { if (stuck && !over && !won) { stuck = false; ball.vx = (Math.random() - .5) * 4; ball.vy = -4.6; } }
    reset();
    const mvTo = e => { padX = Math.max(PW / 2, Math.min(W - PW / 2, ptr(cv, e).x)); };
    cv.c.addEventListener("pointerdown", e => { mvTo(e); launch(); });
    cv.c.addEventListener("pointermove", e => { if (e.pointerType === "mouse" || e.buttons) mvTo(e); });
    const stopKeys = keys({ ArrowLeft: { down: () => kL = 1, up: () => kL = 0 }, ArrowRight: { down: () => kR = 1, up: () => kR = 0 }, " ": { down: launch }, ArrowUp: { down: launch } });
    pad(stage, [{ label: "◀", down: () => kL = 1, up: () => kL = 0 }, { label: "✦", down: launch }, { label: "▶", down: () => kR = 1, up: () => kR = 0 }]);
    const stop = loop(dt => {
      if (!over && !won) {
        padX += (kR - kL) * 6 * dt; padX = Math.max(PW / 2, Math.min(W - PW / 2, padX));
        if (stuck) { ball.x = padX; ball.y = H - 40; }
        else {
          const steps = 3;
          for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
            if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
            if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y + ball.r >= H - 30 && ball.y + ball.r <= H - 20 && Math.abs(ball.x - padX) < PW / 2 + ball.r) {
              const k = (ball.x - padX) / (PW / 2);
              const sp = Math.min(7, Math.hypot(ball.vx, ball.vy) * 1.02);
              ball.vx = sp * k * 0.85; ball.vy = -Math.sqrt(Math.max(1, sp * sp - ball.vx * ball.vx));
            }
            for (const b of bricks) {
              if (b.hp <= 0) continue;
              if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + BW && ball.y + ball.r > b.y && ball.y - ball.r < b.y + BH) {
                b.hp--;
                const ox = Math.min(ball.x + ball.r - b.x, b.x + BW - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
                if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
                break;
              }
            }
          }
          if (ball.y > H + 10) { lives--; if (lives <= 0) { over = true; overlay(stage, ui, ui.lose, reset); } else serve(); }
          if (bricks.every(b => b.hp <= 0)) { won = true; setTimeout(onWin, 500); }
        }
      }
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c1430"); g.addColorStop(1, "#1d2d55");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      bricks.forEach(b => {
        if (b.hp <= 0) return;
        ctx.fillStyle = b.hp > 1 ? "#2f9b5a" : "#5fd38a"; roundRect(ctx, b.x, b.y, BW, BH, 4); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(b.x + 4, b.y + 3, BW - 8, 2);
        ctx.fillStyle = "#0a2a17"; ctx.fillRect(b.x + 13, b.y + 7, 3, 3); ctx.fillRect(b.x + 24, b.y + 7, 3, 3);
      });
      ctx.fillStyle = "#f2f6ff"; ctx.fillRect(0, H - 14, W, 14);
      ctx.fillStyle = "#e8c370"; roundRect(ctx, padX - PW / 2, H - 30, PW, 10, 5); ctx.fill();
      ctx.fillStyle = "#2a5caa"; ctx.beginPath(); ctx.arc(padX - 10, H - 36, 5, 0, 7); ctx.fill();
      ctx.fillStyle = "#c8102e"; ctx.beginPath(); ctx.arc(padX + 10, H - 36, 5, 0, 7); ctx.fill();
      const bg = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.r * 3);
      bg.addColorStop(0, "#fff8d8"); bg.addColorStop(.4, "#ffd54a"); bg.addColorStop(1, "rgba(255,213,74,0)");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r * 3, 0, 7); ctx.fill();
      hd.textContent = ui.lives + ": " + "❤".repeat(Math.max(0, lives));
    });
    return () => { stop(); stopKeys(); };
  };

  // ---------- 10. Preguntas de reflexión ----------
  Games[9] = function (stage, ui, onWin) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("mujerroja.reflect") || "{}"); } catch (e) { }
    const areas = [];
    ui.reflect.forEach((q, i) => {
      const box = el("div", "rq"); const l = el("label", "", (i + 1) + ". " + q); const t = el("textarea");
      t.value = saved[i] || ""; t.oninput = upd; box.append(l, t); stage.appendChild(box); areas.push(t);
    });
    const note = el("div", "how"); const c = el("div", "center"); const b = el("button", "btn gold", ui.reflectDone);
    c.appendChild(b); stage.append(note, c);
    function count() { return areas.filter(a => a.value.trim().length >= 10).length; }
    function upd() {
      const o = {}; areas.forEach((a, i) => o[i] = a.value);
      try { localStorage.setItem("mujerroja.reflect", JSON.stringify(o)); } catch (e) { }
      const n = count(); b.disabled = n < 3; b.style.opacity = n < 3 ? .5 : 1; note.textContent = n < 3 ? ui.reflectNeed + " (" + n + "/3)" : "";
    }
    b.onclick = () => { if (count() >= 3) onWin(); };
    upd();
    return () => { };
  };
})();
