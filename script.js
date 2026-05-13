(() => {
  const app = document.querySelector('#app');
  const scenes = [...document.querySelectorAll('.scene')];
  const dots = document.querySelector('#pageDots');
  const particleCanvas = document.querySelector('#particleCanvas');
  const soundToggle = document.querySelector('#soundToggle');
  const pctx = particleCanvas.getContext('2d');
  let current = 0;
  let audioCtx, masterGain, startedSound = false;
  const stats = { flowers: 0, cards: 0, shake: 0, twist: 0, garments: [] };
  const particles = [];

  function fitCanvas(canvas) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(app.clientWidth * dpr);
    canvas.height = Math.floor(app.clientHeight * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initAudio() {
    if (startedSound) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.035;
    masterGain.connect(audioCtx.destination);
    startedSound = true;
    soundToggle.textContent = '声波 ON';
    ambientTone(110, 'sine');
  }

  function ambientTone(freq, type = 'sine', duration = 1.2) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.7, audioCtx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + 0.05);
  }

  function burst(x, y, count = 34, palette = ['#fff7a8', '#baff91', '#ff7ac8', '#7de7ff']) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - .5) * 7, vy: (Math.random() - .7) * 7, r: Math.random() * 4 + 1, life: 1, color: palette[Math.floor(Math.random() * palette.length)] });
    }
    ambientTone(220 + Math.random() * 380, 'triangle', .8);
  }

  function drawParticles() {
    pctx.clearRect(0, 0, app.clientWidth, app.clientHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.life -= 0.012;
      pctx.globalAlpha = Math.max(p.life, 0);
      pctx.fillStyle = p.color;
      pctx.beginPath(); pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); pctx.fill();
      if (p.life <= 0) particles.splice(i, 1);
    }
    pctx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }

  function go(index) {
    index = Math.max(0, Math.min(scenes.length - 1, index));
    if (index === current) return;
    scenes[current].classList.toggle('prev', index > current);
    scenes[current].classList.remove('active');
    current = index;
    scenes[current].classList.add('active');
    updateDots();
    animateScene();
    ambientTone(120 + index * 28, 'sine', .9);
  }

  function updateDots() {
    [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function animateScene() {
    const bg = scenes[current].querySelector('.parallax');
    if (window.gsap) {
      gsap.fromTo(scenes[current].querySelectorAll('.copy, .hotspot, .poster, .actions'), { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'power3.out' });
      if (bg) gsap.fromTo(bg, { scale: 1.12 }, { scale: 1.04, duration: 1.4, ease: 'power2.out' });
    }
  }

  function makeDots() {
    scenes.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `跳到第${i + 1}页`);
      dot.addEventListener('click', () => go(i));
      dots.appendChild(dot);
    });
    updateDots();
  }

  function initScroll() {
    let startY = 0, startX = 0, lock = false;
    app.addEventListener('touchstart', e => { startY = e.touches[0].clientY; startX = e.touches[0].clientX; initAudio(); }, { passive: true });
    app.addEventListener('touchmove', e => {
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      const bg = scenes[current].querySelector('.parallax');
      if (bg) bg.style.setProperty('--py', `${dy * -0.025}px`);
      if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx) * 1.3 && !lock) {
        lock = true; go(current + (dy < 0 ? 1 : -1)); setTimeout(() => lock = false, 850);
      }
    }, { passive: true });
    app.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 20) go(current + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  }

  function initInteractions() {
    document.querySelector('[data-action="enterFiber"]').addEventListener('click', e => { burst(e.clientX, e.clientY, 80); go(1); });
    const drag = document.querySelector('#fiberDrag');
    let dragStart = 0;
    drag.addEventListener('pointerdown', e => { dragStart = e.clientX; drag.setPointerCapture(e.pointerId); });
    drag.addEventListener('pointermove', e => { if (e.buttons) drag.style.setProperty('--drag-x', `${Math.max(-90, Math.min(90, e.clientX - dragStart))}px`); });
    document.querySelectorAll('.flower-bloom').forEach(btn => btn.addEventListener('click', e => { stats.flowers++; btn.classList.add('bloomed'); burst(e.clientX, e.clientY, 60); }));

    let startAngle = null;
    const twist = document.querySelector('#twistCloud');
    scenes[2].addEventListener('touchmove', e => {
      if (e.touches.length < 2) return;
      const [a, b] = e.touches;
      const angle = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
      if (startAngle === null) startAngle = angle;
      const diff = angle - startAngle;
      stats.twist = Math.max(stats.twist, Math.abs(diff));
      twist.style.setProperty('--twist', `${diff * 2}deg`);
      document.querySelector('#goldStream').style.setProperty('--stream', `${Math.min(34, Math.abs(diff) / 3)}%`);
      if (Math.abs(diff) > 55) burst(app.clientWidth / 2, app.clientHeight * .55, 90);
    }, { passive: true });
    scenes[2].addEventListener('touchend', () => startAngle = null, { passive: true });

    initErase();
    document.querySelectorAll('.garment').forEach(g => g.addEventListener('click', e => { stats.garments.push(g.dataset.scent); burst(e.clientX, e.clientY, 95); go(5); }));
    const coat = document.querySelector('#shakeCoat');
    const wake = () => { stats.shake++; coat.classList.add('awake'); burst(app.clientWidth / 2, app.clientHeight * .43, 110); };
    coat.addEventListener('click', wake);
    window.addEventListener('devicemotion', e => {
      const a = e.accelerationIncludingGravity || {}; const power = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      if (current === 5 && power > 28) wake();
    });

    let holdTimer;
    const hold = document.querySelector('#holdStart');
    hold.addEventListener('pointerdown', () => { holdTimer = setTimeout(() => { document.querySelector('.washer-door').style.animation = 'none'; burst(app.clientWidth / 2, app.clientHeight / 2, 140); go(7); }, 850); });
    hold.addEventListener('pointerup', () => clearTimeout(holdTimer));
    document.querySelectorAll('.card').forEach(card => card.addEventListener('click', e => { if (!card.classList.contains('flipped')) stats.cards++; card.classList.add('flipped'); burst(e.clientX, e.clientY, 42); updatePersonality(); }));
    document.querySelector('#restart').addEventListener('click', () => location.reload());
    document.querySelector('#share').addEventListener('click', async () => { if (navigator.share) await navigator.share({ title: '洗掉世界的灰', text: '我的衣服开出了植物疗愈人格。' }); else alert('已复制分享文案：洗掉灰暗，留下会开花的生活。'); });
    document.querySelector('#savePoster').addEventListener('click', () => alert('演示版已生成结果海报视觉，可接入 html2canvas 输出长图。'));
  }

  function initErase() {
    const canvas = document.querySelector('#eraseCanvas');
    const ctx = canvas.getContext('2d');
    let erased = 0;
    const resize = () => {
      fitCanvas(canvas);
      ctx.fillStyle = 'rgba(35,39,48,.86)'; ctx.fillRect(0,0,app.clientWidth,app.clientHeight);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `${Math.max(30, app.clientWidth * .075)}px serif`; ctx.textAlign = 'center';
      ['焦虑','内耗','加班','失眠','疲惫'].forEach((w,i) => ctx.fillText(w, app.clientWidth/2, app.clientHeight*(.26+i*.105)));
      ctx.globalCompositeOperation = 'destination-out';
    };
    resize();
    const erase = e => {
      const t = e.touches ? e.touches[0] : e;
      const r = canvas.getBoundingClientRect();
      ctx.beginPath(); ctx.arc(t.clientX - r.left, t.clientY - r.top, 58, 0, Math.PI*2); ctx.fill();
      erased++;
      if (erased > 18) document.querySelector('#revealedLine').classList.add('show');
    };
    canvas.addEventListener('pointermove', e => { if (e.buttons) erase(e); });
    canvas.addEventListener('pointerdown', erase);
    window.addEventListener('resize', resize);
  }

  function updatePersonality() {
    const names = ['白鸢木檀花园人格', '玫瑰晨雾灵感人格', '白兰金色仪式人格', '晚香玉星夜治愈人格'];
    const score = (stats.flowers + stats.cards + stats.shake + stats.garments.length) % names.length;
    document.querySelector('#personality').textContent = names[score];
  }

  function boot() {
    fitCanvas(particleCanvas); makeDots(); initScroll(); initInteractions(); drawParticles(); animateScene();
    window.addEventListener('resize', () => fitCanvas(particleCanvas));
    document.querySelector('#soundToggle').addEventListener('click', initAudio);
  }
  boot();
})();
