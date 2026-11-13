(function () {
  const KEY = "mujerroja.v1";
  let S = { lang: "es", adult: false, unlocked: 0, done: [] };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

  const app = document.getElementById("app");
  const btnBack = document.getElementById("btnBack");
  const brand = document.getElementById("brand");
  let destroyGame = null;
  let view = { name: "cover" };

  const T = () => STORY[S.lang];
  const U = () => UI[S.lang];
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function setLang(l) {
    S.lang = l; save();
    document.documentElement.lang = l;
    document.querySelectorAll(".lang").forEach(b => b.classList.toggle("on", b.dataset.lang === l));
    brand.textContent = T().title;
    document.title = T().title + " · " + T().subtitle;
    render();
  }
  document.querySelectorAll(".lang").forEach(b => b.onclick = () => setLang(b.dataset.lang));
  btnBack.onclick = () => go({ name: "menu" });

  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  function render() {
    if (destroyGame) { destroyGame(); destroyGame = null; }
    btnBack.textContent = U().back;
    btnBack.classList.toggle("hidden", view.name === "cover" || view.name === "menu");
    app.innerHTML = "";
    ({ cover, menu, chapter, game, win, epilogue })[view.name]();
  }

  const ART = '<svg viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">' +
    '<defs><radialGradient id="m" cx="50%" cy="30%" r="60%"><stop offset="0" stop-color="#2a3b6e"/><stop offset="1" stop-color="#0b0f1c"/></radialGradient>' +
    '<linearGradient id="d" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e23a4f"/><stop offset="1" stop-color="#8a0a1f"/></linearGradient>' +
    '<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="300" height="380" rx="24" fill="url(#m)"/>' +
    '<circle cx="222" cy="78" r="30" fill="#f4f1e6" opacity=".9"/>' +
    '<g fill="#e6edf7" opacity=".85"><rect x="22" y="70" width="7" height="260"/><rect x="48" y="110" width="5" height="220"/><rect x="262" y="120" width="6" height="210"/></g>' +
    '<g fill="#1b2340"><rect x="24" y="120" width="3" height="5"/><rect x="24" y="190" width="3" height="4"/><rect x="49" y="160" width="3" height="4"/><rect x="263" y="170" width="4" height="4"/><rect x="263" y="240" width="4" height="5"/></g>' +
    '<ellipse cx="150" cy="215" rx="95" ry="120" fill="url(#g)"/>' +
    '<path d="M0 330 Q150 300 300 330 V380 H0Z" fill="#eef3fb"/>' +
    '<circle cx="150" cy="98" r="17" fill="#f2d3bd"/>' +
    '<path d="M133 92 Q134 70 152 72 Q170 72 168 92 Q164 82 150 82 Q138 83 133 92Z" fill="#efe3c8"/>' +
    '<circle cx="160" cy="76" r="9" fill="#efe3c8"/>' +
    '<path d="M144 112 Q150 120 156 112 L158 124 L142 124Z" fill="#f2d3bd"/>' +
    '<path d="M138 124 Q150 118 162 124 L170 170 Q160 178 158 186 L196 330 Q150 345 104 330 L142 186 Q140 178 130 170Z" fill="url(#d)"/>' +
    '<path d="M138 128 Q122 150 126 186 Q128 196 134 196 L136 160Z" fill="#f2d3bd"/>' +
    '<path d="M162 128 Q186 140 204 112 Q206 106 201 106 Q188 128 168 140Z" fill="#f2d3bd"/>' +
    '<path d="M150 98 m-5 6 q5 3 10 0" stroke="#b0102a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<g fill="#fff"><circle cx="70" cy="40" r="1.6"/><circle cx="110" cy="150" r="1.2"/><circle cx="240" cy="200" r="1.8"/><circle cx="40" cy="250" r="1.4"/><circle cx="200" cy="30" r="1.1"/><circle cx="260" cy="290" r="1.5"/><circle cx="90" cy="300" r="1.3"/></g>' +
    '<path d="M200 318 q8-12 16 0 q-8 6-16 0z M214 312 l2 14" fill="#c8102e" stroke="#2f6b3a" stroke-width="1.5"/>' +
    '</svg>';

  function cover() {
    const t = T(), u = U();
    const d = document.createElement("div"); d.className = "cover";
    d.innerHTML = ART + '<h1>' + t.title + '</h1><div class="sub">' + t.subtitle + '</div><div class="by">' + t.author + '</div>' +
      '<p class="intro">' + u.intro + '</p>';
    if (!S.adult) {
      const a = document.createElement("div"); a.className = "adult"; a.innerHTML = "🔞 " + u.adult + "<br><br>";
      const b = document.createElement("button"); b.className = "btn"; b.textContent = u.enter;
      b.onclick = () => { S.adult = true; save(); go({ name: "menu" }); };
      a.appendChild(b); d.appendChild(a);
    } else {
      const b = document.createElement("button"); b.className = "btn"; b.textContent = u.play;
      b.onclick = () => go({ name: "menu" }); d.appendChild(b);
    }
    app.appendChild(d);
  }

  function menu() {
    if (!S.adult) return go({ name: "cover" });
    const t = T(), u = U();
    const h = document.createElement("h2"); h.className = "sec"; h.textContent = u.chapters; app.appendChild(h);
    const list = document.createElement("div"); list.className = "list";
    t.chapters.forEach((c, i) => {
      const locked = i > S.unlocked, done = S.done.includes(i);
      const b = document.createElement("button");
      b.className = "item" + (locked ? " locked" : "") + (done ? " done" : "");
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"><b>' + esc(c.title) + '</b><small>' +
        (locked ? "🔒 " + u.locked : "🎮 " + u.games[i].name + (done ? " · ✓ " + u.passed : "")) + '</small></span>';
      if (!locked) b.onclick = () => go({ name: "chapter", i });
      list.appendChild(b);
    });
    const allDone = S.done.includes(t.chapters.length - 1);
    const e = document.createElement("button");
    e.className = "item" + (allDone ? " done" : " locked");
    e.innerHTML = '<span class="n">✦</span><span class="t"><b>' + esc(t.epilogue.title) + '</b><small>' + (allDone ? "" : "🔒 " + u.locked) + '</small></span>';
    if (allDone) e.onclick = () => go({ name: "epilogue" });
    list.appendChild(e);
    app.appendChild(list);
    const r = document.createElement("div"); r.className = "reset";
    const rb = document.createElement("button"); rb.textContent = u.reset;
    rb.onclick = () => { if (confirm(u.resetAsk)) { S.unlocked = 0; S.done = []; save(); render(); } };
    r.appendChild(rb); app.appendChild(r);
  }

  function prose(ps) {
    const d = document.createElement("div"); d.className = "prose";
    ps.forEach(p => { const e = document.createElement("p"); e.textContent = p; d.appendChild(e); });
    return d;
  }

  function chapter() {
    const i = view.i, c = T().chapters[i], u = U();
    const head = document.createElement("div"); head.className = "chap-head";
    head.innerHTML = '<div class="k">' + u.chapter + ' ' + (i + 1) + '</div><h2>' + esc(c.title) + '</h2><div class="orn">❦</div>';
    app.appendChild(head);
    const body = document.createElement("div"); app.appendChild(body);
    function showPart(k) {
      const part = c.parts[k];
      const wrap = document.createElement("div"); wrap.className = "part";
      wrap.appendChild(prose(part.p));
      body.appendChild(wrap);
      if (part.choice) {
        const box = document.createElement("div"); box.className = "choice";
        box.innerHTML = '<div class="q">' + esc(part.choice.q) + '</div>';
        const opts = [];
        part.choice.opts.forEach(o => {
          const b = document.createElement("button"); b.className = "opt"; b.textContent = o.t; opts.push(b);
          b.onclick = () => {
            box.querySelectorAll(".fail").forEach(f => f.remove());
            if (o.ok) {
              opts.forEach(x => { x.disabled = true; if (x !== b) x.style.display = "none"; });
              b.classList.add("chosen");
              next(k + 1);
            } else {
              opts.forEach(x => x.disabled = true);
              const f = document.createElement("div"); f.className = "fail";
              f.innerHTML = "<b>" + u.wrong + "</b>";
              const p = document.createElement("p"); p.textContent = o.fail; f.appendChild(p);
              const rb = document.createElement("button"); rb.className = "btn outline"; rb.textContent = u.retry;
              rb.onclick = () => { f.remove(); opts.forEach(x => x.disabled = false); };
              f.appendChild(rb); box.appendChild(f);
              f.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          };
          box.appendChild(b);
        });
        wrap.appendChild(box);
      } else next(k + 1);
      if (k > 0) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function next(k) {
      if (k < c.parts.length) return showPart(k);
      const g = document.createElement("div"); g.className = "gate part";
      g.innerHTML = '<div class="orn" style="color:var(--red2)">❦ ❦ ❦</div><div class="gname">🎮 ' + esc(u.games[i].name) + '</div>';
      const b = document.createElement("button"); b.className = "btn gold"; b.textContent = u.toGame;
      b.onclick = () => go({ name: "game", i });
      g.appendChild(b); body.appendChild(g);
    }
    showPart(0);
  }

  function game() {
    const i = view.i, u = U(), gm = u.games[i];
    const d = document.createElement("div"); d.className = "game";
    d.innerHTML = '<div class="chap-head" style="margin-bottom:4px"><div class="k">' + u.chapter + ' ' + (i + 1) + '</div></div><h2>' + esc(gm.name) + '</h2><p class="how">' + esc(gm.how) + '</p>';
    const stage = document.createElement("div"); stage.className = "stage";
    d.appendChild(stage); app.appendChild(d);
    destroyGame = Games[i](stage, u, () => {
      if (view.name !== "game" || view.i !== i) return;
      if (!S.done.includes(i)) S.done.push(i);
      S.unlocked = Math.max(S.unlocked, Math.min(i + 1, T().chapters.length - 1));
      save();
      go({ name: "win", i });
    });
  }

  function win() {
    const i = view.i, u = U(), last = i === T().chapters.length - 1;
    const d = document.createElement("div"); d.className = "win";
    d.innerHTML = '<div class="rose">🌹</div><div class="big">' + u.winTitle + '</div><p class="how">' + esc(u.games[i].name) + ' ✓</p>';
    const b = document.createElement("button"); b.className = "btn gold";
    b.textContent = last ? u.toEpilogue : u.winNext;
    b.onclick = () => go(last ? { name: "epilogue" } : { name: "chapter", i: i + 1 });
    d.appendChild(b); app.appendChild(d);
  }

  function epilogue() {
    const e = T().epilogue;
    const head = document.createElement("div"); head.className = "chap-head";
    head.innerHTML = '<div class="orn">✦</div><h2>' + esc(e.title) + '</h2><div class="orn">❦</div>';
    app.appendChild(head);
    const p = prose(e.p); p.classList.add("part"); app.appendChild(p);
    const end = document.createElement("div"); end.className = "end"; end.textContent = U().theEnd; app.appendChild(end);
    const by = document.createElement("p"); by.className = "center"; by.style.color = "var(--muted)"; by.textContent = "— " + T().author + " —"; app.appendChild(by);
  }

  // nieve de fondo
  (function snow() {
    const c = document.getElementById("snow"), ctx = c.getContext("2d");
    let W, H, fl;
    function size() { W = c.width = innerWidth; H = c.height = innerHeight; fl = Array.from({ length: Math.min(90, W / 8 | 0) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + .6, v: Math.random() * .5 + .2, d: Math.random() * 6 })); }
    size(); addEventListener("resize", size);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    (function f(t) {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "rgba(255,255,255,.55)";
      fl.forEach(p => { if (!reduce) { p.y += p.v; p.x += Math.sin(t / 2000 + p.d) * .3; if (p.y > H) { p.y = -5; p.x = Math.random() * W; } } ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
      if (!reduce) requestAnimationFrame(f);
    })(0);
  })();

  setLang(S.lang);
  go(S.adult ? { name: "menu" } : { name: "cover" });
})();
