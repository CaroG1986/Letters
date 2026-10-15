'use strict';

/* ==========================================================================
   INTERACCIONES NARRATIVAS · una pequeña interacción por libro
   --------------------------------------------------------------------------
   Cada libro pinta su "página especial" (la que antes mostraba directamente la
   letra) con una micro-interacción, usando el MISMO canvas de textura que ya
   emplea app.js. Así queda integrada en el objeto 3D (perspectiva, luz,
   sombras) y se reutiliza todo el flujo existente:

     llegar a la página especial -> Interactions.start(book)
     el usuario completa la acción -> animación -> letra -> revealLetter(book)
     cerrar / volver atrás / reiniciar -> Interactions.stop()

   Este archivo solo declara funciones: no toca nada de app.js al cargarse
   (PW, PH, state, camera… se leen en el momento de usarlas).
   Cada interacción es una función independiente "(I) => ({ draw, down, move,
   up, key, destroy })"; I es la API común creada por el gestor.
   ========================================================================== */
const Interactions = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const rand = (a, b) => a + Math.random() * (b - a);

  /* Rectángulo redondeado (ctx.roundRect no existe en navegadores algo antiguos) */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ------------------------------------------------------------------------
     GESTOR
     ------------------------------------------------------------------------ */
  let cur = null;                       // sesión activa (como mucho una)

  function isActive() { return cur !== null; }
  function has(book) { return typeof FACTORIES[book.userData.index] === 'function'; }

  /* Punto del puntero sobre la página derecha, en coordenadas del canvas (0..PW, 0..PH) */
  function toPage(s, e) {
    const r = s.dom.getBoundingClientRect();
    s.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(s.ndc, camera);
    const hit = raycaster.intersectObject(s.mesh, false)[0];
    return hit && hit.uv ? { x: hit.uv.x * PW, y: (1 - hit.uv.y) * PH } : null;
  }

  /* Letra de siempre (la misma que dibuja app.js), con opacidad, escala y desplazamiento opcionales */
  function drawLetter(ctx, letter, alpha = 1, scale = 1, dx = 0, dy = 0) {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.translate(PW / 2 + dx, PH / 2 + dy);
    ctx.scale(scale, scale);
    ctx.translate(-PW / 2, -PH / 2);
    drawBigLetter(ctx, letter);
    ctx.restore();
  }

  function makeApi(s) {
    const ctx = s.ctx;
    return {
      ctx, W: PW, H: PH, letterChar: s.letter, mesh: s.mesh,
      paper() { paintPaper(ctx, 'left'); },
      letter(alpha, scale, dx, dy) { drawLetter(ctx, s.letter, alpha, scale, dx, dy); },
      /* Pista mínima al pie de la página; cada interacción la apaga en cuanto el usuario actúa */
      hint(text, color, alpha) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.font = `italic 400 21px ${SERIF}`;
        ctx.fillText(text, PW / 2 + 8, PH - 52);
        ctx.restore();
      },
      tween(target, vars) { const t = gsap.to(target, vars); s.tweens.push(t); return t; },
      timeline(vars) { const t = gsap.timeline(vars); s.tweens.push(t); return t; },
      cursor(c) { if (!s.locked) document.body.style.cursor = c; },
      /* El usuario ya actuó: se ignoran nuevas entradas y se bloquea la navegación
         (igual que hacía el flujo original al revelar la letra) */
      lock() {
        if (s.locked) return;
        s.locked = true;
        state.isAnimating = true;
        document.body.classList.remove('reading');
        document.body.style.cursor = 'default';
      },
      /* La letra ya está visible: se cede el control al flujo original (letra -> fila superior) */
      complete() { finish(s); }
    };
  }

  function start(book) {
    stop();
    const make = FACTORIES[book.userData.index];
    if (!make) return false;

    const mesh = book.userData.rightPageMesh;
    const s = {
      book, mesh, ctx: mesh.userData.ctx, tex: mesh.userData.texture,
      letter: book.userData.data.letter, dom: renderer.domElement,
      ndc: new THREE.Vector2(), tweens: [], time: 0, last: performance.now(),
      locked: false, impl: null
    };
    cur = s;

    try {
      s.impl = make(makeApi(s));

      s.tick = () => {
        const now = performance.now();
        const dt = Math.min((now - s.last) / 1000, 0.1);
        s.last = now;
        s.time += dt;
        try {
          s.impl.draw(dt, s.time);
          s.tex.needsUpdate = true;
        } catch (err) { rescue(s, err); }
      };
      s.onDown = (e) => {
        if (s.locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
        try { s.dom.setPointerCapture(e.pointerId); } catch (_) { /* no crítico */ }
        s.impl.down && s.impl.down(toPage(s, e), e);
      };
      s.onMove = (e) => { if (!s.locked) s.impl.move && s.impl.move(toPage(s, e), e); };
      s.onUp = (e) => { if (!s.locked) s.impl.up && s.impl.up(toPage(s, e), e); };
      s.onKey = (e) => {
        if (s.locked || (e.target && e.target.closest && e.target.closest('button'))) return;
        if (s.impl.key && s.impl.key(e, e.type === 'keydown')) e.preventDefault();
      };
      s.onMenu = (e) => e.preventDefault();       // evita el menú contextual en una pulsación larga táctil

      s.dom.addEventListener('pointerdown', s.onDown);
      s.dom.addEventListener('pointermove', s.onMove);
      s.dom.addEventListener('pointerup', s.onUp);
      s.dom.addEventListener('pointercancel', s.onUp);
      s.dom.addEventListener('contextmenu', s.onMenu);
      addEventListener('keydown', s.onKey);
      addEventListener('keyup', s.onKey);

      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      gsap.ticker.add(s.tick);
      s.tick();                                   // primer fotograma inmediato
      return true;
    } catch (err) {
      // Si algo falla, el libro sigue como antes: letra directa, sin interacción
      console.error('[interacciones]', err);
      stop();
      paintPaper(mesh.userData.ctx, 'left');
      drawBigLetter(mesh.userData.ctx, book.userData.data.letter);
      mesh.userData.texture.needsUpdate = true;
      return false;
    }
  }

  /* Detiene todo: bucle, animaciones, eventos y cursor. Seguro de llamar varias veces. */
  function stop() {
    const s = cur;
    if (!s) return;
    cur = null;
    gsap.ticker.remove(s.tick);
    s.tweens.forEach((t) => t.kill());
    s.dom.removeEventListener('pointerdown', s.onDown);
    s.dom.removeEventListener('pointermove', s.onMove);
    s.dom.removeEventListener('pointerup', s.onUp);
    s.dom.removeEventListener('pointercancel', s.onUp);
    s.dom.removeEventListener('contextmenu', s.onMenu);
    removeEventListener('keydown', s.onKey);
    removeEventListener('keyup', s.onKey);
    try { s.impl && s.impl.destroy && s.impl.destroy(); } catch (_) { /* nada que limpiar */ }
    document.body.style.cursor = 'default';
  }

  /* Fin normal: se deja el último fotograma en la página y continúa el flujo original */
  function finish(s) {
    if (cur !== s) return;
    const book = s.book;
    state.isAnimating = true;                     // sigue bloqueado hasta que el libro suba a su sitio
    stop();
    revealLetter(book);
  }

  /* Error dentro de una interacción: se muestra la letra para no dejar al usuario atascado */
  function rescue(s, err) {
    console.error('[interacciones]', err);
    if (cur !== s) return;
    paintPaper(s.ctx, 'left');
    drawBigLetter(s.ctx, s.letter);
    s.tex.needsUpdate = true;
    state.isAnimating = true;
    document.body.classList.remove('reading');
    finish(s);
  }

  /* ========================================================================
     LAS SIETE INTERACCIONES (una por libro, en el orden de BOOKS_DATA)
     ======================================================================== */
  /* ------------------------------------------------------------------------
     1 · LA HIPÓTESIS DEL AMOR — unir dos puntos; la línea se vuelve corazón
     ------------------------------------------------------------------------ */
  function hypothesis(I) {
    const { ctx, W, H } = I;
    const TEAL = '#1aa5c8', PINK = '#f06fa6';
    const nodes = [
      { x: 118, y: 205, c: TEAL, ph: 0.0, label: 'H₀', lx: 18, ly: -22 },
      { x: 376, y: 168, c: PINK, ph: 1.1, label: 'H₁', lx: 18, ly: -22 },
      { x: 262, y: 318, c: TEAL, ph: 2.0 },
      { x: 104, y: 478, c: PINK, ph: 0.6 },
      { x: 400, y: 446, c: TEAL, ph: 1.7 },
      { x: 252, y: 592, c: PINK, ph: 2.6 }
    ];
    const bonds = [[0, 2], [2, 3], [4, 5]];           // enlaces tenues, solo ambientales
    const S = { link: 0, morph: 0, fade: 1, fill: 0, beat: 0, letter: 0, hint: 1 };
    let sel = -1, hover = -1, ptr = null, downAt = -1, phase = 'idle', a = -1, b = -1;

    const hit = (p) => { if (!p) return -1; let best = -1, d = 46; nodes.forEach((n, i) => { const k = dist(p.x, p.y, n.x, n.y); if (k < d) { d = k; best = i; } }); return best; };

    /* Corazón paramétrico, t en 0..1 (cerrado). Centrado en la página. */
    const K = 6.4, CX = W / 2, CY = H / 2 - 2.5 * K;
    function heartPt(u) {
      const t = u * TAU;
      return {
        x: CX + 16 * Math.pow(Math.sin(t), 3) * K,
        y: CY - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * K
      };
    }

    function connect(i, j) {
      if (phase !== 'idle') return;
      phase = 'play'; a = i; b = j; sel = -1; I.lock();
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.2 }, 0)
        .to(S, { link: 1, duration: 0.45, ease: 'power2.out' }, 0)
        .to(S, { fade: 0, duration: 0.6, ease: 'power1.inOut' }, 0.15)
        .to(S, { morph: 1, duration: 1.3, ease: 'power3.inOut' }, 0.5)
        .to(S, { fill: 1, duration: 0.7 }, 1.3)
        .to(S, { beat: 1, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.85)
        .to(S, { letter: 1, duration: 0.9, ease: 'power2.out' }, 2.5)
        .call(() => I.complete(), null, 3.9);
    }

    function draw(dt, t) {
      I.paper();
      // Cuaderno de laboratorio: cuadrícula muy tenue
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.65 * S.fade;
      ctx.strokeStyle = 'rgba(26,165,200,.10)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 56; x < W - 24; x += 32) { ctx.moveTo(x, 26); ctx.lineTo(x, H - 26); }
      for (let y = 42; y < H - 24; y += 32) { ctx.moveTo(26, y); ctx.lineTo(W - 26, y); }
      ctx.stroke();
      ctx.restore();

      // Enlaces ambientales
      ctx.save();
      ctx.globalAlpha = S.fade * 0.55; ctx.setLineDash([4, 7]); ctx.strokeStyle = 'rgba(29,95,120,.35)'; ctx.lineWidth = 1.5;
      bonds.forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); });
      ctx.restore();

      // Línea elástica mientras se arrastra / hay un punto seleccionado
      if (sel >= 0 && ptr && phase === 'idle') {
        ctx.save();
        ctx.strokeStyle = nodes[sel].c; ctx.globalAlpha = 0.7; ctx.lineWidth = 2.5; ctx.setLineDash([2, 8]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(nodes[sel].x, nodes[sel].y); ctx.lineTo(ptr.x, ptr.y); ctx.stroke();
        ctx.restore();
      }

      // Puntos
      nodes.forEach((n, i) => {
        const inLink = i === a || i === b;
        const al = inLink ? 1 - S.morph : S.fade;
        if (al <= 0.01) return;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.ph);
        const big = i === sel || i === hover;
        ctx.save();
        ctx.globalAlpha = al;
        const g = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, 30 + pulse * 8);
        g.addColorStop(0, n.c + '66'); g.addColorStop(1, n.c + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 38, 0, TAU); ctx.fill();
        ctx.fillStyle = n.c; ctx.beginPath(); ctx.arc(n.x, n.y, big ? 10 : 7.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.x, n.y, big ? 10 : 7.5, 0, TAU); ctx.stroke();
        if (i === sel) { ctx.strokeStyle = n.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.x, n.y, 21 + pulse * 3, 0, TAU); ctx.stroke(); }
        if (n.label) { ctx.fillStyle = 'rgba(29,95,120,.8)'; ctx.font = `italic 500 22px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(n.label, n.x + n.lx, n.y + n.ly); }
        ctx.restore();
      });

      // Conexión: línea que se enciende y luego se pliega en corazón
      if (S.link > 0) {
        const A = nodes[a], B = nodes[b], N = 72;
        const grad = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        grad.addColorStop(0, A.c); grad.addColorStop(1, B.c);
        const pts = [];
        for (let i = 0; i < N; i++) {
          const u = i / (N - 1);
          const base = { x: lerp(A.x, B.x, u * S.link), y: lerp(A.y, B.y, u * S.link) };
          const m = S.morph <= 0 ? 0 : clamp(S.morph * 1.4 - u * 0.4);
          const e = m * m * (3 - 2 * m), h = heartPt(u);
          pts.push({ x: lerp(base.x, h.x, e), y: lerp(base.y, h.y, e) });
        }
        const letterFade = 1 - 0.78 * S.letter;
        const sc = 1 + 0.06 * S.beat;
        ctx.save();
        ctx.globalAlpha = letterFade;
        ctx.translate(CX, H / 2); ctx.scale(sc, sc); ctx.translate(-CX, -H / 2);
        if (S.fill > 0) {
          const f = ctx.createRadialGradient(CX, CY, 10, CX, CY, 140);
          f.addColorStop(0, 'rgba(240,111,166,.30)'); f.addColorStop(1, 'rgba(26,165,200,.08)');
          ctx.globalAlpha = letterFade * S.fill * clamp(S.morph * 1.2 - 0.2);
          ctx.fillStyle = f; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.fill();
          ctx.globalAlpha = letterFade;
        }
        ctx.strokeStyle = grad; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(240,111,166,.55)'; ctx.shadowBlur = 10;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        ctx.shadowBlur = 0;
        // vértices como pequeños átomos
        pts.forEach((p, i) => {
          if (i % 9 !== 0 && i !== N - 1) return;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = i % 18 === 0 ? PINK : TEAL; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
        });
        ctx.restore();
      }

      I.letter(S.letter, lerp(0.92, 1, S.letter));
      I.hint('Une dos puntos', 'rgba(29,95,120,.75)', S.hint);
    }

    return {
      draw,
      down(p) {
        if (phase !== 'idle' || !p) return;
        ptr = p;
        const h = hit(p);
        if (h < 0) return;
        if (sel < 0) { sel = h; downAt = h; I.tween(S, { hint: 0, duration: 0.4 }); }
        else if (h !== sel) connect(sel, h);
        else sel = -1;                                // pulsar otra vez el mismo punto lo suelta
      },
      move(p) { ptr = p; hover = hit(p); I.cursor(hover >= 0 ? 'pointer' : 'default'); },
      up(p) {
        if (phase !== 'idle' || downAt < 0) { downAt = -1; return; }
        const h = hit(p);
        if (h >= 0 && h !== sel) connect(sel, h);     // arrastrar de un punto a otro
        else if (h < 0 && (!p || dist(p.x, p.y, nodes[sel].x, nodes[sel].y) > 70)) sel = -1;   // arrastre soltado en el vacío
        downAt = -1;
      },
      key(e, down) {
        if (!down || e.repeat || (e.key !== 'Enter' && e.key !== ' ') || phase !== 'idle') return false;
        if (sel < 0) { sel = 0; I.tween(S, { hint: 0, duration: 0.4 }); } else connect(sel, sel === 0 ? 1 : 0);
        return true;
      }
    };
  }

  /* ------------------------------------------------------------------------
     2 · EL PRÍNCIPE CRUEL — elegir un sello de la corte
     ------------------------------------------------------------------------ */
  function prince(I) {
    const { ctx, W, H } = I;
    const seals = [
      { x: 150, y: 372, r: 78, c1: '#ecd07a', c2: '#7d5a14', glow: '255,205,110', ink: '#2a1c06', name: 'La Corona' },
      { x: 362, y: 372, r: 78, c1: '#5fcfa0', c2: '#0f4331', glow: '90,230,170', ink: '#f3e3a8', name: 'La Espina' }
    ];
    const S = { pick: 0, reveal: 0, letter: 0, hint: 1 };
    const hov = [0, 0];                                // 0..1 de resalte al pasar el puntero
    const stars = Array.from({ length: 26 }, () => ({ x: rand(40, W - 40), y: rand(40, H - 40), ph: rand(0, TAU), r: rand(0.6, 1.6) }));
    const parts = [];
    let hover = -1, chosen = -1, phase = 'idle';

    const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };

    function glyph(i) {
      if (i === 0) {                                   // corona
        ctx.beginPath();
        ctx.moveTo(-34, 18); ctx.lineTo(-38, -14); ctx.lineTo(-18, 2); ctx.lineTo(0, -24); ctx.lineTo(18, 2); ctx.lineTo(38, -14); ctx.lineTo(34, 18); ctx.closePath(); ctx.fill();
        rr(ctx, -34, 22, 68, 8, 3); ctx.fill();
        [[-38, -18, 4], [0, -29, 5], [38, -18, 4]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
      } else {                                         // rama de espinas
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-36, 26); ctx.bezierCurveTo(-10, 12, 10, 8, 36, -24); ctx.stroke();
        [0.22, 0.45, 0.68].forEach((t, k) => {
          const x = bez(-36, -10, 10, 36, t), y = bez(26, 12, 8, -24, t), s = k % 2 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 2 * s, y + 16 * s); ctx.lineTo(x + 5, y + 2); ctx.closePath(); ctx.fill();
        });
        ctx.beginPath(); ctx.ellipse(30, -26, 12, 5.5, -0.9, 0, TAU); ctx.fill();
      }
    }

    function drawSeal(i, t) {
      const s = seals[i];
      const isCh = i === chosen, other = chosen >= 0 && !isCh;
      const sc = (1 + 0.08 * hov[i]) * (isCh ? 1 + 0.12 * S.pick : 1) * (other ? 1 - 0.15 * S.pick : 1);
      const al = other ? 1 - S.pick : 1;
      const glowA = 0.25 + 0.5 * hov[i] + (isCh ? 0.6 * S.pick : 0) + 0.08 * Math.sin(t * 2 + i);
      const bob = Math.sin(t * 1.4 + i * 1.7) * 3;
      if (al <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(s.x, s.y + bob); ctx.scale(sc, sc);
      const g = ctx.createRadialGradient(0, 0, s.r * 0.6, 0, 0, s.r * 2);
      g.addColorStop(0, `rgba(${s.glow},${glowA})`); g.addColorStop(1, `rgba(${s.glow},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s.r * 2, 0, TAU); ctx.fill();
      const w = ctx.createRadialGradient(-s.r * 0.35, -s.r * 0.4, 6, 0, 0, s.r);
      w.addColorStop(0, s.c1); w.addColorStop(1, s.c2);
      ctx.fillStyle = w; ctx.beginPath();
      for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU, rad = s.r * (1 + 0.025 * Math.sin(a * 7 + i)); k ? ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s.r * 0.8, 0, TAU); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle = s.ink; ctx.globalAlpha = al * 0.9;
      glyph(i);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = al * 0.75 * S.hint; ctx.fillStyle = '#d9b45a'; ctx.textAlign = 'center'; ctx.font = `italic 400 20px ${SERIF}`;
      ctx.fillText(s.name, s.x, s.y + s.r + 38);
      ctx.restore();
    }

    function burst(x, y, n, rgb) {
      for (let k = 0; k < n && parts.length < 160; k++) {
        const a = rand(0, TAU), v = rand(50, 230);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: rand(0.8, 1.7), r: rand(1.4, 3.4), c: Math.random() < 0.35 ? '255,245,210' : rgb });
      }
    }

    function court(t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#120e1a'); g.addColorStop(0.5, '#1d1429'); g.addColorStop(1, '#0c0911');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => { ctx.fillStyle = `rgba(240,220,160,${0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.5 + s.ph))})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
      const v = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 470);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(217,180,90,.65)'; ctx.lineWidth = 2; ctx.strokeRect(26, 26, W - 52, H - 52);
      ctx.strokeStyle = 'rgba(217,180,90,.3)'; ctx.lineWidth = 1; ctx.strokeRect(36, 36, W - 72, H - 72);
      ctx.fillStyle = 'rgba(217,180,90,.8)';
      [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]].forEach(([x, y]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); });
      seals.forEach((_, i) => drawSeal(i, t));
    }

    function choose(i) {
      if (phase !== 'idle') return;
      phase = 'play'; chosen = i; I.lock();
      burst(seals[i].x, seals[i].y, 46, seals[i].glow);
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.2 }, 0)
        .to(S, { pick: 1, duration: 0.35, ease: 'power2.out' }, 0)
        .to(S, { reveal: 1, duration: 1.2, ease: 'power2.inOut' }, 0.45)
        .to(S, { letter: 1, duration: 0.7, ease: 'power2.out' }, 1.2)
        .call(() => I.complete(), null, 2.35);
    }

    function draw(dt, t) {
      for (let i = 0; i < 2; i++) hov[i] += ((hover === i && phase === 'idle' ? 1 : 0) - hov[i]) * Math.min(1, dt * 10);
      court(t);
      if (S.reveal > 0.001) {
        const s = seals[chosen], R = S.reveal * 860;
        ctx.save();
        ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.clip();
        I.paper();
        I.letter(S.letter, lerp(0.9, 1, S.letter));
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = `rgba(${s.glow},${0.9 * (1 - S.reveal)})`; ctx.lineWidth = 8 * (1 - S.reveal) + 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.stroke();
        ctx.restore();
        if (S.reveal < 0.95) { const a = rand(0, TAU); burst(s.x + Math.cos(a) * R, s.y + Math.sin(a) * R, 2, s.glow); }
      }
      // partículas (aditivas)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k]; p.life += dt;
        if (p.life >= p.max) { parts.splice(k, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 - 22 * dt;
        const a = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(${p.c},${a * 0.9})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + a), 0, TAU); ctx.fill();
      }
      ctx.restore();
      I.hint('Elige un sello', 'rgba(217,180,90,.8)', S.hint);
    }

    const hitSeal = (p) => (p ? seals.findIndex((s) => dist(p.x, p.y, s.x, s.y) < s.r * 1.1) : -1);
    return {
      draw,
      down(p) { if (phase !== 'idle') return; const h = hitSeal(p); if (h >= 0) choose(h); },
      move(p) { hover = hitSeal(p); I.cursor(hover >= 0 ? 'pointer' : 'default'); },
      key(e, down) {
        if (!down || e.repeat || phase !== 'idle') return false;
        if (e.key === '1') { choose(0); return true; }
        if (e.key === '2') { choose(1); return true; }
        return false;
      }
    };
  }

  /* ------------------------------------------------------------------------
     3 · DAMIÁN — alcanzar una sombra que se oculta (solo atmósfera, sin trama)
     ------------------------------------------------------------------------ */
  function shadow(I) {
    const { ctx, W, H } = I;
    const S = { catch: 0, flee: 0, vig: 1, frag: 0, letter: 0, hint: 1, alpha: 1 };
    const sh = { x: W * 0.72, y: 220, tx: 0, ty: 0, stretch: 0, ang: 0 };
    const ph = rand(0, 6), R = 64;
    const hist = [];
    let ptr = null, phase = 'idle', histT = 0, prox = 0, moved = false, force = false;

    // Tres rasguños tapados por la sombra: se calculan una vez
    const slashes = [0, 1, 2].map((i) => {
      const x0 = 196 + i * 62, y0 = 238 + i * 12, x1 = x0 + 30, y1 = y0 + 250 + i * 14;
      const pts = [];
      for (let k = 0; k <= 18; k++) {
        const u = k / 18, w = 12 * Math.pow(Math.sin(Math.PI * u), 0.7) * rand(0.8, 1.15);
        const cx = lerp(x0, x1, u) + Math.sin(u * 3 + i) * 12, cy = lerp(y0, y1, u);
        pts.push({ l: { x: cx - w, y: cy }, r: { x: cx + w * rand(0.85, 1.1), y: cy } });
      }
      return pts;
    });

    function blob(x, y, r, a) {
      const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
      g.addColorStop(0, `rgba(12,4,14,${a})`); g.addColorStop(0.55, `rgba(18,6,20,${a * 0.55})`); g.addColorStop(1, 'rgba(18,6,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function fragment() {
      if (S.frag <= 0.005) return;
      ctx.save();
      ctx.globalAlpha = S.frag;
      ctx.translate(W / 2, H / 2); ctx.scale(lerp(0.93, 1, Math.min(1, S.frag)), lerp(0.93, 1, Math.min(1, S.frag))); ctx.translate(-W / 2, -H / 2);
      ctx.shadowColor = 'rgba(160,10,30,.5)'; ctx.shadowBlur = 10;
      slashes.forEach((pts) => {
        const g = ctx.createLinearGradient(0, pts[0].l.y, 0, pts[18].l.y);
        g.addColorStop(0, '#5b0612'); g.addColorStop(0.5, '#a3121f'); g.addColorStop(1, '#5b0612');
        ctx.fillStyle = g; ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.l.x, p.l.y) : ctx.moveTo(p.l.x, p.l.y)));
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].r.x, pts[i].r.y);
        ctx.closePath(); ctx.fill();
      });
      ctx.shadowBlur = 0; ctx.fillStyle = '#7a0f1a';
      [[222, 512, 4, 10], [316, 528, 3, 8], [384, 540, 4, 12]].forEach(([x, y, rx, ry]) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); });
      ctx.restore();
    }

    function grab() {
      if (phase !== 'idle') return;
      phase = 'play'; I.lock();
      // La sombra huye hacia el borde más cercano, estirándose
      const dx = sh.x - W / 2, dy = sh.y - H / 2, d = Math.hypot(dx, dy) || 1;
      sh.ang = Math.atan2(dy, dx);
      sh.tx = sh.x + (dx / d) * 640; sh.ty = sh.y + (dy / d) * 640;
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.2 }, 0)
        .to(sh, { x: sh.tx, y: sh.ty, stretch: 2.4, duration: 0.85, ease: 'power3.in' }, 0)
        .to(S, { alpha: 0, duration: 0.5 }, 0.3)
        .to(S, { vig: 0, duration: 1.0 }, 0.2)
        .to(S, { frag: 1, duration: 0.9, ease: 'power2.out' }, 0.4)
        .to(S, { letter: 1, duration: 0.9, ease: 'power2.out' }, 1.9)
        .to(S, { frag: 0.22, duration: 0.9 }, 1.9)
        .call(() => I.complete(), null, 3.3);
    }

    function draw(dt, t) {
      I.paper();
      fragment();

      if (phase === 'idle') {
        // Trayectoria lenta de la sombra + leve huida ante el puntero (siempre alcanzable)
        let tx = W / 2 + 155 * Math.sin(t * 0.62 + ph) + 35 * Math.sin(t * 1.7);
        let ty = H / 2 + 235 * Math.sin(t * 0.41 + ph * 0.5) + 30 * Math.sin(t * 1.3 + 1);
        let d = 999;
        if (ptr) {
          d = dist(ptr.x, ptr.y, sh.x, sh.y);
          if (d < 200) { const k = (1 - d / 200) * 40 / (d || 1); tx += (sh.x - ptr.x) * k; ty += (sh.y - ptr.y) * k; }
        }
        const f = 1 - Math.exp(-5 * dt);
        sh.x += (tx - sh.x) * f; sh.y += (ty - sh.y) * f;
        sh.x = clamp(sh.x, 60, W - 60); sh.y = clamp(sh.y, 90, H - 90);
        prox += ((ptr ? clamp(1 - d / 300) : 0) - prox) * Math.min(1, dt * 6);
        S.catch = clamp(S.catch + (ptr && d < R ? dt / 0.45 : -dt / 1.2));
        if (force || S.catch >= 1) grab();
      }

      // Estela de humo
      histT += dt;
      if (histT > 0.04) { histT = 0; hist.push({ x: sh.x, y: sh.y }); if (hist.length > 16) hist.shift(); }
      ctx.save();
      ctx.globalAlpha = S.alpha;
      hist.forEach((h, i) => blob(h.x, h.y, 20 + (i / hist.length) * 34, 0.05 + (i / hist.length) * 0.22));
      // Cuerpo: tres lóbulos que tiemblan más cuanto más cerca está el puntero
      ctx.translate(sh.x, sh.y); ctx.rotate(sh.ang); ctx.scale(1 + sh.stretch, 1 / (1 + sh.stretch * 0.35));
      const body = 58 * (1 - 0.25 * S.catch), jit = 2 + 7 * prox;
      for (let k = 0; k < 3; k++) {
        const a = t * (0.7 + k * 0.4) + k * 2.1;
        blob(Math.cos(a) * 14 + rand(-jit, jit) * 0.3, Math.sin(a) * 14 + rand(-jit, jit) * 0.3, body, 0.55);
      }
      ctx.restore();

      // Viñeta de tensión: se cierra al acercarse y late más rápido al estar a punto de alcanzarla
      const beat = 0.5 + 0.5 * Math.sin(t * (3 + 6 * S.catch));
      const va = S.vig * (0.18 + 0.32 * prox + 0.1 * beat * (0.4 + prox));
      const v = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 470);
      v.addColorStop(0, 'rgba(30,0,8,0)'); v.addColorStop(1, `rgba(30,0,8,${va * 1.6})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

      I.letter(S.letter, lerp(0.95, 1, S.letter));
      I.hint('Alcánzala', 'rgba(60,20,30,.7)', S.hint);
    }

    return {
      draw,
      move(p) {
        ptr = p;
        if (p && !moved) { moved = true; I.tween(S, { hint: 0, duration: 0.8 }); }
        I.cursor(p && dist(p.x, p.y, sh.x, sh.y) < R * 1.6 ? 'pointer' : 'default');
      },
      down(p) {
        ptr = p;
        if (p && dist(p.x, p.y, sh.x, sh.y) < R * 1.6) force = true;   // un toque también la alcanza
      },
      up(p, e) { if (e && e.pointerType === 'touch') ptr = null; },
      key(e, down) {
        if (!down || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return false;
        force = true; return true;
      }
    };
  }

  /* ------------------------------------------------------------------------
     4 · LA TEORÍA DE KIM — elegir un momento y reordenar la línea temporal
     ------------------------------------------------------------------------ */
  function timeline(I) {
    const { ctx, W, H } = I;
    const CLK = { x: 256, y: 176, r: 92 };
    const SLOT = [110, 256, 402], CARD_W = 112, CARD_H = 150, CARD_Y = 398, LINE_Y = 522;
    const cards = [0, 1, 2].map((i) => ({ i, from: i, to: i, mv: 1, lift: 0, hov: 0 }));
    const S = { h: ((10 + 8 / 60) / 12) * TAU, m: (8 / 60) * TAU, flow: 1, glow: 0, comp: 1, letter: 0, hint: 1 };
    const bubbles = Array.from({ length: 12 }, () => ({ x: rand(40, W - 40), y: rand(40, H - 40), r: rand(3, 9), v: rand(14, 34), ph: rand(0, TAU) }));
    let hover = -1, phase = 'idle';

    const slotOf = (c) => lerp(c.from, c.to, c.mv * c.mv * (3 - 2 * c.mv));
    const cardX = (c) => { const s = slotOf(c), a = Math.floor(s), b = Math.min(2, a + 1); return lerp(SLOT[a], SLOT[b], s - a); };

    function art(i, w, h) {                            // pequeñas escenas dentro de cada fragmento
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      if (i === 0) { g.addColorStop(0, '#1f8b83'); g.addColorStop(1, '#0c4a4f'); }
      else if (i === 1) { g.addColorStop(0, '#3a9a62'); g.addColorStop(1, '#1d5d3d'); }
      else { g.addColorStop(0, '#176077'); g.addColorStop(1, '#0a2c43'); }
      ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
      if (i === 0) {                                   // burbujas
        [[-18, 20, 20], [14, -6, 13], [-4, -34, 8], [26, 34, 7]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; });
      } else if (i === 1) {                            // hoja de papel cayendo
        ctx.save(); ctx.rotate(-0.28); ctx.fillStyle = '#fbf6ec'; rr(ctx, -26, -34, 52, 66, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(26,95,80,.5)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-16, -18 + k * 13); ctx.lineTo(16, -18 + k * 13); ctx.stroke(); }
        ctx.restore();
      } else {                                         // destellos
        ctx.fillStyle = '#fff';
        [[0, -6, 22], [-24, 26, 11], [24, -34, 9]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); });
      }
    }

    function clock() {
      const { x, y, r } = CLK;
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = `rgba(31,139,131,${0.25 + 0.5 * S.glow})`; ctx.shadowBlur = 14 + 16 * S.glow;
      ctx.fillStyle = '#fbf6ec'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#1f7f78'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = 'rgba(30,26,36,.65)';
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, l = k % 3 ? 8 : 15; ctx.lineWidth = k % 3 ? 2 : 3; ctx.beginPath(); ctx.moveTo(Math.sin(a) * (r - 12), -Math.cos(a) * (r - 12)); ctx.lineTo(Math.sin(a) * (r - 12 - l), -Math.cos(a) * (r - 12 - l)); ctx.stroke(); }
      const hand = (ang, len, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-Math.sin(ang) * -8, Math.cos(ang) * -8); ctx.lineTo(Math.sin(ang) * len, -Math.cos(ang) * len); ctx.stroke(); };
      hand(S.h, r * 0.5, 6, '#1e1a24'); hand(S.m, r * 0.76, 4, '#1e1a24');
      ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.restore();
    }

    function select(k) {                                // k = posición visible (0..2, izquierda a derecha)
      if (phase !== 'idle') return;
      phase = 'play'; I.lock();
      const sel = cards.find((c) => Math.round(slotOf(c)) === k);
      // Nuevo orden: el momento elegido pasa al principio (si ya era el primero, pasa al final)
      const old = [...cards].sort((a, b) => slotOf(a) - slotOf(b));
      const order = k === 0 ? [old[1], old[2], old[0]] : [old[k], ...old.filter((_, i) => i !== k)];
      order.forEach((c, slot) => { c.from = slotOf(c); c.to = slot; c.mv = 0; });
      const rewind = TAU * 2.2;
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.2 }, 0)
        .to(sel, { lift: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .to(S, { flow: -2.2, duration: 0.5, ease: 'power2.out' }, 0.2)
        .to(S, { m: S.m - rewind, h: S.h - rewind / 12, duration: 1.5, ease: 'power3.inOut' }, 0.3);
      order.forEach((c, n) => tl.to(c, { mv: 1, duration: 0.85, ease: 'none' }, 0.4 + n * 0.12));
      tl.to(sel, { lift: 0, duration: 0.4 }, 1.4)
        .to(S, { glow: 1, duration: 0.6 }, 1.6)
        .to(S, { flow: 0.6, duration: 0.8 }, 1.6)
        .to(S, { comp: 0, duration: 0.7, ease: 'power1.inOut' }, 2.4)
        .to(S, { letter: 1, duration: 0.8, ease: 'power2.out' }, 2.6)
        .call(() => I.complete(), null, 3.9);
    }

    function draw(dt, t) {
      I.paper();
      if (phase === 'idle') S.m += dt * 0.12;           // el minutero avanza con calma
      cards.forEach((c) => { c.hov += ((phase === 'idle' && hover === Math.round(slotOf(c)) ? 1 : 0) - c.hov) * Math.min(1, dt * 10); });

      // Burbujas del fondo (suben; durante el retroceso, bajan)
      ctx.save(); ctx.strokeStyle = `rgba(31,139,131,${0.28 * (0.3 + 0.7 * S.comp)})`; ctx.lineWidth = 1.5;
      bubbles.forEach((b) => {
        b.y -= b.v * dt * S.flow; if (b.y < 30) b.y = H - 30; if (b.y > H - 30) b.y = 30;
        ctx.beginPath(); ctx.arc(b.x + Math.sin(t + b.ph) * 6, b.y, b.r, 0, TAU); ctx.stroke();
      });
      ctx.restore();

      if (S.comp > 0.005) {
        ctx.save(); ctx.globalAlpha = S.comp;
        clock();
        // Línea temporal con tres hitos
        ctx.strokeStyle = `rgba(31,127,120,${0.45 + 0.5 * S.glow})`; ctx.lineWidth = 3 + 2 * S.glow; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(64, LINE_Y); ctx.lineTo(448, LINE_Y); ctx.stroke();
        ['I', 'II', 'III'].forEach((n, k) => { ctx.fillStyle = 'rgba(30,26,36,.55)'; ctx.font = `italic 500 20px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(n, SLOT[k], LINE_Y + 34); });
        // Fragmentos
        cards.forEach((c) => {
          const x = cardX(c), up = Math.sin(Math.PI * c.mv) * (c.mv < 1 ? 46 : 0), y = CARD_Y - up - 8 * c.lift - 6 * c.hov;
          ctx.strokeStyle = 'rgba(31,127,120,.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y + CARD_H / 2); ctx.lineTo(x, LINE_Y); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1f7f78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, LINE_Y, 6, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(x, y);
          ctx.shadowColor = `rgba(31,139,131,${0.25 + 0.4 * (c.hov + c.lift) + 0.3 * S.glow})`; ctx.shadowBlur = 12 + 14 * (c.hov + c.lift);
          rr(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.shadowBlur = 0; ctx.save(); rr(ctx, -CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 9); ctx.clip(); art(c.i, CARD_W - 8, CARD_H - 8); ctx.restore();
          ctx.restore();
        });
        ctx.restore();
      }
      I.letter(S.letter, lerp(0.92, 1, S.letter));
      I.hint('Elige un momento', 'rgba(29,95,100,.8)', S.hint);
    }

    const hitSlot = (p) => {
      if (!p) return -1;
      for (let k = 0; k < 3; k++) if (Math.abs(p.x - SLOT[k]) < CARD_W / 2 + 6 && Math.abs(p.y - CARD_Y) < CARD_H / 2 + 8) return k;
      return -1;
    };
    return {
      draw,
      move(p) { hover = hitSlot(p); I.cursor(hover >= 0 ? 'pointer' : 'default'); },
      down(p) { const k = hitSlot(p); if (k >= 0) select(k); },
      key(e, down) {
        if (!down || e.repeat || phase !== 'idle' || !'123'.includes(e.key)) return false;
        select(Number(e.key) - 1); return true;
      }
    };
  }

  /* ------------------------------------------------------------------------
     5 · A OSCURAS — un halo de luz descubre la letra escondida
     ------------------------------------------------------------------------ */
  function darkness(I) {
    const { ctx, W, H } = I;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const lit = mk(W, H), tctx = lit.getContext('2d');
    const MS = 0.5, mask = mk(W * MS, H * MS), mctx = mask.getContext('2d');
    const GW = 16, GH = 22, cov = new Float32Array(GW * GH);
    const spots = [[130, 580], [382, 580], [130, 120], [382, 120]];
    const L = spots[Math.floor(Math.random() * spots.length)], LS = 0.42;
    const S = { recover: 0, move: 0, halo: 1, hint: 1 };
    const virt = { x: W / 2, y: H / 2 };
    let ptr = null, last = null, phase = 'idle', auto = false, moved = false;
    const HR = 95;                                      // radio del halo (px de canvas)

    function skull(c, cx, cy, s) {                      // calavera esquemática (guiño a la portada)
      c.save(); c.translate(cx, cy); c.scale(s, s); c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, -10, 92, 80, 0, 0, TAU); c.stroke();
      rr(c, -52, 52, 104, 62, 18); c.stroke();
      c.beginPath(); c.arc(-38, 6, 26, 0, TAU); c.stroke();
      c.beginPath(); c.arc(38, 6, 26, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(-48, -4); c.lineTo(-28, 16); c.moveTo(-28, -4); c.lineTo(-48, 16); c.stroke();     // ojo con X
      c.beginPath(); c.moveTo(38, 16); c.bezierCurveTo(18, 2, 26, -10, 38, -2); c.bezierCurveTo(50, -10, 58, 2, 38, 16); c.stroke(); // ojo con corazón
      c.beginPath(); c.moveTo(0, 40); c.lineTo(-9, 56); c.lineTo(9, 56); c.closePath(); c.stroke();
      c.beginPath(); for (let k = -3; k <= 3; k++) { c.moveTo(k * 14, 80); c.lineTo(k * 14, 112); } c.stroke();
      c.restore();
    }
    function roses(c) {                                 // espirales tipo rosa en las esquinas
      [[70, 90], [W - 70, 92], [64, H - 96], [W - 66, H - 90]].forEach(([x, y]) => {
        c.beginPath(); for (let a = 0; a < 15; a += 0.2) { const r = 2 + a * 3.4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); } c.stroke();
      });
    }

    function scene(c, lighted, t, k) {                     // misma composición en versión oscura y en versión iluminada
      if (lighted) {
        c.fillStyle = '#fbf6ec'; c.fillRect(0, 0, W, H);
        const g = c.createLinearGradient(0, 0, 90, 0); g.addColorStop(0, 'rgba(110,70,30,.16)'); g.addColorStop(1, 'rgba(110,70,30,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#e6dccb'; c.lineWidth = 2; c.strokeRect(24, 24, W - 48, H - 48);
        c.strokeStyle = 'rgba(11,90,115,.55)';
      } else {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a2230'); g.addColorStop(1, '#030b10');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(57,208,255,.20)'; c.lineWidth = 2; c.strokeRect(24, 24, W - 48, H - 48);
        c.strokeStyle = `rgba(57,208,255,${0.17 + 0.04 * Math.sin(t * 1.5)})`;
      }
      c.globalAlpha = k; c.lineWidth = 3; skull(c, W / 2, 300, 1);
      c.lineWidth = 2; c.globalAlpha = k * (lighted ? 0.8 : 0.7); roses(c); c.globalAlpha = 1;
    }

    function stamp(x, y) {
      const g = mctx.createRadialGradient(x * MS, y * MS, 2, x * MS, y * MS, HR * MS);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      mctx.globalAlpha = 0.24; mctx.fillStyle = g; mctx.beginPath(); mctx.arc(x * MS, y * MS, HR * MS, 0, TAU); mctx.fill(); mctx.globalAlpha = 1;
      const cw = W / GW, ch = H / GH;
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        const d = dist(x, y, (gx + 0.5) * cw, (gy + 0.5) * ch);
        if (d < HR) cov[gy * GW + gx] = Math.min(1.5, cov[gy * GW + gx] + 0.35 * (1 - d / HR));
      }
    }
    function lightTo(p) {                               // estampa a lo largo del trazo para no dejar huecos
      if (last) {
        const d = dist(last.x, last.y, p.x, p.y), n = Math.max(1, Math.ceil(d / 14));
        for (let k = 1; k <= n; k++) stamp(lerp(last.x, p.x, k / n), lerp(last.y, p.y, k / n));
      } else stamp(p.x, p.y);
      last = { x: p.x, y: p.y };
    }
    function letterFound() {
      const cw = W / GW, ch = H / GH; let sum = 0, n = 0;
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        const cx = (gx + 0.5) * cw, cy = (gy + 0.5) * ch;
        if (Math.abs(cx - L[0]) < 76 && Math.abs(cy - L[1]) < 56) { sum += Math.min(1, cov[gy * GW + gx]); n++; }
      }
      return n > 0 && sum / n > 0.4;
    }
    function found() {
      if (phase !== 'idle') return;
      phase = 'play'; I.lock();
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.2 }, 0)
        .to(S, { halo: 0, duration: 0.8 }, 0.2)
        .to(S, { recover: 1, duration: 1.4, ease: 'power2.inOut' }, 0.1)
        .to(S, { move: 1, duration: 1.2, ease: 'power3.inOut' }, 0.3)
        .call(() => I.complete(), null, 2.3);
    }

    function draw(dt, t) {
      if (auto) { ptr = { x: virt.x, y: virt.y }; }
      if (phase === 'idle' && ptr) { lightTo(ptr); if (letterFound()) found(); }

      const k = 1 - 0.8 * S.move;                       // al recuperarse la página, los dibujos ceden el protagonismo a la letra
      scene(ctx, false, t, k);
      const lx = lerp(L[0], W / 2, S.move), ly = lerp(L[1], H / 2, S.move), ls = lerp(LS, 1, S.move);
      // Versión iluminada (papel + dibujos + letra) en un lienzo auxiliar
      scene(tctx, true, t, k);
      tctx.save(); tctx.translate(lx, ly); tctx.scale(ls, ls); tctx.translate(-W / 2, -H / 2); drawBigLetter(tctx, I.letterChar); tctx.restore();
      if (S.recover > 0) { ctx.globalAlpha = S.recover; ctx.drawImage(lit, 0, 0); ctx.globalAlpha = 1; }
      tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(mask, 0, 0, W, H); tctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.93; ctx.drawImage(lit, 0, 0); ctx.globalAlpha = 1;

      if (ptr && S.halo > 0.01) {                       // resplandor cálido del halo
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = S.halo;
        const g = ctx.createRadialGradient(ptr.x, ptr.y, 4, ptr.x, ptr.y, HR * 1.35);
        g.addColorStop(0, 'rgba(255,205,140,.30)'); g.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = g; ctx.fillRect(ptr.x - HR * 1.4, ptr.y - HR * 1.4, HR * 2.8, HR * 2.8);
        ctx.restore();
      }
      I.hint('Pasa la luz', 'rgba(120,210,240,.6)', S.hint * (0.6 + 0.4 * Math.sin(t * 2)));
    }

    return {
      draw,
      move(p) {
        if (auto) return;
        ptr = p; if (!p) last = null;
        if (p && !moved) { moved = true; I.tween(S, { hint: 0, duration: 0.8 }); }
      },
      down(p) { if (!auto) { ptr = p; last = null; } },
      up(p, e) { if (e && e.pointerType === 'touch') { ptr = null; last = null; } },
      key(e, down) {                                    // alternativa de teclado: el halo recorre la página hasta la letra
        if (!down || e.repeat || auto || phase !== 'idle' || (e.key !== 'Enter' && e.key !== ' ')) return false;
        auto = true; last = null; I.tween(S, { hint: 0, duration: 0.3 });
        const tl = I.timeline();
        tl.to(virt, { x: W - 100, y: 180, duration: 0.8, ease: 'sine.inOut' }).to(virt, { x: 100, y: 440, duration: 1.1, ease: 'sine.inOut' }).to(virt, { x: L[0], y: L[1], duration: 1.0, ease: 'sine.inOut' });
        return true;
      },
      destroy() { mask.width = lit.width = 1; }
    };
  }

  /* ------------------------------------------------------------------------
     6 · CULPA MÍA — mantener pulsado para acelerar
     ------------------------------------------------------------------------ */
  function speed(I) {
    const { ctx, W, H } = I;
    const DIAL = { x: 256, y: 330, r: 150 }, A0 = Math.PI * 5 / 6, SWEEP = Math.PI * 4 / 3;
    const mesh = I.mesh;
    const S = { prog: 0, slide: 0, flash: 0, pop: 0, hint: 1 };
    const lines = Array.from({ length: 36 }, () => ({ x: rand(0, W), y: rand(30, H - 30), len: rand(0.5, 1), spd: rand(0.5, 1) }));
    const calm = reduceMotion ? 0.2 : 1;
    let held = false, phase = 'idle', wheel = 0;

    function car(x, y) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(255,255,255,.93)';
      ctx.beginPath();
      ctx.moveTo(-62, 8); ctx.lineTo(-62, -4); ctx.quadraticCurveTo(-56, -10, -40, -12); ctx.lineTo(-22, -14); ctx.quadraticCurveTo(-10, -32, 14, -32);
      ctx.lineTo(30, -32); ctx.quadraticCurveTo(44, -30, 52, -14); ctx.lineTo(62, -10); ctx.quadraticCurveTo(66, -6, 66, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,22,80,.75)';
      ctx.beginPath(); ctx.moveTo(-14, -14); ctx.quadraticCurveTo(-6, -26, 12, -26); ctx.lineTo(28, -26); ctx.quadraticCurveTo(36, -22, 40, -14); ctx.closePath(); ctx.fill();
      [-38, 38].forEach((wx) => {
        ctx.save(); ctx.translate(wx, 10); ctx.fillStyle = '#1b1650'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.rotate(wheel); ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke(); }
        ctx.restore();
      });
      ctx.restore();
    }

    function energetic(t, dx, dy) {
      ctx.save(); ctx.translate(dx, dy);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#14103f'); g.addColorStop(0.45, '#3a1668'); g.addColorStop(0.85, '#a8267a'); g.addColorStop(1, '#e0457b');
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; rr(ctx, 26, 26, W - 52, H - 52, 14); ctx.stroke();

      // Líneas de velocidad
      const p = S.prog, a = (0.12 + 0.55 * p + 0.3 * S.slide) * (1 - Math.pow(S.slide, 3)), v = lerp(50, 2600, Math.pow(p, 1.2)) * (1 + 2 * S.slide);
      ctx.lineCap = 'round';
      lines.forEach((l) => {
        l.x -= v * l.spd * (1 / 60) * (S.dt || 1);
        const len = lerp(14, 230, p) * l.len * (1 + 2 * S.slide);
        if (l.x + len < -10) { l.x = W + rand(0, 120); l.y = rand(30, H - 30); }
        ctx.strokeStyle = `rgba(255,${200 + 40 * l.len | 0},235,${a * l.spd})`; ctx.lineWidth = 1.5 + 2 * l.len * p;
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + len, l.y); ctx.stroke();
      });

      // Cuentarrevoluciones
      const { x, y, r } = DIAL, ang = A0 + SWEEP * p;
      ctx.fillStyle = 'rgba(10,6,40,.45)'; ctx.beginPath(); ctx.arc(x, y, r + 26, 0, TAU); ctx.fill();
      ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath(); ctx.arc(x, y, r, A0, A0 + SWEEP); ctx.stroke();
      if (p > 0.005) {
        const ag = ctx.createLinearGradient(x - r, y, x + r, y); ag.addColorStop(0, '#ff7ac6'); ag.addColorStop(0.6, '#ffd24a'); ag.addColorStop(1, '#ff4d4d');
        ctx.strokeStyle = ag; ctx.shadowColor = 'rgba(255,120,180,.8)'; ctx.shadowBlur = 8 + 22 * p;
        ctx.beginPath(); ctx.arc(x, y, r, A0, ang); ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.lineWidth = 3;
      for (let k = 0; k <= 24; k++) {
        const aa = A0 + (k / 24) * SWEEP, l = k % 4 ? 10 : 20;
        ctx.strokeStyle = `rgba(255,255,255,${k / 24 <= p ? 0.95 : 0.4})`;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(aa) * (r - 22), y + Math.sin(aa) * (r - 22)); ctx.lineTo(x + Math.cos(aa) * (r - 22 - l), y + Math.sin(aa) * (r - 22 - l)); ctx.stroke();
      }
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 5; ctx.shadowColor = 'rgba(255,77,109,.9)'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * (r - 34), y + Math.sin(ang) * (r - 34)); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a1668'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
      car(x, y + 98);

      if (S.hint > 0.01) {
        ctx.save(); ctx.globalAlpha = S.hint * (0.65 + 0.35 * Math.sin(t * 5)); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.font = `700 19px ${SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
        ctx.fillText('MANTÉN PULSADO', W / 2 + 2, DIAL.y + DIAL.r + 78);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.restore();
      }
      ctx.restore();
    }

    function launch() {
      if (phase !== 'idle') return;
      phase = 'play'; held = false; I.lock();
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.15 }, 0)
        .to(S, { slide: 1, duration: 0.7, ease: 'power3.in' }, 0.1)
        .to(S, { flash: 1, duration: 0.12 }, 0.7).to(S, { flash: 0, duration: 0.5 }, 0.82)
        .to(S, { pop: 1, duration: 0.7, ease: 'back.out(2.2)' }, 0.7)
        .call(() => I.complete(), null, 1.9);
    }

    function draw(dt, t) {
      S.dt = dt * 60;
      if (phase === 'idle') {
        S.prog = clamp(S.prog + (held ? dt / 1.5 : -dt / 0.9));
        if (S.prog >= 1) launch();
      }
      wheel += dt * (3 + 40 * S.prog);

      // Vibración: en el dibujo y, muy leve, en la propia página 3D
      const amp = (0.5 + 7 * Math.pow(S.prog, 1.4)) * calm;
      const dx = (Math.random() - 0.5) * 2 * amp, dy = (Math.random() - 0.5) * 2 * amp;
      mesh.position.set(BW / 2 + dx * 0.0006, dy * 0.0006, 0);

      I.paper();
      if (S.slide > 0) I.letter(clamp(S.slide * 1.5 - 0.3), lerp(1.35, 1, S.pop));
      energetic(t, dx - S.slide * W * 1.25, dy);
      if (S.flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${0.55 * S.flash})`; ctx.fillRect(0, 0, W, H); }
    }

    const onDial = (p) => !!p && dist(p.x, p.y, DIAL.x, DIAL.y) < DIAL.r + 50;
    return {
      draw,
      down(p) { if (phase === 'idle' && onDial(p)) { held = true; I.tween(S, { hint: 0, duration: 0.4 }); } },
      move(p) { I.cursor(onDial(p) ? 'pointer' : 'default'); },
      up() { held = false; },
      key(e, down) {
        if (e.key !== 'Enter' && e.key !== ' ') return false;
        if (phase === 'idle') { held = down; if (down) I.tween(S, { hint: 0, duration: 0.4 }); }
        return true;
      },
      destroy() { mesh.position.set(BW / 2, 0, 0); }
    };
  }

  /* ------------------------------------------------------------------------
     7 · FABRICANTE DE LÁGRIMAS — una lágrima cae y la mancha revela una mariposa
     ------------------------------------------------------------------------ */
  function tear(I) {
    const { ctx, W, H } = I;
    const HIT = { x: 256, y: 205 }, LAND = { x: 256, y: 410 };
    const S = { y: HIT.y, fall: 0, R: 0, letter: 0, ill: 1, hint: 1 };
    const ph = [rand(0, TAU), rand(0, TAU), rand(0, TAU), rand(0, TAU)];
    const drops = [], rings = [];
    let phase = 'idle', hover = false;

    function dropPath(x, y, r, st) {
      ctx.beginPath(); ctx.moveTo(x, y - r * 2.1 * st);
      ctx.bezierCurveTo(x + r * 0.2, y - r * 1.2 * st, x + r, y - r * 0.5, x + r, y + r * 0.15);
      ctx.arc(x, y + r * 0.15, r, 0, Math.PI, false);
      ctx.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.2, y - r * 1.2 * st, x, y - r * 2.1 * st); ctx.closePath();
    }

    function butterfly() {                              // mariposa de cristal, trazo fino
      ctx.save(); ctx.translate(W / 2, 345);
      ctx.strokeStyle = 'rgba(30,60,130,.8)'; ctx.fillStyle = 'rgba(120,160,225,.12)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let side = 0; side < 2; side++) {
        ctx.save(); ctx.scale(side ? -1 : 1, 1);
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(-40, -110, -130, -150, -165, -110); ctx.bezierCurveTo(-190, -78, -150, -30, -105, -8); ctx.bezierCurveTo(-70, 6, -30, 0, 0, -10); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-35, 10, -95, 10, -118, 44); ctx.bezierCurveTo(-135, 70, -104, 112, -72, 104); ctx.bezierCurveTo(-40, 96, -12, 52, 0, 20); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 1.2;
        [[-70, -90], [-120, -60], [-130, -30], [-92, -14]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(x * 0.55, y * 0.9, x, y); ctx.stroke(); });
        [[-60, 40], [-92, 70], [-74, 98]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(x * 0.5, y * 0.7, x, y); ctx.stroke(); });
        ctx.lineWidth = 2;
        ctx.restore();
      }
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, 66); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(-8, -66, -26, -76); ctx.moveTo(0, -38); ctx.quadraticCurveTo(8, -66, 26, -76); ctx.stroke();
      ctx.fillStyle = '#fff';                            // destellos de cristal
      [[-165, -110], [-118, 44], [-105, -8], [-72, 104], [-130, -30], [165, -110], [118, 44], [105, -8], [72, 104], [130, -30]].forEach(([x, y], k) => {
        const a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(performance.now() * 0.003 + k)); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      });
      ctx.restore();
    }

    function stainPath(R, t) {
      ctx.beginPath();
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * TAU;
        const r = R * (1 + 0.09 * Math.sin(3 * a + ph[0] + t * 0.5) + 0.06 * Math.sin(5 * a + ph[1] - t * 0.4) + 0.035 * Math.sin(9 * a + ph[2] + t * 0.7) + 0.07 * Math.cos(2 * a + ph[3]));
        const x = LAND.x + Math.cos(a) * r, y = LAND.y + Math.sin(a) * r * 0.95;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    }

    function impact() {
      rings.push({ r: 4, a: 0.7 }, { r: -10, a: 0.5 });
      for (let k = 0; k < 7; k++) { const a = rand(-2.6, -0.5); drops.push({ x: LAND.x, y: LAND.y, vx: Math.cos(a) * rand(40, 130), vy: Math.sin(a) * rand(120, 260), life: 0, max: rand(0.5, 0.9), r: rand(1.6, 3.4) }); }
    }

    function release() {
      if (phase !== 'idle') return;
      phase = 'play'; I.lock();
      const tl = I.timeline();
      tl.to(S, { hint: 0, duration: 0.15 }, 0)
        .to(S, { fall: 1, y: LAND.y, duration: 0.62, ease: 'power2.in' }, 0)
        .call(impact, null, 0.62)
        .to(S, { R: 560, duration: 3.0, ease: 'power2.out' }, 0.62)
        .to(S, { letter: 1, duration: 1.1, ease: 'power2.out' }, 2.1)
        .to(S, { ill: 0.32, duration: 1.1 }, 2.1)
        .call(() => I.complete(), null, 3.9);
    }

    function draw(dt, t) {
      I.paper();

      // Mancha acuosa: recorta la mancha y dibuja dentro la tinta y la ilustración
      if (S.R > 1) {
        ctx.save(); stainPath(S.R, t); ctx.clip();
        const wash = ctx.createRadialGradient(LAND.x, LAND.y, 10, LAND.x, LAND.y, Math.max(40, S.R));
        wash.addColorStop(0, 'rgba(70,110,170,.30)'); wash.addColorStop(1, 'rgba(70,110,170,.17)');
        ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(50,85,150,.20)'; ctx.lineWidth = 22; stainPath(S.R, t); ctx.stroke();   // borde más cargado, como el agua al secarse
        ctx.globalAlpha = S.ill; butterfly();
        ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(50,85,150,.38)'; ctx.lineWidth = 2.4; stainPath(S.R, t); ctx.stroke(); ctx.restore();
      }

      // Lágrima suspendida / cayendo
      if (S.fall < 1) {
        const bob = phase === 'idle' ? Math.sin(t * 1.8) * 4 : 0, y = S.y + bob, st = 1 + 0.35 * Math.sin(S.fall * Math.PI);
        ctx.save();
        const a = hover ? 0.2 : 0.1, pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        if (phase === 'idle') { ctx.strokeStyle = `rgba(70,110,170,${a * (0.5 + pulse)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(HIT.x, y + 6, 40 + pulse * 10, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = 'rgba(70,90,120,.10)'; ctx.beginPath(); ctx.ellipse(LAND.x, LAND.y, 22 * (0.6 + S.fall * 0.5), 7, 0, 0, TAU); ctx.fill();   // sombra sobre el papel
        const g = ctx.createLinearGradient(0, y - 40, 0, y + 24); g.addColorStop(0, 'rgba(160,200,240,.55)'); g.addColorStop(1, 'rgba(60,110,190,.85)');
        ctx.fillStyle = g; ctx.strokeStyle = 'rgba(50,90,170,.8)'; ctx.lineWidth = 1.6;
        dropPath(HIT.x, y, hover ? 20 : 19, st); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(HIT.x - 7, y + 2, 3.2, 7, 0.4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // Ondas y salpicaduras al caer
      for (let k = rings.length - 1; k >= 0; k--) {
        const r = rings[k]; r.r += dt * 120; r.a -= dt * 0.55;
        if (r.a <= 0) { rings.splice(k, 1); continue; }
        if (r.r > 0) { ctx.strokeStyle = `rgba(50,85,150,${r.a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(LAND.x, LAND.y, r.r, r.r * 0.35, 0, 0, TAU); ctx.stroke(); }
      }
      for (let k = drops.length - 1; k >= 0; k--) {
        const d = drops[k]; d.life += dt; if (d.life > d.max) { drops.splice(k, 1); continue; }
        d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 700 * dt;
        ctx.fillStyle = `rgba(60,110,190,${1 - d.life / d.max})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      }

      I.letter(S.letter, lerp(0.92, 1, S.letter));
      I.hint('Toca la lágrima', 'rgba(50,85,150,.75)', S.hint);
    }

    const onDrop = (p) => !!p && dist(p.x, p.y, HIT.x, HIT.y + 6) < 75;
    return {
      draw,
      down(p) { if (phase === 'idle' && onDrop(p)) release(); },
      move(p) { hover = onDrop(p); I.cursor(hover ? 'pointer' : 'default'); },
      key(e, down) {
        if (!down || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return false;
        release(); return true;
      }
    };
  }

  const FACTORIES = [hypothesis, prince, shadow, timeline, darkness, speed, tear];
  return { start, stop, isActive, has };
})();
