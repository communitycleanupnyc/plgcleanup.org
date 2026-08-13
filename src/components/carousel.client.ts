// Client behavior for Carousel.astro: Embla motion, blur-up cleanup, the
// single-highlight model, the "N of M" counter, and the reveal panel.
// Self-contained — it discovers every [data-carousel] section in the DOM and
// reads its configuration back off that element's data-* attributes, so it
// needs nothing passed in from Astro.

import EmblaCarousel from "embla-carousel";

// ── Blur-up cleanup ─────────────────────────────
// Once a photo has painted, drop its LQIP background so the placeholder bytes
// are freed. Progressive enhancement: opaque cover photos already occlude the
// blur, so the effect works with JS disabled — this just tidies up after.
document.querySelectorAll<HTMLImageElement>("img[data-blur-up]").forEach((img) => {
  // Drops the whole inline style the blur-up needed — the LQIP background and
  // the `color:transparent` that hid the alt text while it loaded. Also runs on
  // `error`: a photo that never arrives should show its alt text, and leaving
  // the colour transparent would paint that text invisibly.
  const clear = () => {
    img.removeAttribute("style");
  };
  if (img.complete && img.naturalWidth > 0) clear();
  else {
    img.addEventListener("load", clear, { once: true });
    img.addEventListener("error", clear, { once: true });
  }
});

document.querySelectorAll<HTMLElement>("[data-carousel]").forEach((section) => {
  const enablePopup = section.dataset.enablePopup === "true";

  const viewport = section.querySelector<HTMLElement>(".embla__viewport");
  const slides = Array.from(section.querySelectorAll<HTMLElement>(".embla__slide"));
  const counter = section.querySelector<HTMLElement>(".carousel-counter");

  if (!viewport || slides.length === 0) return;
  const N = slides.length;

  const embla = EmblaCarousel(viewport, {
    align: "start",
    containScroll: false,
    loop: true,
    slidesToScroll: 1,
  });

  // Re-measure after images are sized at load
  if (document.readyState === "complete") {
    embla.reInit();
  } else {
    window.addEventListener("load", () => embla.reInit(), { once: true });
  }

  // ── Drag cursor ─────────────────────────────────
  embla.on("pointerDown", () => viewport.classList.add("is-dragging"));
  embla.on("pointerUp", () => viewport.classList.remove("is-dragging"));

  // ── Highlight model ─────────────────────────────
  // Exactly one slide is highlighted at a time (or none at load). A single sticky
  // index, "last interaction wins":
  //   • desktop hover / keyboard focus → that slide (stays put after the mouse
  //     leaves, until another slide is hovered);
  //   • arrow button → the slide it lands on;
  //   • mobile swipe → the settled slide.
  // A desktop drag leaves it alone (so it never jumps to the first card). Applied
  // ONLY here via `.is-active` (no CSS :hover), which enforces the single highlight.
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  let activeIndex = -1; // -1 = nothing highlighted (the load state)
  let arrowNav = false; // true only while an arrow-button move is settling
  let swipeDir = 0; // +1 = images scrolled left (advance), -1 = scrolled right (back)

  // How long the highlight takes to cross from one photo to the next. Written to
  // --hl-dur, which is the transition-duration of `filter` and `opacity` on the
  // slide images (see .card__media img in Carousel.astro).
  //
  // TUNE THE CROSSFADE HERE — one line each, nothing else reads these:
  const HL_DURATION = {
    /** Desktop: moving the mouse from one photo to another. */
    hover: "500ms",
    /** Desktop: the prev/next arrow buttons. */
    arrow: "350ms",
    /** Touch: swiping back (right). Advancing snaps instantly instead. */
    swipeBack: "225ms",
    /** Taps, advance-swipes, and pressing the next image — no fade at all. */
    instant: "0ms",
  };
  const setHighlightDuration = (ms: string) => section.style.setProperty("--hl-dur", ms);

  function setActive(i: number) {
    activeIndex = i;
    slides.forEach((s, idx) => s.classList.toggle("is-active", idx === activeIndex));
  }
  setActive(-1);

  // Mobile highlight speed: advancing — images scrolled LEFT — snaps in
  // instantly; going back — scrolled RIGHT — fades smoothly.
  function setHighlightSpeed() {
    setHighlightDuration(swipeDir > 0 ? HL_DURATION.instant : HL_DURATION.swipeBack);
  }

  // Physical swipe direction that feeds setHighlightSpeed().
  let downX = 0;
  viewport.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      downX = e.clientX;
      // Touch advance: the instant a finger lands on an image to the RIGHT of the
      // currently highlighted one (the gesture that scrolls images left), move the
      // highlight onto it immediately — don't wait for the swipe to settle. Pressing
      // the current/left image (a back-swipe) is left to settle smoothly on `select`.
      if (e.pointerType !== "touch") return;
      const slide = (e.target as HTMLElement).closest<HTMLElement>(".embla__slide");
      if (!slide) return;
      const cur = activeIndex >= 0 ? slides[activeIndex] : null;
      if (!cur || slide.getBoundingClientRect().left > cur.getBoundingClientRect().left + 1) {
        setHighlightDuration(HL_DURATION.instant);
        setActive(parseInt(slide.dataset.index ?? "-1", 10));
      }
    },
    { passive: true },
  );
  viewport.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      const dx = e.clientX - downX;
      if (Math.abs(dx) > 2) {
        swipeDir = dx < 0 ? 1 : -1;
        downX = e.clientX;
      }
    },
    { passive: true },
  );

  // Desktop hover / keyboard focus set the sticky highlight. Gated to the mouse
  // pointer and non-touch so a tap never sets a stuck highlight on touch devices.
  slides.forEach((slide, i) => {
    slide.addEventListener("pointerenter", (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setHighlightDuration(HL_DURATION.hover); // hover is always a smooth crossfade
      setActive(i);
    });
    if (!isTouch) slide.addEventListener("focusin", () => setActive(i));
  });

  // ── Counter ─────────────────────────────────────
  // Template comes from the `labels.counter` prop via a data attribute, so the
  // wording (and its language) is the caller's to set, not this file's.
  const counterLabel = section.dataset.counterLabel ?? "{n} of {total}";
  function updateCounter() {
    if (!counter) return;
    counter.textContent = counterLabel
      .replaceAll("{n}", String(embla.selectedScrollSnap() + 1))
      .replaceAll("{total}", String(N));
  }

  embla.on("select", () => {
    updateCounter();
    const idx = embla.selectedScrollSnap();
    if (arrowNav) {
      // Desktop: an extra-smooth crossfade. Mobile: match the swipe feel (advance
      // instant, back smooth) — a long crossfade there leaves the old highlight
      // lingering during the fade, which reads as a stuck/double highlight.
      if (isTouch) setHighlightSpeed();
      else setHighlightDuration(HL_DURATION.arrow);
      setActive(idx);
      arrowNav = false;
    } else if (isTouch) {
      setHighlightSpeed(); // swipe: advance instant, back smooth
      setActive(idx);
    }
    // desktop drag: leave the sticky highlight where it is
  });
  embla.on("reInit", updateCounter);
  updateCounter();

  // ── Arrow buttons ────────────────────────────────
  // Flag the move as arrow-driven (so `select` commits its highlight) and record the
  // direction: next = advance (instant), prev = back (smooth).
  function goPrev() {
    arrowNav = true;
    swipeDir = -1;
    embla.scrollPrev();
  }
  function goNext() {
    arrowNav = true;
    swipeDir = 1;
    embla.scrollNext();
  }
  function goTo(index: number) {
    arrowNav = true;
    swipeDir = index > embla.selectedScrollSnap() ? 1 : -1;
    embla.scrollTo(index);
  }
  section.querySelector("[data-dir=prev]")?.addEventListener("click", goPrev);
  section.querySelector("[data-dir=next]")?.addEventListener("click", goNext);

  // ── Keyboard navigation ──────────────────────────
  // The viewport is overflow:hidden and not focusable, so without this the only
  // way to move the carousel from a keyboard is to Tab to the two arrow buttons.
  // Arrow/Home/End work from anywhere inside the carousel.
  //
  // Not while focus is inside an open panel: arrow keys have to keep scrolling
  // that text, which is the whole reason .card__panel-body carries tabindex="0".
  section.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest(".card__panel")) return;

    switch (e.key) {
      case "ArrowLeft":
        goPrev();
        break;
      case "ArrowRight":
        goNext();
        break;
      case "Home":
        goTo(0);
        break;
      case "End":
        goTo(N - 1);
        break;
      default:
        return;
    }
    // Only reached when the key was handled — stop the page scrolling too.
    e.preventDefault();
  });

  // ── Off-screen slides ────────────────────────────
  // The track loops and is clipped, so most slides are invisible at any moment —
  // but they stay in the tab order and the accessibility tree, and Tab walks
  // through every one of them including photos nobody can see. Hide those.
  //
  // NOT `inert`, which would be the one-attribute way to do this. `inert` also
  // makes the subtree non-hit-testable, which silently breaks the hover
  // highlight: a slide that is inert when the pointer enters it fires no
  // `pointerenter`, so it never becomes .is-active and never runs the crossfade.
  // The visible symptom is a highlight that stops following the mouse — most
  // obviously right after a scroll, when the card under a stationary cursor is
  // skipped entirely (pointerenter only fires on entry, and the cursor never
  // moved). aria-hidden + tabindex="-1" achieves the same tab-order and
  // screen-reader result and leaves pointer behaviour completely untouched.
  //
  // The slide holding focus is never hidden: `select` closes any open panel and
  // hands focus back to that slide's toggle, and hiding it in the same turn
  // would strand that focus inside an aria-hidden subtree.
  const FOCUSABLE = "a[href], button, [tabindex]";

  function setSlideHidden(slide: HTMLElement, hidden: boolean) {
    if (slide.dataset.offscreen === String(hidden)) return; // already in this state
    slide.dataset.offscreen = String(hidden);

    if (hidden) slide.setAttribute("aria-hidden", "true");
    else slide.removeAttribute("aria-hidden");

    // Take the controls out of the tab order too — aria-hidden alone would
    // leave a focusable element inside a hidden subtree, which is its own bug.
    // The authored tabindex is remembered so .card__panel-body gets its 0 back.
    for (const el of slide.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (hidden) {
        if (el.dataset.tabindexWas === undefined)
          el.dataset.tabindexWas = el.getAttribute("tabindex") ?? "";
        el.setAttribute("tabindex", "-1");
      } else {
        const prev = el.dataset.tabindexWas;
        if (prev === undefined) continue;
        if (prev === "") el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", prev);
        delete el.dataset.tabindexWas;
      }
    }
  }

  function updateOffscreenSlides() {
    const inView = new Set(embla.slidesInView());
    // Before Embla has measured (and if it ever reports nothing), treat every
    // slide as visible. Hiding all of them would leave the carousel unreachable.
    if (inView.size === 0) {
      slides.forEach((slide) => setSlideHidden(slide, false));
      return;
    }
    slides.forEach((slide, i) => {
      const visible = inView.has(i) || slide.contains(document.activeElement);
      setSlideHidden(slide, !visible);
    });
  }
  embla.on("slidesInView", updateOffscreenSlides);
  embla.on("reInit", updateOffscreenSlides);
  // Re-evaluate when focus moves, so a slide that was hidden but has just been
  // scrolled into view (or out of it) settles into the right state.
  section.addEventListener("focusin", updateOffscreenSlides);
  updateOffscreenSlides();

  // ── Testimonial panel ────────────────────────────
  if (!enablePopup) return;

  function panelOf(slide: HTMLElement) {
    return slide.querySelector<HTMLElement>(".card__panel");
  }

  function closeAllPanels(except: HTMLElement | null) {
    slides.forEach((s) => {
      if (s === except || !isPanelShowing(s)) return;
      closePanel(s);
    });
  }

  function openPanel(slide: HTMLElement) {
    closeAllPanels(slide);
    const panel = panelOf(slide);
    if (panel) {
      // Start every reveal at the top of the quote. The panel keeps its DOM (and
      // so its scrollTop) between opens, so without this, reopening a long
      // testimonial drops you back wherever you happened to stop reading last
      // time — which reads as a rendering glitch, not as a memory aid.
      const body = panel.querySelector<HTMLElement>(".card__panel-body");
      if (body) body.scrollTop = 0;
    }
    // State that shouldn't wait for the animation.
    slide.querySelector(".card__toggle")?.setAttribute("aria-expanded", "true");
    // Highlight the source card while its panel is open
    setActive(parseInt(slide.dataset.index ?? "-1", 10));

    // Two-step open, so the rise mirrors the fall. Step one makes the panel
    // visible while it is still parked off-screen (see .is-panel-priming in
    // Carousel.astro) — that is the frame the browser spends painting the text.
    // Step two, a full frame later, starts the slide against painted content.
    // Without the gap the paint and the first transition frames collide and the
    // rise stutters; the fall never did, because the text was already painted.
    //
    // Two rAFs, not one: the first fires BEFORE the pending paint, the second
    // after it, which is what actually guarantees a painted panel.
    slide.classList.add("is-panel-priming");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Bail if it was closed again in those two frames (fast toggling).
        if (!slide.classList.contains("is-panel-priming")) return;
        slide.classList.add("is-panel-open");
        // Move focus into what just opened. The panel precedes the toggle in the
        // DOM, so without this, Tab from the toggle walks AWAY from the content
        // the user just revealed. The close button is the natural landing spot,
        // and mirrors closePanel(), which returns focus to the toggle.
        // preventScroll: the button is absolutely positioned inside a panel that
        // is mid-slide, and letting the browser scroll it into view yanks the
        // page while the animation runs.
        slide.querySelector<HTMLElement>(".card__panel-close")?.focus({ preventScroll: true });
      }),
    );
  }

  function isPanelShowing(slide: HTMLElement) {
    // "Showing" covers the two-frame priming window as well as the open state,
    // so a fast second click closes the panel instead of re-opening it.
    return (
      slide.classList.contains("is-panel-open") || slide.classList.contains("is-panel-priming")
    );
  }

  function closePanel(slide: HTMLElement) {
    // Whether focus is inside the panel we're about to close. Must be read
    // BEFORE the classes come off, while the panel is still focusable.
    const panel = panelOf(slide);
    const hadFocus = !!panel && panel.contains(document.activeElement);

    slide.classList.remove("is-panel-open", "is-panel-priming");
    slide.querySelector(".card__toggle")?.setAttribute("aria-expanded", "false");

    // Return focus to the toggle that opened this panel. Without it, the panel
    // goes visibility:hidden 0.44s later with focus still inside it, focus falls
    // to <body>, and a keyboard user is silently dumped at the top of the
    // document (WCAG 2.4.3). This lives here rather than in the close-button
    // click handler so EVERY close path is covered — Escape and the carousel
    // settling on another slide both call closePanel() too.
    // preventScroll: the carousel may be mid-transition; letting the browser
    // scroll the toggle into view yanks the page.
    if (hadFocus) {
      slide.querySelector<HTMLElement>(".card__toggle")?.focus({ preventScroll: true });
    }

    // Dropping .is-panel-priming hands visibility back to the base rule, whose
    // `transition: visibility 0s 0.44s` keeps the panel painted for the whole
    // slide-out and only then hides it — which is what takes it back out of the
    // tab order and the accessibility tree.
  }

  // Embla stopPropagation()s click in capture phase after drags,
  // so this only fires on genuine taps/clicks (< dragThreshold movement).
  section.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Whole caption box (name + quote + arrow) toggles the panel.
    const caption = target.closest<HTMLElement>(".card__caption");
    if (caption) {
      const slide = caption.closest<HTMLElement>(".embla__slide");
      if (!slide || !panelOf(slide)) return;
      isPanelShowing(slide) ? closePanel(slide) : openPanel(slide);
      return;
    }

    const close = target.closest<HTMLElement>(".card__panel-close");
    if (close) {
      // closePanel() returns focus to the toggle itself — focus is on this
      // button, which is inside the panel.
      const slide = close.closest<HTMLElement>(".embla__slide");
      if (slide) closePanel(slide);
      return;
    }

    // A plain tap on the image highlights that slide — on touch there's no hover to
    // do it. (Suppressed after a drag by Embla, so only genuine taps get here.)
    const media = target.closest<HTMLElement>(".card__media");
    if (media && !target.closest(".card__panel")) {
      const slide = media.closest<HTMLElement>(".embla__slide");
      if (slide) {
        setHighlightDuration(HL_DURATION.instant); // a direct tap highlights instantly
        setActive(parseInt(slide.dataset.index ?? "-1", 10));
      }
    }
  });

  // Close on Escape and whenever the carousel settles on another slide
  // (swipe, drag, and the prev/next arrows all fire 'select').
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAllPanels(null);
  });
  embla.on("select", () => closeAllPanels(null));
});
