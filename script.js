const root = document.documentElement;

/* ─── Glow follows pointer ─── */
function setGlowPosition(x, y) {
  root.style.setProperty("--glow-x", `${x}%`);
  root.style.setProperty("--glow-y", `${y}%`);
}

function handlePointerMove(event) {
  const x = (event.clientX / window.innerWidth) * 100;
  const y = (event.clientY / window.innerHeight) * 100;
  setGlowPosition(x, y);
}

function resetGlowPosition() {
  setGlowPosition(74, 48);
}

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerleave", resetGlowPosition);

/* ─── Scroll-reveal for below-fold sections ─── */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    ".feature-card, .industries, .cta-card"
  );

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ─── "Thank you" toast after form redirect ─── */
function checkThankYou() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("thanks") === "1") {
    const form = document.querySelector(".cta-form");
    if (form) {
      form.innerHTML =
        '<p style="font-size:1.1rem;font-weight:600;color:var(--gold);padding:20px 0;">🎉 You\'re on the list! We\'ll be in touch soon.</p>';
    }
    window.history.replaceState({}, "", window.location.pathname);
  }
}

/* ─── Boot ─── */
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");
  resetGlowPosition();
  initScrollReveal();
  checkThankYou();
  animateDashBars();
  initUfo();
});

/* ─── Animate chart bars on load ─── */
function animateDashBars() {
  const bars = document.querySelectorAll(".bar");
  bars.forEach((bar, i) => {
    const h = bar.style.getPropertyValue("--h");
    bar.style.setProperty("--h", "0%");
    setTimeout(() => {
      bar.style.setProperty("--h", h);
    }, 600 + i * 60);
  });

  const fills = document.querySelectorAll(".metric-fill");
  fills.forEach((fill, i) => {
    const w = fill.style.width;
    fill.style.width = "0%";
    setTimeout(() => {
      fill.style.width = w;
    }, 800 + i * 100);
  });
}

/* ─── UFO beam logic ─── */
function initUfo() {
  const ufo = document.querySelector(".ufo");
  const card = document.querySelector(".visual-card");
  const brand = document.querySelector(".brand");
  if (!ufo) return;

  let peoplePanicked = false;

  function isOverElement(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const ufoRect = ufo.getBoundingClientRect();
    const cx = ufoRect.left + ufoRect.width / 2;
    const cy = ufoRect.bottom;
    return (
      cx > r.left - 40 &&
      cx < r.right + 40 &&
      cy < r.bottom + 60 &&
      cy > r.top - 180
    );
  }

  function check() {
    const overCard = isOverElement(card);
    const overBrand = isOverElement(brand);
    const beamOn = overCard || overBrand;

    ufo.classList.toggle("beam-on", beamOn);
    if (card) card.classList.toggle("spotlit", overCard);
    if (brand) brand.classList.toggle("spotlit-brand", overBrand);

    /* People run on first card spotlight */
    if (overCard && !peoplePanicked) {
      peoplePanicked = true;
      initRunners(card);

      /* Alien tank arrives after people escape */
      setTimeout(() => {
        initAlienTank(ufo);
      }, 7000);
    }

    requestAnimationFrame(check);
  }

  requestAnimationFrame(check);
}

/* ─── Canvas Runner System (HTML5 Canvas 2D + Physics) ─── */
function initRunners(card) {
  const canvas = document.getElementById("runnersCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const cr = card.getBoundingClientRect();
  const W = window.innerWidth;
  const H = window.innerHeight;

  /* Palettes */
  const skins = ["#f0c8a0", "#d4a574", "#8d6544", "#f5d0a9", "#c49a6c"];
  const hairs = ["#2a1a0a", "#111", "#5a3015", "#8b4513", "#1a1a1a", "#3d2010"];
  const hairStyles = ["short", "long", "curly", "ponytail"];
  const shirts = ["#3b7dd8", "#e8943a", "#22a855", "#d946a8", "#6366f1",
                   "#ef4444", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];
  const pantsList = ["#2a2a35", "#4a4a52", "#1e3050", "#1a1a20", "#3b3b45"];
  const shoesList = ["#ddd", "#c22", "#222", "#e87", "#fff", "#444"];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  const GRAVITY = 220;   /* px/s² — gentle pull down */
  const FRICTION = 0.985; /* air drag per frame */
  const GROUND = H - 20;  /* floor y */

  const runners = [];
  for (let i = 0; i < 15; i++) {
    const spawnX = cr.left + 15 + Math.random() * (cr.width - 30);
    const spawnY = cr.bottom - 8 - Math.random() * 12;

    /* Spread evenly left-right: half go left, half go right, slight vertical scatter */
    const goRight = i % 2 === 0;
    const hAngle = goRight
      ? 0.2 + Math.random() * 0.6          /* 0.2 .. 0.8 rad right-downish */
      : Math.PI - 0.2 - Math.random() * 0.6; /* mirror left */
    const launchSpeed = 280 + Math.random() * 180; /* px/s initial burst */

    runners.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(hAngle) * launchSpeed,
      vy: -80 - Math.random() * 60, /* slight upward jump from panic */
      ax: 0, ay: 0,
      /* Physics properties */
      maxSpeed: 250 + Math.random() * 120,
      accel: 400 + Math.random() * 200, /* running acceleration px/s² */
      targetAngle: hAngle,
      grounded: false,
      /* Animation */
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 10 + Math.random() * 3,
      scale: 0.7 + Math.random() * 0.3,
      dir: goRight ? 1 : -1,
      /* Appearance */
      skin: pick(skins), hair: pick(hairs), hairStyle: pick(hairStyles),
      shirt: pick(shirts), pants: pick(pantsList), shoes: pick(shoesList),
      /* State */
      active: true,
      delay: i * 0.06 + Math.random() * 0.25,
      elapsed: 0,
      stumbleTime: 0,
    });
  }

  let lastT = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    ctx.clearRect(0, 0, W, H);

    let allDone = true;
    for (const r of runners) {
      if (!r.active) continue;
      r.elapsed += dt;
      if (r.elapsed < r.delay) { allDone = false; continue; }

      /* ── Physics step ── */
      /* Gravity */
      r.vy += GRAVITY * dt;

      /* Running force along target direction */
      const runForce = r.accel * dt;
      r.vx += Math.cos(r.targetAngle) * runForce * (r.grounded ? 1 : 0.3);

      /* Ground collision */
      if (r.y >= GROUND) {
        r.y = GROUND;
        r.vy = 0;
        if (!r.grounded) {
          r.grounded = true;
          /* Small stumble on landing — random chance */
          if (Math.random() < 0.3) {
            r.stumbleTime = 0.25;
            r.vx *= 0.5;
          }
        }
      }

      /* Stumble deceleration */
      if (r.stumbleTime > 0) {
        r.stumbleTime -= dt;
        r.vx *= 0.92;
      }

      /* Air friction */
      r.vx *= FRICTION;
      r.vy *= FRICTION;

      /* Clamp horizontal speed */
      const absVx = Math.abs(r.vx);
      if (absVx > r.maxSpeed) r.vx = r.maxSpeed * Math.sign(r.vx);

      /* Integrate position */
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      /* Run cycle speed matches movement speed */
      const speed = Math.abs(r.vx);
      r.phase += (speed / 40) * dt * r.phaseSpeed;

      /* Off-screen? Done. */
      if (r.x < -100 || r.x > W + 100 || r.y > H + 100) {
        r.active = false;
        continue;
      }
      allDone = false;
      drawRunner(ctx, r);
    }

    if (allDone) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function drawRunner(ctx, r) {
  ctx.save();
  ctx.translate(r.x, r.y);

  /* Stumble tilt */
  const stumbleTilt = r.stumbleTime > 0 ? Math.sin(r.elapsed * 30) * 0.15 : 0;
  ctx.rotate(stumbleTilt);
  ctx.scale(r.scale * r.dir, r.scale);

  const t = r.phase;
  const S = Math.sin;
  /* Animate faster when running fast, almost still when stumbling */
  const intensity = r.stumbleTime > 0 ? 0.3 : 1;
  const bounce = Math.abs(S(t * 2)) * 2.5 * intensity;

  /* Run cycle angles */
  const hipF = S(t) * 0.75 * intensity;
  const hipB = S(t + Math.PI) * 0.75 * intensity;
  const kneeF = Math.max(0, S(t - 0.9)) * 1.0 * intensity;
  const kneeB = Math.max(0, S(t + Math.PI - 0.9)) * 1.0 * intensity;
  const armF = S(t + Math.PI) * 0.65 * intensity;
  const armB = S(t) * 0.65 * intensity;
  const elbowF = Math.max(0, -S(t + Math.PI - 0.5)) * 0.6 * intensity;
  const elbowB = Math.max(0, -S(t - 0.5)) * 0.6 * intensity;

  const headY = -38 - bounce;
  const shoulderY = -28 - bounce;
  const hipY = -13;

  /* Ground shadow */
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Back leg */
  drawLeg(ctx, -1.5, hipY, hipB, kneeB, r.pants, r.shoes);
  /* Back arm */
  drawArm(ctx, 0, shoulderY + 2, armB, elbowB, r.shirt, r.skin);

  /* Torso */
  ctx.fillStyle = r.shirt;
  roundRect(ctx, -6, shoulderY, 12, 16, 3);
  ctx.fill();
  /* Collar detail */
  ctx.fillStyle = darken(r.shirt, 25);
  ctx.beginPath();
  ctx.moveTo(-3, shoulderY);
  ctx.lineTo(0, shoulderY + 4);
  ctx.lineTo(3, shoulderY);
  ctx.closePath();
  ctx.fill();
  /* Belt */
  ctx.fillStyle = "#222";
  roundRect(ctx, -6, shoulderY + 14, 12, 2.5, 1);
  ctx.fill();

  /* Front leg */
  drawLeg(ctx, 2, hipY, hipF, kneeF, r.pants, r.shoes);
  /* Front arm */
  drawArm(ctx, 0, shoulderY + 2, armF, elbowF, r.shirt, r.skin);

  /* Neck */
  ctx.fillStyle = r.skin;
  roundRect(ctx, -2, headY + 9, 4, 4, 1);
  ctx.fill();

  /* Head */
  ctx.fillStyle = r.skin;
  ctx.beginPath();
  ctx.ellipse(0, headY + 5, 5.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Ear */
  ctx.fillStyle = darken(r.skin, 15);
  ctx.beginPath();
  ctx.ellipse(-5, headY + 5, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Hair */
  drawHair(ctx, r.hairStyle, r.hair, headY);

  /* Eye white */
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(2.5, headY + 4, 2.2, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  /* Iris */
  ctx.fillStyle = "#4a3520";
  ctx.beginPath();
  ctx.arc(3.2, headY + 4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  /* Pupil */
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(3.4, headY + 4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  /* Eye highlight */
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(2.8, headY + 3.3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  /* Eyebrow (raised — panicking) */
  ctx.strokeStyle = r.hair;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0.8, headY + 1.5);
  ctx.quadraticCurveTo(2.5, headY + 0.2, 4.5, headY + 1.2);
  ctx.stroke();

  /* Mouth (open — screaming) */
  ctx.fillStyle = "#a03030";
  ctx.beginPath();
  ctx.ellipse(2, headY + 7.5, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  /* Teeth */
  ctx.fillStyle = "#fff";
  roundRect(ctx, 0.5, headY + 6.8, 3, 0.8, 0.3);
  ctx.fill();

  /* Nose */
  ctx.fillStyle = darken(r.skin, 20);
  ctx.beginPath();
  ctx.moveTo(4, headY + 4.5);
  ctx.lineTo(5.5, headY + 6);
  ctx.lineTo(3.5, headY + 6.2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawLeg(ctx, ox, hipY, hipAngle, kneeAngle, pantsColor, shoeColor) {
  ctx.save();
  ctx.translate(ox, hipY);
  ctx.rotate(hipAngle);
  /* Thigh */
  ctx.fillStyle = pantsColor;
  roundRect(ctx, -3, 0, 6, 12, 2);
  ctx.fill();
  /* Knee */
  ctx.translate(0, 11);
  ctx.rotate(-kneeAngle);
  /* Shin */
  ctx.fillStyle = pantsColor;
  roundRect(ctx, -2.5, 0, 5, 11, 2);
  ctx.fill();
  /* Sock cuff */
  ctx.fillStyle = "#eee";
  roundRect(ctx, -2.5, 9, 5, 2, 1);
  ctx.fill();
  /* Shoe */
  ctx.fillStyle = shoeColor;
  ctx.beginPath();
  ctx.moveTo(-2, 11);
  ctx.lineTo(6, 11);
  ctx.quadraticCurveTo(7, 11, 7, 9.5);
  ctx.lineTo(6, 8.5);
  ctx.lineTo(-2, 8.5);
  ctx.closePath();
  ctx.fill();
  /* Sole */
  ctx.fillStyle = darken(shoeColor, 40);
  roundRect(ctx, -2, 10.5, 9, 1.5, 0.5);
  ctx.fill();
  ctx.restore();
}

function drawArm(ctx, ox, sY, angle, elbowAngle, shirtColor, skinColor) {
  ctx.save();
  ctx.translate(ox, sY);
  ctx.rotate(angle);
  /* Upper arm (sleeve) */
  ctx.fillStyle = shirtColor;
  roundRect(ctx, -2.5, 0, 5, 9, 2);
  ctx.fill();
  /* Elbow → forearm */
  ctx.translate(0, 8);
  ctx.rotate(-elbowAngle);
  /* Forearm (skin) */
  ctx.fillStyle = skinColor;
  roundRect(ctx, -2, 0, 4, 8, 1.5);
  ctx.fill();
  /* Hand */
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(0, 9, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  /* Fingers hint */
  ctx.fillStyle = darken(skinColor, 15);
  ctx.beginPath();
  ctx.arc(1, 9.5, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHair(ctx, style, color, headY) {
  ctx.fillStyle = color;
  switch (style) {
    case "short":
      ctx.beginPath();
      ctx.ellipse(0, headY + 1, 6, 5, 0, Math.PI + 0.3, -0.3);
      ctx.fill();
      /* Side texture */
      ctx.fillStyle = darken(color, 15);
      ctx.beginPath();
      ctx.ellipse(-3, headY + 3, 2, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "long":
      ctx.beginPath();
      ctx.ellipse(0, headY + 1, 6.5, 5.5, 0, Math.PI + 0.3, -0.3);
      ctx.fill();
      /* Flowing hair */
      ctx.beginPath();
      ctx.moveTo(-5, headY + 3);
      ctx.quadraticCurveTo(-7, headY + 14, -4, headY + 20);
      ctx.lineTo(-1, headY + 18);
      ctx.quadraticCurveTo(-4, headY + 12, -3, headY + 4);
      ctx.closePath();
      ctx.fill();
      /* Other side */
      ctx.beginPath();
      ctx.moveTo(4, headY + 3);
      ctx.quadraticCurveTo(6, headY + 10, 4, headY + 16);
      ctx.lineTo(2, headY + 14);
      ctx.quadraticCurveTo(4, headY + 9, 2, headY + 4);
      ctx.closePath();
      ctx.fill();
      break;
    case "curly":
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const cx = Math.cos(a) * 5;
        const cy = Math.sin(a) * 5 + headY + 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      /* Center fill */
      ctx.beginPath();
      ctx.arc(0, headY + 1, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "ponytail":
      ctx.beginPath();
      ctx.ellipse(0, headY + 1, 6, 5, 0, Math.PI + 0.3, -0.3);
      ctx.fill();
      /* Ponytail bounce */
      ctx.beginPath();
      ctx.moveTo(-3, headY + 1);
      ctx.bezierCurveTo(-8, headY + 5, -10, headY + 12, -6, headY + 18);
      ctx.lineTo(-4, headY + 17);
      ctx.bezierCurveTo(-7, headY + 11, -6, headY + 6, -2, headY + 2);
      ctx.closePath();
      ctx.fill();
      /* Hair band */
      ctx.fillStyle = "#e44";
      ctx.beginPath();
      ctx.arc(-3.5, headY + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

/* Canvas helpers */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function darken(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const R = Math.max(0, (n >> 16) - amt);
  const G = Math.max(0, ((n >> 8) & 0xff) - amt);
  const B = Math.max(0, (n & 0xff) - amt);
  return `rgb(${R},${G},${B})`;
}

/* ─── Alien Tank + Battle Sequence ─── */
function initAlienTank(ufo) {
  const tank = document.getElementById("alienTank");
  const barrelWrap = tank ? tank.querySelector(".tank-barrel-wrap") : null;
  if (!tank || !ufo) return;

  let hitCount = 0;
  const HITS_TO_RETALIATE = 6;
  let destroyed = false;
  let fleetHitCount = 0;
  const FLEET_HITS_TO_DESTROY = 45;
  let ufoDestroyed = false;
  const fleetVehicles = [];

  /* ── Helpers ── */
  function getBarrelTip(el) {
    const turret = el.querySelector(".tank-turret");
    if (!turret) return { x: 0, y: 0 };
    const r = turret.getBoundingClientRect();
    return { x: r.left, y: r.top + r.height * 0.45 };
  }

  function getUfoHitbox() {
    const body = ufo.querySelector(".ufo-body");
    if (!body) return { x: 0, y: 0, r: 0 };
    const r = body.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
  }

  function getUfoCenter() {
    const hb = getUfoHitbox();
    return { x: hb.x, y: hb.y };
  }

  function getElCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function spawnImpact(x, y) {
    const imp = document.createElement("div");
    imp.className = "plasma-impact";
    imp.style.left = (x - 10) + "px";
    imp.style.top = (y - 10) + "px";
    document.body.appendChild(imp);
    setTimeout(() => imp.remove(), 350);
  }

  /* ── Physics engine for all vehicles ── */
  const allVehicles = [];
  let physicsRunning = false;

  function addPhysicsVehicle(el, cfg) {
    const v = {
      el: el,
      x: cfg.startX,
      vx: cfg.initialVx || 0,
      targetX: cfg.targetX,
      maxSpeed: cfg.maxSpeed || 120,
      accel: cfg.accel || 180,
      patrolMin: cfg.patrolMin,
      patrolMax: cfg.patrolMax,
      alive: true,
      flip: cfg.flip || false,
      type: cfg.type || "tank",
      onArrive: cfg.onArrive || null,
      arrived: false,
      arriveThresh: 20
    };
    el.style.left = v.x + "px";
    allVehicles.push(v);
    if (!physicsRunning) {
      physicsRunning = true;
      requestAnimationFrame(physicsLoop);
    }
    return v;
  }

  let lastPhysicsTime = 0;
  function physicsLoop(now) {
    if (!lastPhysicsTime) lastPhysicsTime = now;
    const dt = Math.min((now - lastPhysicsTime) / 1000, 0.05);
    lastPhysicsTime = now;

    let anyAlive = false;
    for (const v of allVehicles) {
      if (!v.alive || !document.body.contains(v.el)) continue;
      anyAlive = true;

      const dx = v.targetX - v.x;
      const dist = Math.abs(dx);
      const dir = Math.sign(dx);

      /* stopping distance = v² / (2a) */
      const stopDist = (v.vx * v.vx) / (2 * v.accel);

      if (dist > stopDist + 8) {
        v.vx += dir * v.accel * dt;
      } else {
        /* brake: reduce velocity toward zero */
        v.vx *= Math.pow(0.88, dt * 60);
      }

      /* clamp to max speed */
      v.vx = Math.max(-v.maxSpeed, Math.min(v.maxSpeed, v.vx));

      /* light friction always */
      v.vx *= Math.pow(0.995, dt * 60);

      /* update position */
      v.x += v.vx * dt;
      v.el.style.left = v.x + "px";

      /* arrival callback (once) */
      if (!v.arrived && dist < v.arriveThresh && Math.abs(v.vx) < 15) {
        v.arrived = true;
        if (v.onArrive) v.onArrive();
      }

      /* pick new patrol target when reached */
      if (v.arrived && dist < 5 && Math.abs(v.vx) < 5 && v.patrolMin != null) {
        v.targetX = v.patrolMin + Math.random() * (v.patrolMax - v.patrolMin);
      }

      /* drive tread / walk animation speed from velocity */
      const speed = Math.abs(v.vx);
      const moving = speed > 3;
      const treads = v.el.querySelectorAll(".tread-track");
      const wheels = v.el.querySelectorAll(".tread-wheel");
      treads.forEach(t => {
        t.style.animationPlayState = moving ? "running" : "paused";
        t.style.animationDuration = Math.max(0.15, 0.6 / (speed / 60)) + "s";
      });
      wheels.forEach(w => {
        w.style.animationPlayState = moving ? "running" : "paused";
        w.style.animationDuration = Math.max(0.08, 0.3 / (speed / 60)) + "s";
      });
      /* walker / crawler legs */
      const legs = v.el.querySelectorAll(".centi-leg, .oculus-stilt-l, .oculus-stilt-r, .mantis-wleg");
      legs.forEach(l => {
        l.style.animationPlayState = moving ? "running" : "paused";
        l.style.animationDuration = Math.max(0.3, 1.2 / (speed / 40)) + "s";
      });
    }

    if (anyAlive) {
      requestAnimationFrame(physicsLoop);
    } else {
      physicsRunning = false;
      lastPhysicsTime = 0;
    }
  }

  /* ── Phase 1: Single tank enters via physics ── */
  const W = window.innerWidth;
  tank.classList.add("active");
  addPhysicsVehicle(tank, {
    startX: W + 100,
    targetX: W * 0.55,
    maxSpeed: 160,
    accel: 200,
    patrolMin: W * 0.05,
    patrolMax: W * 0.62,
    type: "tank",
    onArrive: function() {
      startAiming(tank, barrelWrap);
      startShooting(tank, true);
    }
  });

  function startAiming(el, bw) {
    function aim() {
      if (!document.body.contains(el) || el.style.opacity === "0") return;
      const b = getBarrelTip(el);
      const u = getUfoCenter();
      const angle = Math.atan2(u.y - b.y, u.x - b.x) * (180 / Math.PI);
      if (bw) bw.style.transform = "rotate(" + angle + "deg)";
      requestAnimationFrame(aim);
    }
    requestAnimationFrame(aim);
  }

  function startShooting(el, isOriginal) {
    const delay = isOriginal ? 2000 : (1800 + Math.random() * 800);
    function shoot() {
      if (!document.body.contains(el) || el.style.opacity === "0") return;
      const b = getBarrelTip(el);
      const u = getUfoCenter();
      if (u.y < b.y - 20) {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => firePlasmaBolt(el, isOriginal), i * 110);
        }
      }
      setTimeout(shoot, delay);
    }
    setTimeout(shoot, isOriginal ? 0 : 500);
  }

  function firePlasmaBolt(el, countHits) {
    if (!document.body.contains(el) || el.style.opacity === "0") return;
    const b = getBarrelTip(el);
    const u = getUfoCenter();
    const dx = u.x - b.x;
    const dy = u.y - b.y;
    const angle = Math.atan2(dy, dx);
    const spread = (Math.random() - 0.5) * 0.07;
    const fAngle = angle + spread;
    const aDeg = fAngle * (180 / Math.PI);

    const flash = document.createElement("div");
    flash.className = "tank-muzzle-flash";
    flash.style.left = (b.x - 7) + "px";
    flash.style.top = (b.y - 7) + "px";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    const bolt = document.createElement("div");
    bolt.className = countHits ? "plasma-bolt" : "plasma-bolt plasma-bolt-red";
    document.body.appendChild(bolt);

    const speed = 1400;
    const vx = Math.cos(fAngle) * speed;
    const vy = Math.sin(fAngle) * speed;
    let px = b.x, py = b.y, last = performance.now(), hit = false;

    function fly(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      px += vx * dt;
      py += vy * dt;
      bolt.style.left = px + "px";
      bolt.style.top = (py - 2.5) + "px";
      bolt.style.transform = "rotate(" + aDeg + "deg)";

      if (!hit) {
        const hb = getUfoHitbox();
        if (Math.hypot(px - hb.x, py - hb.y) < hb.r + 5) {
          hit = true;
          spawnImpact(px, py);
          ufo.classList.remove("tank-hit");
          void ufo.offsetWidth;
          ufo.classList.add("tank-hit");
          setTimeout(() => ufo.classList.remove("tank-hit"), 250);
          bolt.remove();

          if (countHits) {
            hitCount++;
            if (hitCount >= HITS_TO_RETALIATE && !destroyed) {
              destroyed = true;
              setTimeout(() => ufoRetaliate(), 800);
            }
          }
          return;
        }
      }
      if (px < -60 || px > innerWidth + 60 || py < -60 || py > innerHeight + 60) {
        bolt.remove();
        return;
      }
      requestAnimationFrame(fly);
    }
    requestAnimationFrame(fly);
  }

  /* ── UFO Retaliates: Death Star-style beam ── */
  function ufoRetaliate() {
    ufo.classList.add("ufo-charging");

    setTimeout(() => {
      ufo.classList.remove("ufo-charging");

      /* Grab live positions right when beam fires */
      const beam = document.createElement("div");
      beam.className = "ufo-death-beam";
      beam.style.transformOrigin = "0 center";
      document.body.appendChild(beam);

      const uf = document.createElement("div");
      uf.className = "ufo-beam-flash";
      document.body.appendChild(uf);

      /* Track UFO in real-time so beam follows the saucer */
      function positionBeam() {
        const uc = getUfoCenter();
        const tc = getElCenter(tank);
        const dx = tc.x - uc.x;
        const dy = tc.y - uc.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const dist = Math.hypot(dx, dy);
        beam.style.left = uc.x + "px";
        beam.style.top = (uc.y - 4) + "px";
        beam.style.width = dist + "px";
        beam.style.transform = "rotate(" + angle + "deg)";
        uf.style.left = (uc.x - 25) + "px";
        uf.style.top = (uc.y - 25) + "px";
      }
      positionBeam();

      let beamRaf;
      const beamStart = performance.now();
      (function trackBeam() {
        positionBeam();
        if (performance.now() - beamStart < 400) {
          beamRaf = requestAnimationFrame(trackBeam);
        }
      })();

      setTimeout(() => uf.remove(), 500);

      setTimeout(() => {
        cancelAnimationFrame(beamRaf);
        beam.remove();
        explodeTank(tank);
      }, 400);
    }, 1200);
  }

  /* ── Tank Explosion ── */
  function explodeTank(el) {
    const c = getElCenter(el);
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      p.className = "explosion-particle";
      const a = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 90;
      p.style.left = c.x + "px";
      p.style.top = c.y + "px";
      p.style.setProperty("--tx", Math.cos(a) * radius + "px");
      p.style.setProperty("--ty", Math.sin(a) * radius + "px");
      p.style.background = ["#ff6600","#ffaa00","#ff3300","#ffcc44","#fff"][Math.floor(Math.random()*5)];
      const sz = 4 + Math.random() * 10;
      p.style.width = sz + "px";
      p.style.height = sz + "px";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
    const fl = document.createElement("div");
    fl.className = "explosion-flash";
    fl.style.left = (c.x - 60) + "px";
    fl.style.top = (c.y - 60) + "px";
    document.body.appendChild(fl);
    setTimeout(() => fl.remove(), 600);

    el.classList.remove("active", "entering");
    el.style.opacity = "0";

    setTimeout(() => spawnFleet(), 2500);
  }

  /* ── Phase 2: Alien Ground Fleet (physics-driven) ── */
  function spawnFleet() {
    const W = window.innerWidth;
    const vehicles = [
      {
        type: "centipede",
        startX: -220, targetX: W * 0.06, flip: false,
        maxSpeed: 55, accel: 80,
        patrolMin: W * 0.02, patrolMax: W * 0.22,
        boltClass: "plasma-bolt plasma-bolt-red",
        fireRate: 2400, burstSize: 2, burstGap: 160,
        bottomOffset: 14,
        html:
          '<div class="centipede">' +
            '<div class="centi-head">' +
              '<div class="centi-eye-l"></div><div class="centi-eye-r"></div>' +
              '<div class="centi-mandible-l"></div><div class="centi-mandible-r"></div>' +
              '<div class="fleet-barrel"></div>' +
            '</div>' +
            '<div class="centi-seg centi-s1"></div>' +
            '<div class="centi-seg centi-s2"></div>' +
            '<div class="centi-seg centi-s3"></div>' +
            '<div class="centi-seg centi-s4"></div>' +
            '<div class="centi-seg centi-s5"></div>' +
            '<div class="centi-tail"></div>' +
            '<div class="centi-leg cl-1a"></div><div class="centi-leg cl-1b"></div>' +
            '<div class="centi-leg cl-2a"></div><div class="centi-leg cl-2b"></div>' +
            '<div class="centi-leg cl-3a"></div><div class="centi-leg cl-3b"></div>' +
            '<div class="centi-leg cl-4a"></div><div class="centi-leg cl-4b"></div>' +
            '<div class="centi-leg cl-5a"></div><div class="centi-leg cl-5b"></div>' +
          '</div>'
      },
      {
        type: "oculus",
        startX: -160, targetX: W * 0.28, flip: false,
        maxSpeed: 90, accel: 140,
        patrolMin: W * 0.18, patrolMax: W * 0.42,
        boltClass: "plasma-bolt",
        fireRate: 1200, burstSize: 4, burstGap: 90,
        bottomOffset: 4,
        html:
          '<div class="oculus">' +
            '<div class="oculus-orb">' +
              '<div class="oculus-iris">' +
                '<div class="oculus-pupil"></div>' +
              '</div>' +
            '</div>' +
            '<div class="oculus-ring"></div>' +
            '<div class="fleet-barrel"></div>' +
            '<div class="oculus-grav"></div>' +
            '<div class="oculus-stilt-l"></div>' +
            '<div class="oculus-stilt-r"></div>' +
          '</div>'
      },
      {
        type: "mantis",
        startX: W + 200, targetX: W * 0.60, flip: true,
        maxSpeed: 180, accel: 300,
        patrolMin: W * 0.48, patrolMax: W * 0.78,
        boltClass: "plasma-bolt plasma-bolt-orange",
        fireRate: 900, burstSize: 2, burstGap: 70,
        bottomOffset: 6,
        html:
          '<div class="mantis">' +
            '<div class="mantis-head">' +
              '<div class="mantis-eye-l"></div><div class="mantis-eye-r"></div>' +
              '<div class="fleet-barrel"></div>' +
            '</div>' +
            '<div class="mantis-thorax"></div>' +
            '<div class="mantis-abdomen"></div>' +
            '<div class="mantis-arm-l"></div><div class="mantis-arm-r"></div>' +
            '<div class="mantis-wleg mw-fl"></div><div class="mantis-wleg mw-fr"></div>' +
            '<div class="mantis-wleg mw-bl"></div><div class="mantis-wleg mw-br"></div>' +
          '</div>'
      },
      {
        type: "scarab",
        startX: W + 250, targetX: W * 0.78, flip: true,
        maxSpeed: 75, accel: 120,
        patrolMin: W * 0.62, patrolMax: W * 0.92,
        boltClass: "plasma-bolt plasma-bolt-blue",
        fireRate: 2800, burstSize: 3, burstGap: 130,
        bottomOffset: 28,
        html:
          '<div class="scarab">' +
            '<div class="scarab-carapace">' +
              '<div class="scarab-rune sr-1"></div>' +
              '<div class="scarab-rune sr-2"></div>' +
              '<div class="scarab-rune sr-3"></div>' +
            '</div>' +
            '<div class="scarab-turret">' +
              '<div class="scarab-eye"></div>' +
              '<div class="fleet-barrel"></div>' +
            '</div>' +
            '<div class="scarab-pad sp-l"></div>' +
            '<div class="scarab-pad sp-c"></div>' +
            '<div class="scarab-pad sp-r"></div>' +
            '<div class="scarab-glow"></div>' +
          '</div>'
      }
    ];

    vehicles.forEach((cfg, i) => {
      setTimeout(() => {
        const v = document.createElement("div");
        v.className = "fleet-vehicle";
        v.setAttribute("aria-hidden", "true");
        v.innerHTML = cfg.html;
        v.style.bottom = cfg.bottomOffset + "px";
        if (cfg.flip) v.style.transform = "scaleX(-1)";
        document.body.appendChild(v);
        fleetVehicles.push({ el: v, cfg: cfg });

        const barrel = v.querySelector(".fleet-barrel");

        addPhysicsVehicle(v, {
          startX: cfg.startX,
          targetX: cfg.targetX,
          maxSpeed: cfg.maxSpeed,
          accel: cfg.accel,
          patrolMin: cfg.patrolMin,
          patrolMax: cfg.patrolMax,
          flip: cfg.flip,
          type: cfg.type,
          onArrive: function() {
            /* aim barrel at UFO */
            function aim() {
              if (!document.body.contains(v) || ufoDestroyed) return;
              const br = barrel.getBoundingClientRect();
              const bx = cfg.flip ? br.right : br.left;
              const by = br.top + br.height / 2;
              const uc = getUfoCenter();
              let angle = Math.atan2(uc.y - by, uc.x - bx) * (180 / Math.PI);
              if (cfg.flip) angle = 180 - angle;
              barrel.style.transform = "rotate(" + angle + "deg)";
              requestAnimationFrame(aim);
            }
            requestAnimationFrame(aim);

            /* shoot */
            function shoot() {
              if (!document.body.contains(v) || ufoDestroyed) return;
              for (let b = 0; b < cfg.burstSize; b++) {
                setTimeout(() => fireFleetBolt(v, barrel, cfg), b * cfg.burstGap);
              }
              setTimeout(shoot, cfg.fireRate);
            }
            shoot();
          }
        });
      }, i * 700);
    });
  }

  function fireFleetBolt(vehicle, barrel, cfg) {
    if (!document.body.contains(vehicle) || ufoDestroyed) return;
    const br = barrel.getBoundingClientRect();
    const flip = cfg.flip;
    const bx = flip ? br.left : br.right;
    const by = br.top + br.height / 2;
    const uc = getUfoCenter();
    const dx = uc.x - bx;
    const dy = uc.y - by;
    const angle = Math.atan2(dy, dx);
    const spread = (Math.random() - 0.5) * 0.08;
    const fAngle = angle + spread;
    const aDeg = fAngle * (180 / Math.PI);

    const flash = document.createElement("div");
    flash.className = "tank-muzzle-flash";
    flash.style.left = (bx - 7) + "px";
    flash.style.top = (by - 7) + "px";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    const bolt = document.createElement("div");
    bolt.className = cfg.boltClass;
    document.body.appendChild(bolt);

    const speed = 1400;
    const vx = Math.cos(fAngle) * speed;
    const vy = Math.sin(fAngle) * speed;
    let px = bx, py = by, last = performance.now();

    function fly(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      px += vx * dt;
      py += vy * dt;
      bolt.style.left = px + "px";
      bolt.style.top = (py - 2.5) + "px";
      bolt.style.transform = "rotate(" + aDeg + "deg)";

      const hb = getUfoHitbox();
      if (Math.hypot(px - hb.x, py - hb.y) < hb.r + 5) {
        spawnImpact(px, py);
        ufo.classList.remove("tank-hit");
        void ufo.offsetWidth;
        ufo.classList.add("tank-hit");
        setTimeout(() => ufo.classList.remove("tank-hit"), 250);
        bolt.remove();

        if (!ufoDestroyed) {
          fleetHitCount++;
          if (fleetHitCount >= FLEET_HITS_TO_DESTROY) {
            ufoDestroyed = true;
            explodeUfo();
          }
        }
        return;
      }
      if (px < -60 || px > innerWidth + 60 || py < -60 || py > innerHeight + 60) {
        bolt.remove();
        return;
      }
      requestAnimationFrame(fly);
    }
    requestAnimationFrame(fly);
  }

  /* ── UFO Destruction ── */
  function explodeUfo() {
    const c = getUfoCenter();

    /* big explosion: 40 particles */
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      p.className = "explosion-particle";
      const a = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * 140;
      p.style.left = c.x + "px";
      p.style.top = c.y + "px";
      p.style.setProperty("--tx", Math.cos(a) * radius + "px");
      p.style.setProperty("--ty", Math.sin(a) * radius + "px");
      p.style.background = ["#e8943a","#f5b461","#ffcb75","#ff6600","#fff","#44ffaa"][Math.floor(Math.random()*6)];
      const sz = 5 + Math.random() * 14;
      p.style.width = sz + "px";
      p.style.height = sz + "px";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }

    /* large flash */
    const fl = document.createElement("div");
    fl.className = "explosion-flash";
    fl.style.left = (c.x - 60) + "px";
    fl.style.top = (c.y - 60) + "px";
    fl.style.width = "160px";
    fl.style.height = "160px";
    document.body.appendChild(fl);
    setTimeout(() => fl.remove(), 700);

    /* second ring flash */
    setTimeout(() => {
      const fl2 = document.createElement("div");
      fl2.className = "explosion-flash";
      fl2.style.left = (c.x - 80) + "px";
      fl2.style.top = (c.y - 80) + "px";
      fl2.style.width = "200px";
      fl2.style.height = "200px";
      fl2.style.opacity = "0.6";
      document.body.appendChild(fl2);
      setTimeout(() => fl2.remove(), 600);
    }, 150);

    /* hide UFO */
    ufo.style.transition = "opacity 0.3s";
    ufo.style.opacity = "0";
    setTimeout(() => { ufo.style.display = "none"; }, 400);

    /* remove beam cone + canvas */
    const canvas = document.querySelector(".runners-canvas");
    if (canvas) canvas.style.display = "none";

    /* fleet retreats after short celebration pause */
    setTimeout(() => retreatFleet(), 2000);
  }

  function retreatFleet() {
    const W = window.innerWidth;
    for (const fv of fleetVehicles) {
      if (!document.body.contains(fv.el)) continue;
      /* find this vehicle's physics state and send it offscreen */
      const exitX = fv.cfg.flip ? W + 300 : -300;
      for (const pv of allVehicles) {
        if (pv.el === fv.el) {
          pv.targetX = exitX;
          pv.patrolMin = null;
          pv.patrolMax = null;
          pv.maxSpeed = pv.maxSpeed * 1.5;
          break;
        }
      }
    }
    /* clean up after they leave */
    setTimeout(() => {
      for (const fv of fleetVehicles) {
        if (document.body.contains(fv.el)) fv.el.remove();
      }
      for (const pv of allVehicles) pv.alive = false;
    }, 6000);
  }
}
