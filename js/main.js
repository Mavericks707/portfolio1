/* Абдул-Керим — портфолио. Свет, движение, просмотр работ. */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  // Страховка: что бы ни случилось, заставка не должна закрывать сайт навсегда.
  setTimeout(() => { const p = document.querySelector('.pre'); if (p) p.remove(); if (window.__lenis) window.__lenis.start(); }, 7000);

  // Картинка проявляется только когда реально загрузилась.
  $$('.w__m img').forEach(img => {
    const on = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) on(); else img.addEventListener('load', on, { once: true });
  });

  /* ------------------------------------------------------------------
     СВЕТ. Один источник на весь сайт: дуга горизонта и северное сияние,
     как на работах. По мере скролла он меняет цвет и положение.
     ------------------------------------------------------------------ */
  const LIGHTS = {
    //        цвет ядра          цвет ореола           высота дуги, сила, сияние
    hero:        { a:[.86,.72,1.0], b:[.42,.14,.98], y:.31, k:1.00, au:.85 },
    violet:      { a:[.74,.52,1.0], b:[.33,.08,.82], y:.02, k:.72,  au:.70 },
    'violet-low':{ a:[.62,.40,1.0], b:[.22,.05,.60], y:-.30,k:.34,  au:.32 },
    off:         { a:[.6,.4,1.0],   b:[.2,.05,.5],   y:-.5, k:.10,  au:.05 },
    green:       { a:[.70,1.0,.82], b:[.03,.52,.32], y:.04, k:.74,  au:.72 },
    'green-low': { a:[.45,.95,.68], b:[.02,.32,.20], y:-.30,k:.34,  au:.32 },
    blue:        { a:[.70,.84,1.0], b:[.05,.20,.98], y:.05, k:.80,  au:.70 },
    'blue-low':  { a:[.50,.68,1.0], b:[.03,.12,.62], y:-.30,k:.36,  au:.32 },
    end:         { a:[.92,.84,1.0], b:[.30,.14,.98], y:.34, k:1.10, au:.95 },
  };
  const L = { ax:.86, ay:.72, az:1, bx:.42, by:.14, bz:.98, y:-.6, k:0, au:0, mx:.5, my:.5, p:0 };
  let glOK = false;

  (function initGL() {
    const c = $('#light');
    const gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision highp float;
uniform vec2 R;uniform float T,Y,K,AU,P;uniform vec3 A,B;uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(11.,7.);a*=.5;}return v;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
 float asp=R.x/R.y;
 uv.x+=(M.x-.5)*.05;
 float rad=max(asp*1.15,1.5);
 vec2 cen=vec2((M.x-.5)*.06,-.5+Y-rad);
 float d=length(uv-cen)-rad;
 float ang=atan(uv.x-cen.x,uv.y-cen.y);
 float line=exp(-abs(d)*90.);
 float near=exp(-max(d,0.)*7.);
 float far=exp(-max(d,0.)*2.6);
 float t=T*.05;
 float rays=fbm(vec2(ang*7.+t*1.6,d*1.3-t));
 rays=smoothstep(.34,.86,rays);
 float aur=rays*far*smoothstep(0.,.08,d);
 float inside=1.-smoothstep(-.11,-.002,d);
 vec3 col=vec3(0.);
 col+=B*far*.26*K;
 col+=mix(B,A,.45)*near*.75*K;
 col+=mix(B,A,.6)*aur*AU*.8;
 col+=(A*.75+vec3(.25))*line*1.5*K;
 col*=1.-inside*.985;
 float sp=exp(-length((uv-vec2((M.x-.5)*asp,(M.y-.5)))*vec2(1.,1.))*3.4);
 col+=B*sp*.13*(K+.25);
 float g=h(gl_FragCoord.xy+fract(T)*90.)-.5;
 col+=g*.018;
 gl_FragColor=vec4(col+vec3(.018,.018,.026),1.);
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = n => gl.getUniformLocation(pr, n);
    const U = { R:u('R'), T:u('T'), Y:u('Y'), K:u('K'), AU:u('AU'), P:u('P'), A:u('A'), B:u('B'), M:u('M') };
    const resize = () => {
      const s = Math.min(window.devicePixelRatio || 1, 1.5) * (innerWidth > 1400 ? .6 : .75);
      c.width = Math.round(innerWidth * s); c.height = Math.round(innerHeight * s);
      gl.viewport(0, 0, c.width, c.height);
    };
    addEventListener('resize', resize); resize();
    glOK = true;
    let mx = .5, my = .5, last = 0;
    const draw = now => {
      requestAnimationFrame(draw);
      if (document.hidden || now - last < 30) return; // экономим батарею
      last = now;
      mx += (L.mx - mx) * .05; my += (L.my - my) * .05;
      gl.uniform2f(U.R, c.width, c.height);
      gl.uniform1f(U.T, reduce ? 12 : now / 1000);
      gl.uniform1f(U.Y, L.y); gl.uniform1f(U.K, L.k); gl.uniform1f(U.AU, L.au);
      gl.uniform3f(U.A, L.ax, L.ay, L.az); gl.uniform3f(U.B, L.bx, L.by, L.bz);
      gl.uniform2f(U.M, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    requestAnimationFrame(draw);
    if (fine) addEventListener('pointermove', e => { L.mx = e.clientX / innerWidth; L.my = 1 - e.clientY / innerHeight; }, { passive: true });
  })();

  const setLight = (name, dur = 1.8) => {
    const s = LIGHTS[name]; if (!s) return;
    const to = { ax:s.a[0], ay:s.a[1], az:s.a[2], bx:s.b[0], by:s.b[1], bz:s.b[2], y:s.y, k:s.k, au:s.au };
    if (hasGsap && !reduce) { gsap.to(L, Object.assign(to, { duration: dur, ease: 'power2.inOut', overwrite: 'auto' })); }
    else Object.assign(L, to);
  };

  /* ------------------------------------------------------------------
     Просмотр работы на весь экран. Работает всегда, даже без анимаций.
     ------------------------------------------------------------------ */
  const works = $$('.w');
  const lb = $('.lb'), lbImg = $('.lb__img'), lbT = $('.lb__t'), lbN = $('.lb__n');
  let lbI = -1, lastFocus = null, lenis = null;
  const show = i => {
    lbI = (i + works.length) % works.length;
    const f = works[lbI], im = $('img', f);
    lbImg.src = f.dataset.full; lbImg.alt = im.alt;
    lbT.textContent = im.alt;
    lbN.textContent = String(lbI + 1).padStart(2, '0') + ' / ' + works.length;
    if (hasGsap && !reduce) gsap.fromTo(lbImg, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .7, ease: 'expo.out' });
  };
  const openLb = i => {
    lastFocus = document.activeElement;
    lb.hidden = false; show(i);
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    if (hasGsap && !reduce) gsap.fromTo('.lb__bg', { opacity: 0 }, { opacity: 1, duration: .4 });
    $('[data-lb=close]').focus();
  };
  const closeLb = () => {
    lb.hidden = true; lbImg.removeAttribute('src');
    if (lenis) lenis.start(); else document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  works.forEach((f, i) => $('.w__m', f).addEventListener('click', () => openLb(i)));
  lb.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (b) { const a = b.dataset.lb; if (a === 'prev') show(lbI - 1); else if (a === 'next') show(lbI + 1); else closeLb(); return; }
    if (e.target.classList.contains('lb__bg') || e.target === lb) closeLb();
  });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') show(lbI + 1);
    if (e.key === 'ArrowLeft') show(lbI - 1);
  });

  if (!hasGsap) { $('.pre') && $('.pre').remove(); Object.assign(L, { k: 1, au: .8, y: .2 }); return; }

  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  /* Счётчик просмотренных работ и подсветка раздела */
  const countN = $('#countN');
  const seen = new Set();
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { seen.add(e.target); countN.textContent = String(seen.size).padStart(2, '0'); io.unobserve(e.target); } });
    }, { threshold: .35 });
    works.forEach(w => io.observe(w));
  }
  /* Триггеры обычных секций создаём после закреплённых, иначе они считают позиции без учёта пинов */
  const bindSections = () => {
  ['violet', 'green', 'blue'].forEach(id => {
    const link = $(`[data-nav=${id}]`);
    ScrollTrigger.create({ trigger: '#' + id, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: link, className: 'is-on' } });
  });

  /* Свет следует за секциями */
  $$('[data-light]').forEach(s => {
    ScrollTrigger.create({
      trigger: s, start: 'top 60%', end: 'bottom 60%',
      onEnter: () => setLight(s.dataset.light), onEnterBack: () => setLight(s.dataset.light),
    });
  });

  };

  /* Без анимаций: только свет и просмотр */
  if (reduce) {
    $('.pre').remove();
    bindSections();
    setLight('hero', 0);
    ScrollTrigger.refresh();
    return;
  }

  /* Плавный скролл */
  lenis = window.__lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: t => 1 - Math.pow(1 - t, 3.2) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = a.getAttribute('href'); const el = t === '#top' ? 0 : $(t);
    if (el === null) return;
    e.preventDefault(); lenis.scrollTo(el, { duration: 2, offset: 0 });
  }));

  /* Заголовки: разбираем на слова в маске */
  $$('[data-split]').forEach(el => {
    const walk = n => {
      Array.from(n.childNodes).forEach(c => {
        if (c.nodeType === 3 && c.textContent.trim()) {
          const f = document.createDocumentFragment();
          c.textContent.split(/( +)/).forEach(t => {
            if (!t) return;
            if (!t.trim()) { f.append(' '); return; }
            const o = document.createElement('span'); o.className = 'wd';
            const i = document.createElement('span'); i.textContent = t; o.append(i); f.append(o);
          });
          c.replaceWith(f);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(el);
  });

  const mm = gsap.matchMedia();
  const pinnedSkip = '.expand__f,.stack__a,.stack__b,.cine__a,.cine__b,.deck__c,.ring__c,.pan__f,.acc__i .w';

  mm.add('(min-width:900px)', () => {
    /* Заголовки глав уезжают чуть медленнее скролла */
    gsap.to('.hero__t', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.ch1__t', { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.ch1', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.ch3__t', { letterSpacing: '.02em' }, { letterSpacing: '-.075em', ease: 'none', scrollTrigger: { trigger: '.ch3', start: 'top bottom', end: 'center center', scrub: true } });

    /* Питч-дек раскрывается из узкого окна на всю ширину */
    {
      const f = $('.expand__f'), m = $('.w__m', f), c = $('.expand__c');
      gsap.set(c, { opacity: 0, y: 24 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.expand', start: 'top top', end: '+=140%', pin: '.expand__stage', scrub: .6 } });
      tl.fromTo(m, { clipPath: 'inset(34% 32% 34% 32%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 })
        .fromTo($('img', f), { scale: 1.4 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .to(c, { opacity: 1, y: 0, duration: .3 }, .75);
    }

    /* Бренд-борд едет внутри окна */
    {
      const f = $('.pan__f');
      gsap.to(f, {
        y: () => -(f.offsetHeight - innerHeight), ease: 'none',
        scrollTrigger: { trigger: '.pan', start: 'top top', end: () => '+=' + (f.offsetHeight - innerHeight) * .75, pin: true, scrub: .4, invalidateOnRefresh: true },
      });
    }

    /* Карта накрывает карту */
    gsap.timeline({ scrollTrigger: { trigger: '.stack', start: 'center center', end: '+=110%', pin: true, scrub: .5 } })
      .fromTo('.stack__b', { yPercent: 112, rotate: 4 }, { yPercent: 0, rotate: 0, ease: 'power3.out' }, 0)
      .to('.stack__a', { scale: .88, filter: 'brightness(.45)', ease: 'none' }, 0);

    /* Горизонтальная галерея интерфейсов */
    {
      const tr = $('.hg__track');
      const dist = () => Math.max(0, tr.scrollWidth - innerWidth);
      const tween = gsap.to(tr, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.hg', start: 'center center', end: () => '+=' + dist(), pin: true, scrub: .5, invalidateOnRefresh: true } });
      $$('.hg__it .w').forEach(f => {
        const m = $('.w__m', f);
        gsap.fromTo(m, { rotateY: -14, scale: .92, transformPerspective: 1400, opacity: .4 }, {
          rotateY: 0, scale: 1, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: f, containerAnimation: tween, start: 'left 100%', end: 'left 62%', scrub: true },
        });
      });
    }

    /* Колонки постеров идут с разной скоростью */
    $$('[data-col]').forEach(c => {
      const s = parseFloat(c.dataset.col);
      gsap.fromTo(c, { y: () => -s * innerHeight / 100 * -.5 }, { y: () => s * innerHeight / 100, ease: 'none', scrollTrigger: { trigger: '.posters__cols', start: 'top bottom', end: 'bottom top', scrub: .5, invalidateOnRefresh: true } });
    });

    /* Заливка цветом: половины встречаются */
    gsap.fromTo('.flood__a', { xPercent: -16, opacity: .3 }, { xPercent: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: '.flood', start: 'top 95%', end: 'top 30%', scrub: .5 } });
    gsap.fromTo('.flood__b', { xPercent: 16, opacity: .3 }, { xPercent: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: '.flood', start: 'top 95%', end: 'top 30%', scrub: .5 } });

    /* Светлый лист поднимается и скругляется */
    gsap.fromTo('.mono__sheet', { clipPath: 'inset(0% 6% 0% 6% round 64px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.mono', start: 'top bottom', end: 'top 20%', scrub: .5 } });

    /* Кино: один зал растворяется в другом */
    {
      const a = $('.cine__a'), b = $('.cine__b');
      gsap.set([a, b], { xPercent: -50, yPercent: -50, x: 0, y: 0, left: '50%', top: '50%' });
      gsap.timeline({ scrollTrigger: { trigger: '.cine', start: 'top top', end: '+=180%', pin: '.cine__stage', scrub: .6 } })
        .fromTo(a, { scale: .72, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power2.out', duration: 1 })
        .to(a, { scale: 1.06, opacity: 0, ease: 'power1.in', duration: 1 }, 1.2)
        .fromTo(b, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power2.out', duration: 1 }, 1.4);
    }

    /* Havar: слово бежит, работы слегка следуют за курсором */
    gsap.fromTo('.havar__word span', { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.havar', start: 'top bottom', end: 'bottom top', scrub: .8 } });
    if (fine) {
      const hv = $('.havar');
      const items = $$('[data-mouse]', hv).map(el => ({ s: +el.dataset.mouse, x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }) }));
      hv.addEventListener('pointermove', e => {
        const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
        items.forEach(i => { i.x(dx * i.s); i.y(dy * i.s); });
      });
    }

    /* Колода: карты ложатся друг на друга */
    {
      const cards = $$('.deck__c'), swaps = $$('.deck__s');
      const rot = [-3, 2.4, -1.6, 2];
      gsap.set(cards, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
      cards.forEach((c, i) => {
        if (i === 0) gsap.set(c, { rotate: rot[0] });
        else gsap.set(c, { yPercent: 90, rotate: rot[i] + 10, opacity: 0 });
      });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.deck', start: 'top top', end: '+=240%', pin: true, scrub: .5,
          onUpdate: self => { const two = self.progress > .5; swaps[0].classList.toggle('is-on', !two); swaps[1].classList.toggle('is-on', two); },
        },
      });
      cards.slice(1).forEach((c, i) => {
        tl.to(c, { yPercent: -50, rotate: rot[i + 1], opacity: 1, ease: 'power3.out', duration: 1 }, i)
          .to(cards[i], { scale: .92, ease: 'none', duration: 1 }, i);
      });
    }

    /* Гигантские слова едут навстречу */
    $$('[data-drift]').forEach(el => {
      const s = parseFloat(el.dataset.drift);
      gsap.fromTo(el, { xPercent: s < 0 ? 4 : -24 }, { xPercent: s < 0 ? -24 : 4, ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    });

    /* Кислота: точка заливает весь экран */
    gsap.timeline({ scrollTrigger: { trigger: '.acid', start: 'top top', end: '+=130%', pin: '.acid__pin', scrub: .5 } })
      .to('.acid__dot', { clipPath: 'circle(120% at 50% 50%)', ease: 'power2.in', duration: 1 })
      .fromTo('.acid__t', { opacity: 0, scale: .82 }, { opacity: 1, scale: 1, ease: 'expo.out', duration: .5 }, .65);

    /* Кольцо работ в трёхмерном пространстве */
    {
      const rotEl = $('.ring__rot'), cs = $$('.ring__c'), caps = $$('.ring__caps .cap');
      const R = () => cs[0].offsetWidth * 1.16;
      const place = () => {
        const r = R();
        cs.forEach((c, i) => {
          const h = c.offsetHeight || 400;
          gsap.set(c, { x: -c.offsetWidth / 2, y: -h / 2, rotateY: i * 60, z: 0, transformOrigin: `50% 50% ${-r}px`, transformPerspective: 0 });
          c.style.transform = `translate3d(${-c.offsetWidth / 2}px,${-h / 2}px,0) rotateY(${i * 60}deg) translateZ(${r}px)`;
        });
        rotEl.style.transform = `translateZ(${-r - 40}px) rotateX(-2deg) rotateY(0deg)`;
      };
      place();
      ScrollTrigger.addEventListener('refreshInit', place);
      const st = { a: 0 };
      gsap.to(st, {
        a: -300, ease: 'none',
        onUpdate() { rotEl.style.transform = `translateZ(${-R() - 40}px) rotateX(-2deg) rotateY(${st.a}deg)`; },
        scrollTrigger: {
          trigger: '.ring', start: 'top top', end: '+=320%', pin: '.ring__stage', scrub: .7,
          onUpdate: self => {
            const k = Math.min(2, Math.floor(self.progress * 3));
            caps.forEach((c, i) => c.classList.toggle('is-on', i === k));
          },
        },
      });
    }

    /* Enclave: книга и панель собираются */
    gsap.fromTo('.encl__a img', { yPercent: -5, scale: 1.1 }, { yPercent: 5, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.encl', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* Аккордеон пространств: панель раскрывается при скролле и наведении */
    {
      const it = $$('.acc__i');
      const set = k => it.forEach((p, i) => p.classList.toggle('is-on', i === k));
      ScrollTrigger.create({
        trigger: '.acc', start: 'top top', end: '+=260%', pin: true,
        onUpdate: self => set(Math.min(it.length - 1, Math.floor(self.progress * it.length))),
      });
      it.forEach((p, i) => p.addEventListener('pointerenter', () => set(i)));
    }

    /* Параллакс */
    $$('[data-speed]').forEach(el => {
      const s = parseFloat(el.dataset.speed);
      gsap.fromTo(el, { y: () => -s * innerHeight / 100 }, { y: () => s * innerHeight / 100, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .6, invalidateOnRefresh: true } });
    });

    /* Финальное имя сходится */
    gsap.fromTo('.end__t', { letterSpacing: '.04em' }, { letterSpacing: '-.06em', ease: 'none', scrollTrigger: { trigger: '.end', start: 'top bottom', end: 'center center', scrub: true } });
  });

  /* Появления (и десктоп, и телефон) */
  $$('[data-split]').forEach(el => {
    gsap.set($$('.wd>span', el), { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to($$('.wd>span', el), { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .07 }),
    });
  });
  $$('[data-fade],.ch3__l').forEach(el => {
    if (el.closest('.ring__caps,.deck__s') || (el.classList.contains('expand__c') && innerWidth >= 900)) return;
    gsap.set(el, { y: 24, opacity: 0 });
    ScrollTrigger.create({
      trigger: el, start: 'top 94%', once: true,
      onEnter: () => gsap.to(el, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', delay: .1 }),
    });
  });

  /* Проявление работы шторкой + мягкий зум изнутри.
     У каждого блока своя шторка: фиолетовый снизу вверх, зелёный сжатием скругления, синий от центра. */
  $$('.w').forEach(f => {
    if (f.matches(pinnedSkip) || f.closest('.hg')) return;
    const m = $('.w__m', f), im = $('img', f);
    const green = f.closest('.block--green'), blue = f.closest('.block--blue');
    const from = green ? 'inset(8% 8% 8% 8% round 48px)' : blue ? 'inset(50% 0% 50% 0%)' : 'inset(100% 0% 0% 0%)';
    const to = green ? 'inset(0% 0% 0% 0% round 20px)' : 'inset(0% 0% 0% 0%)';
    gsap.set(m, { clipPath: from, opacity: green ? 0 : 1 });
    gsap.set(im, { scale: 1.22 });
    ScrollTrigger.create({
      trigger: f, start: 'top 90%', once: true,
      onEnter: () => {
        gsap.to(m, { clipPath: to, opacity: 1, duration: 1.5, ease: 'expo.out', onComplete: () => gsap.set(m, { clearProps: 'clipPath' }) });
        gsap.to(im, { scale: 1, duration: 1.9, ease: 'expo.out', onComplete: () => gsap.set(im, { clearProps: 'transform' }) });
      },
    });
  });

  bindSections();
  ['(min-width:900px)'].forEach(q => matchMedia(q).addEventListener('change', () => location.reload()));

  /* Имя реагирует на курсор: буквы утолщаются рядом с ним */
  if (fine) {
    const chs = $$('.ch');
    let rects = [];
    const measure = () => { rects = chs.map(c => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + scrollY + r.height / 2 }; }); };
    addEventListener('load', measure); addEventListener('resize', measure); setTimeout(measure, 2600);
    const cur = chs.map(() => 300), tgt = chs.map(() => 300);
    let px = -9999, py = -9999;
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY + scrollY; }, { passive: true });
    gsap.ticker.add(() => {
      if (scrollY > innerHeight * 1.1) return;
      chs.forEach((c, i) => {
        if (!rects[i]) return;
        const d = Math.hypot(px - rects[i].x, py - rects[i].y);
        tgt[i] = 300 + 600 * Math.max(0, 1 - d / (innerWidth * .2));
        cur[i] += (tgt[i] - cur[i]) * .12;
        c.style.setProperty('--w', cur[i].toFixed(0));
      });
    });

    /* Курсор над работами */
    const cu = $('.cur');
    const qx = gsap.quickTo(cu, 'x', { duration: .45, ease: 'power3' }), qy = gsap.quickTo(cu, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); }, { passive: true });
    $$('.w__m').forEach(m => {
      m.addEventListener('pointerenter', () => gsap.to(cu, { scale: 1, duration: .5, ease: 'expo.out' }));
      m.addEventListener('pointerleave', () => gsap.to(cu, { scale: 0, duration: .35, ease: 'power2.out' }));
    });
  }

  /* Вступление: счётчик, дуга восходит, имя собирается */
  const chs = $$('.ch');
  gsap.set(chs, { yPercent: 120, opacity: 0 });
  gsap.set('.hero__k,.hero__b', { opacity: 0, y: 16 });
  const preN = $('#preN'), counter = { v: 0 };
  lenis.stop();
  scrollTo(0, 0);
  const ready = Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 1100))]),
    new Promise(r => setTimeout(r, 2800)),
  ]);
  gsap.to(counter, { v: 90, duration: 1.2, ease: 'power2.out', onUpdate: () => { preN.textContent = String(Math.round(counter.v)).padStart(3, '0'); } });
  gsap.to('.pre__arc', { y: () => -innerHeight * .34, duration: 1.3, ease: 'power3.out' });
  ready.then(() => {
    const tl = gsap.timeline({ onComplete: () => { $('.pre').remove(); lenis.start(); ScrollTrigger.refresh(); } });
    tl.to(counter, { v: 100, duration: .3, onUpdate: () => { preN.textContent = String(Math.round(counter.v)).padStart(3, '0'); } })
      .to('.pre__n', { opacity: 0, duration: .3 })
      .to('.pre__arc', { y: () => -innerHeight * 1.5, duration: 1.1, ease: 'power3.inOut' }, '-=.1')
      .to('.pre', { opacity: 0, duration: .7, ease: 'none' }, '-=.55')
      .add(() => setLight('hero', 1.6), '-=.8')
      .to(chs, { yPercent: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: .035 }, '-=.7')
      .to('.hero__k,.hero__b', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '-=.9');
  });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
