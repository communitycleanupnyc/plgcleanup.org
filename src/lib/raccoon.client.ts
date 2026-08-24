// The raccoon easter egg on the home page. Two layers of play, one element:
//
//   tap it   → it turns a somersault (a CSS animation; see index.astro)
//   drag it  → it follows your finger, then slingshots home on a real spring
//
// Nothing here is load-bearing. The raccoon is `alt="" aria-hidden="true"`
// decoration, deliberately not in the tab order — a control that announces
// nothing is worse for keyboard and screen-reader users than a pointer-only
// joke — and no content, layout, or link depends on any of it. If this file
// fails to load, the page is exactly the page minus a bit of fun.
//
// The contract with the CSS is three custom properties, read by `translate`
// and `rotate` in the `.raccoon` rule:
//
//   --drag-x    px offset from its resting spot
//   --drag-y    px offset from its resting spot
//   --drag-rot  deg of lean on top of its resting tilt
//
// Offsets rather than absolute coordinates, so the raccoon keeps whatever
// position the stylesheet gives it at every breakpoint. Home is always 0,0,0°.
const raccoon = document.querySelector<HTMLElement>(".raccoon");
if (raccoon) play(raccoon);

// Wrapped in a function purely so `el` is a plain HTMLElement throughout:
// TypeScript won't carry the null check into the hoisted handlers below.
function play(el: HTMLElement) {
  // ── Feel ────────────────────────────────────────────────────────────────
  // Spring: mass–stiffness–damping, the same model Framer/iOS springs use.
  // The damping ratio here is c / (2·√(k·m)) ≈ 0.53 — underdamped, so it
  // overshoots home two or three times and settles in under a second. Raise
  // DAMPING towards 32 to kill the bounce; lower STIFFNESS to make it lazier.
  const MASS = 1;
  const STIFFNESS = 260;
  const DAMPING = 17;

  const DRAG_SLOP = 6; // px of movement before a tap becomes a drag
  // Cap on fling speed. It sets how far past home the spring overshoots:
  // for a release at rest that peak is about v/30 px, so 1800px/s ≈ 60px of
  // whip past the landing. Higher looks great mid-screen but throws the
  // raccoon off the right edge, where `overflow-x: clip` on <body> (base.css)
  // silently eats it — no scrollbar, but no raccoon either for a few frames.
  const MAX_THROW = 1800; // px/s
  const TUMBLE_PER_SPEED = 0.14; // deg/s of spin per px/s of sideways throw
  const MAX_TUMBLE = 900; // deg/s
  const LEAN_PER_PX = 0.06; // deg of lean per px dragged sideways
  const MAX_LEAN = 20; // deg
  const EDGE = 8; // px of viewport kept clear, so it can't be dragged offscreen

  // Integration: semi-implicit Euler is only stable with a small step, and rAF
  // hands us anything from 4ms (120Hz) to a long stall. Sub-step at a fixed
  // 240Hz and clamp the frame, so a backgrounded tab can't launch the raccoon.
  const STEP = 1 / 240; // s
  const MAX_FRAME = 0.064; // s
  const REST_OFFSET = 0.35; // px / deg
  const REST_SPEED = 4; // px/s / deg/s

  // ── State ───────────────────────────────────────────────────────────────
  let x = 0;
  let y = 0;
  let rot = 0;
  let vx = 0;
  let vy = 0;
  let vrot = 0;
  let frame = 0;

  let pointer: number | null = null;
  let dragging = false;
  let swallowClick = false;
  let grabX = 0;
  let grabY = 0;
  let fromX = 0;
  let fromY = 0;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  // Velocity for the throw, smoothed over the last few pointer samples.
  let lastX = 0;
  let lastY = 0;
  let lastAt = 0;
  let speedX = 0;
  let speedY = 0;
  let clock = 0; // the integrator's own clock, so it can't be confused with lastAt

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // Asked per gesture rather than cached at load, so changing the OS setting
  // mid-visit takes effect without a reload.
  const stillness = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function paint() {
    el.style.setProperty("--drag-x", `${x}px`);
    el.style.setProperty("--drag-y", `${y}px`);
    el.style.setProperty("--drag-rot", `${rot}deg`);
  }

  /** Back to the stylesheet's idea of home: drop the properties entirely. */
  function home() {
    x = y = rot = vx = vy = vrot = 0;
    el.style.removeProperty("--drag-x");
    el.style.removeProperty("--drag-y");
    el.style.removeProperty("--drag-rot");
  }

  function settle(now: number) {
    const dt = Math.min((now - clock) / 1000, MAX_FRAME);
    clock = now;

    for (let t = 0; t < dt; t += STEP) {
      const h = Math.min(STEP, dt - t);
      vx += ((-STIFFNESS * x - DAMPING * vx) / MASS) * h;
      vy += ((-STIFFNESS * y - DAMPING * vy) / MASS) * h;
      vrot += ((-STIFFNESS * rot - DAMPING * vrot) / MASS) * h;
      x += vx * h;
      y += vy * h;
      rot += vrot * h;
    }

    const parked =
      Math.hypot(x, y) < REST_OFFSET &&
      Math.hypot(vx, vy) < REST_SPEED &&
      Math.abs(rot) < REST_OFFSET &&
      Math.abs(vrot) < REST_SPEED;

    if (parked) {
      frame = 0;
      home();
      return;
    }

    paint();
    frame = requestAnimationFrame(settle);
  }

  el.addEventListener("pointerdown", (ev) => {
    // Primary button / first finger only: a right-click or a second touch
    // should not grab the raccoon out from under the gesture in progress.
    if (!ev.isPrimary || ev.button !== 0) return;

    cancelAnimationFrame(frame);
    frame = 0;
    pointer = ev.pointerId;
    dragging = false;
    swallowClick = false;
    el.setPointerCapture(ev.pointerId);

    grabX = ev.clientX;
    grabY = ev.clientY;
    // Where it is *now*, which is not necessarily home: grabbing it mid-flight
    // has to continue from where you caught it, not snap back to the start.
    fromX = x;
    fromY = y;
    lastX = ev.clientX;
    lastY = ev.clientY;
    lastAt = ev.timeStamp;
    speedX = speedY = 0;

    // Keep the whole raccoon on screen. Its rect minus the offset currently
    // applied is its home rect, which is what the limits are measured from —
    // grabbing it mid-flight therefore gives the same bounds as grabbing it
    // at rest. Measured per grab, so a resize or scroll can't stale them.
    const r = el.getBoundingClientRect();
    minX = EDGE - (r.left - x);
    maxX = window.innerWidth - EDGE - r.width - (r.left - x);
    minY = EDGE - (r.top - y);
    maxY = window.innerHeight - EDGE - r.height - (r.top - y);
  });

  el.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== pointer) return;

    const dx = ev.clientX - grabX;
    const dy = ev.clientY - grabY;

    if (!dragging) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return; // still within tap slop
      dragging = true;
      el.classList.add("is-dragging");
      el.classList.remove("is-spinning"); // your hand takes over from the spin
      // Re-anchor to here, so it doesn't jump the slop distance on the frame
      // the drag begins. It costs 6px of travel and buys a seamless pickup.
      grabX = ev.clientX;
      grabY = ev.clientY;
      return;
    }

    x = clamp(fromX + dx, minX, maxX);
    y = clamp(fromY + dy, minY, maxY);
    rot = clamp(x * LEAN_PER_PX, -MAX_LEAN, MAX_LEAN);

    const dt = (ev.timeStamp - lastAt) / 1000;
    if (dt > 0) {
      // Exponential smoothing: one jittery sample shouldn't decide the throw.
      speedX = speedX * 0.7 + ((ev.clientX - lastX) / dt) * 0.3;
      speedY = speedY * 0.7 + ((ev.clientY - lastY) / dt) * 0.3;
      lastX = ev.clientX;
      lastY = ev.clientY;
      lastAt = ev.timeStamp;
    }

    paint();
  });

  function release(ev: PointerEvent) {
    if (ev.pointerId !== pointer) return;
    pointer = null;
    if (el.hasPointerCapture(ev.pointerId)) el.releasePointerCapture(ev.pointerId);
    if (!dragging) return; // it was a tap — the click handler spins it

    dragging = false;
    el.classList.remove("is-dragging");
    swallowClick = true; // the click that trails this drag is not a tap

    // A finger that stopped moving fires no more pointermove events, so the
    // last sample goes stale: letting go after a pause is a drop, not a throw.
    // A cancelled pointer (the browser took the gesture) is a drop too.
    const stale = ev.type === "pointercancel" || ev.timeStamp - lastAt > 80;
    vx = stale ? 0 : clamp(speedX, -MAX_THROW, MAX_THROW);
    vy = stale ? 0 : clamp(speedY, -MAX_THROW, MAX_THROW);
    vrot = clamp(vx * TUMBLE_PER_SPEED, -MAX_TUMBLE, MAX_TUMBLE);

    if (stillness()) {
      home(); // no bounce for anyone who asked for no motion
      return;
    }

    clock = performance.now();
    frame = requestAnimationFrame(settle);
  }

  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);

  el.addEventListener("click", () => {
    // Cleared on the next pointerdown, so a swallowed click can never eat the
    // tap after it — and a browser that suppresses the post-drag click at all
    // costs us nothing.
    if (swallowClick) return;
    if (stillness()) return;

    // Tapping again mid-spin restarts it: drop the class, flush styles, re-add.
    // `void offsetHeight` is the canonical restart idiom — see CLAUDE.md.
    el.classList.remove("is-spinning");
    void el.offsetHeight;
    el.classList.add("is-spinning");
  });

  el.addEventListener("animationend", () => {
    el.classList.remove("is-spinning");
  });
}
