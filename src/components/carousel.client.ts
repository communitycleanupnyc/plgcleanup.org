// Client behavior for Carousel.astro: Embla motion, blur-up cleanup, the
// single-highlight model, the "N of M" counter, and the testimonial reveal panel.
// Self-contained — it discovers every [data-carousel] section in the DOM.

import EmblaCarousel from "embla-carousel";

// ── Blur-up cleanup ─────────────────────────────
// Once a photo has painted, drop its LQIP background so the placeholder bytes
// are freed. Progressive enhancement: opaque cover photos already occlude the
// blur, so the effect works with JS disabled — this just tidies up after.
document.querySelectorAll<HTMLImageElement>("img[data-blur-up]").forEach((img) => {
  const clear = () => {
    img.style.backgroundImage = "none";
  };
  if (img.complete && img.naturalWidth > 0) clear();
  else img.addEventListener("load", clear, { once: true });
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

  function setActive(i: number) {
    activeIndex = i;
    slides.forEach((s, idx) => s.classList.toggle("is-active", idx === activeIndex));
  }
  setActive(-1);

  // Mobile highlight speed (desktop keeps its fixed 225ms in CSS): advancing — images
  // scrolled LEFT — snaps in instantly; going back — scrolled RIGHT — fades smoothly.
  // --hl-dur feeds the touch `transition-duration` in the stylesheet.
  function setHighlightSpeed() {
    section.style.setProperty("--hl-dur", swipeDir > 0 ? "0ms" : "225ms");
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
        section.style.setProperty("--hl-dur", "0ms");
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
      section.style.setProperty("--hl-dur", "225ms"); // hover is always a smooth crossfade
      setActive(i);
    });
    if (!isTouch) slide.addEventListener("focusin", () => setActive(i));
  });

  // ── Counter ─────────────────────────────────────
  function updateCounter() {
    if (counter) counter.textContent = `${embla.selectedScrollSnap() + 1} of ${N}`;
  }

  embla.on("select", () => {
    updateCounter();
    const idx = embla.selectedScrollSnap();
    if (arrowNav) {
      // Desktop: an extra-smooth crossfade. Mobile: match the swipe feel (advance
      // instant, back smooth) — a long crossfade there leaves the old highlight
      // lingering during the fade, which reads as a stuck/double highlight.
      if (isTouch) setHighlightSpeed();
      else section.style.setProperty("--hl-dur", "350ms");
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
  section.querySelector("[data-dir=prev]")?.addEventListener("click", () => {
    arrowNav = true;
    swipeDir = -1;
    embla.scrollPrev();
  });
  section.querySelector("[data-dir=next]")?.addEventListener("click", () => {
    arrowNav = true;
    swipeDir = 1;
    embla.scrollNext();
  });

  // ── Testimonial panel ────────────────────────────
  if (!enablePopup) return;

  function panelOf(slide: HTMLElement) {
    return slide.querySelector<HTMLElement>(".card__panel");
  }

  function closeAllPanels(except: HTMLElement | null) {
    slides.forEach((s) => {
      if (s === except || !s.classList.contains("is-panel-open")) return;
      closePanel(s);
    });
  }

  function openPanel(slide: HTMLElement) {
    closeAllPanels(slide);
    const panel = panelOf(slide);
    if (panel) {
      panel.removeAttribute("hidden");
      // Commit the resting (translate: 100%) state NOW — a bare rAF can batch the
      // unhide + class change into one style pass, so the panel snaps in with no
      // slide. Forcing layout here guarantees it animates from 100% → 0%.
      void panel.offsetHeight;
    }
    slide.classList.add("is-panel-open");
    slide.querySelector(".card__toggle")?.setAttribute("aria-expanded", "true");

    // Highlight the source card while its panel is open
    setActive(parseInt(slide.dataset.index ?? "-1", 10));
  }

  function closePanel(slide: HTMLElement) {
    slide.classList.remove("is-panel-open");
    slide.querySelector(".card__toggle")?.setAttribute("aria-expanded", "false");

    // Re-apply `hidden` once the slide-out finishes (matches the 0.4s visibility delay)
    const panel = panelOf(slide);
    panel?.addEventListener("transitionend", function h(e) {
      if (e.propertyName === "translate" && !slide.classList.contains("is-panel-open")) {
        panel.setAttribute("hidden", "");
        panel.removeEventListener("transitionend", h);
      }
    });
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
      slide.classList.contains("is-panel-open") ? closePanel(slide) : openPanel(slide);
      return;
    }

    const close = target.closest<HTMLElement>(".card__panel-close");
    if (close) {
      const slide = close.closest<HTMLElement>(".embla__slide");
      if (slide) {
        closePanel(slide);
        slide.querySelector<HTMLElement>(".card__toggle")?.focus();
      }
      return;
    }

    // A plain tap on the image highlights that slide — on touch there's no hover to
    // do it. (Suppressed after a drag by Embla, so only genuine taps get here.)
    const media = target.closest<HTMLElement>(".card__media");
    if (media && !target.closest(".card__panel")) {
      const slide = media.closest<HTMLElement>(".embla__slide");
      if (slide) {
        section.style.setProperty("--hl-dur", "0ms"); // a direct tap highlights instantly
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
