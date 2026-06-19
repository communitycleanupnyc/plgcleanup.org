# Expanding Quote Panel — Implementation Spec

**Scope:** the testimonial/quote disclosure only. **Replaces** the Floating-UI pointer-anchored popover (§7 of the carousel spec) and the full-card `card__trigger`. Slots into the existing `Carousel.astro`; the carousel, image rendering, and tint/highlight model are unchanged. **Floating UI is no longer a dependency** for this — there is no anchor/collision math; it's an in-flow disclosure.

This part is **decided as in-flow** (the panel is real page content that pushes what's below it down — not an overlay, not a modal).

---

## 0. Design intent (the principles to preserve)

1. **Progressive disclosure, in place.** The card shows the minimum — photo, name, one-line reason. The full quote is revealed only on intent, exactly where the eye already is: directly under the line that was clicked. No modal, no new surface to orient to.
2. **The image scans; the text commits.** Only the name + quote are the trigger — never the image. This separates "browsing faces" from "I want to read this person," and frees the image to be Embla's drag handle without accidental opens.
3. **It reads as the page, not a layer.** `var(--bg)` + left-aligned body make the revealed quote look like the page simply had more to say — the least-startling reveal. One prominent close, plus ambient dismissal (tap away, navigate), so exiting is effortless and never traps the user.

---

## 1. Trigger

- The trigger is a single `<button class="card__disclosure">` containing the **name** and the **one-line quote** as two `<span>`s (spans keep the button valid HTML; stack them with CSS). The **image is not a trigger** and stays the visual + Embla drag surface.
- `aria-expanded` + `aria-controls="quote-panel"`.
- **Toggles:** open if closed for this person; close if already open for this person; clicking a different person's trigger switches (close → recompute → open).

```css
.card__disclosure {
  display: flex; flex-direction: column; gap: .25rem;
  text-align: left; width: 100%;
  background: none; border: 0; padding: 0; cursor: pointer;
}
.card__name  { font-weight: 600; }
.card__disclosure:hover .card__name,
.card__disclosure:focus-visible .card__name { text-decoration: underline; } /* affordance */
```

---

## 2. DOM (one reusable panel per carousel instance)

Placed **after** the Embla viewport, inside a `position: relative` section wrapper — so it sits below the card row, **outside Embla's `overflow:hidden`**, and never moves with horizontal scroll.

```astro
<section class="carousel-section" style="position:relative" …>
  <header>… arrows …</header>

  <div class="embla">
    … viewport / slides; each slide contains:
      <button class="card__disclosure" aria-controls="quote-panel" aria-expanded="false">
        <span class="card__name">{name}</span>
        <span class="card__quote">{quote}</span>
      </button>
  </div>

  <section class="quote-panel" id="quote-panel" role="region"
           aria-labelledby="quote-panel-name" hidden>
    <button class="quote-panel__close nav-menu-btn" aria-label="Close"></button>
    <h3 id="quote-panel-name"></h3>
    <div class="quote-panel__body"><!-- full body via set:html, left-aligned --></div>
  </section>
</section>
```

`body` is **trusted first-party HTML** (inline tags only: `<a>`, `<em>`, `<strong>`, `<br>`), rendered with `set:html`. Links authored as `<a href="…" target="_blank" rel="noopener noreferrer">…</a>`.

---

## 3. Position & size (in-flow, computed at open)

The panel is an **in-flow block** below the carousel row. Opening it pushes subsequent content down; it scrolls with the page; it never follows the pointer or repositions on hover.

- **Top:** below the carousel row — natural, since it's the next element in flow.
- **Left + width — desktop:** left edge aligns to the **active card's** left edge; width = active card width + gap + **next** card width (the current image plus the next), capped to the content's right edge. If the active card is the **last** (no next), width = active card width. Implemented as `margin-left` + explicit `width`, recomputed on each open.
- **Left + width — compact (≤599px, i.e. when <2 cards fit):** `margin-left: 0`; width = **full content width** (end to end).
- **Height:** content height — the full quote, left-aligned. To honor "take up the rest of the screen to the bottom," set a `min-height` at open so a short quote still reaches near the viewport bottom; a long quote exceeds it and the page scrolls to reveal the rest:
  `min-height: calc(100dvh - <panel-top-in-viewport> - <bottom-margin>)`.

### Open-time positioning (controller contract)

```js
function openPanel(item, index, slideEl, triggerEl) {
  panelName.textContent = item.name;
  panelBody.innerHTML  = item.body;                  // trusted first-party HTML

  if (isCompact()) {                                 // ≤599px / <2 cards fit
    panel.style.marginLeft = '0';
    panel.style.width = '100%';
  } else {
    const a    = slideEl.getBoundingClientRect();
    const next = slideEl.nextElementSibling?.getBoundingClientRect();
    const contentLeft = getContentLeftPx();          // from Base.astro container inset
    panel.style.marginLeft = `${a.left - contentLeft}px`;
    panel.style.width = next ? `${next.right - a.left}px` : `${a.width}px`;
  }

  panel.hidden = false;
  const top = panel.getBoundingClientRect().top;     // fill-to-bottom
  panel.style.minHeight = `calc(100dvh - ${Math.max(0, top)}px - 24px)`;

  triggerEl.setAttribute('aria-expanded', 'true');
  setActive(index);                                  // tint the source card
  panel.querySelector('.quote-panel__close').focus();
}
```

Recompute on each open. Closing on any carousel movement (§4) keeps the measurement from going stale.

---

## 4. Open / close behavior

- **Open — instant** (no height animation; reads as "the page expanded"). Sets `aria-expanded=true`, moves focus to the close button, makes the source card the active/tinted one. *(Optional nicety: a ≤180ms grid-rows `0fr→1fr` reveal; reduced-motion = instant.)*
- **Close — immediate** (no animation): set `hidden`, `aria-expanded=false`, return focus to the trigger.
- **Toggle:** the active trigger closes; a different trigger switches (close → recompute → open).
- **Dismissal — all close immediately:**
  - **Tap/click outside** the panel and outside any trigger (this is "next tap on mobile," generalized). Use a **10px movement threshold** so a scroll/drag does **not** dismiss.
  - The **close button**.
  - The carousel **arrows**.
  - **Carousel drag** (Embla `pointerDown`) — keeps alignment valid.
  - **`Escape`**.
- **Does NOT close on:** page scroll (it scrolls with the page, staying put), or any interaction inside the panel. **Links inside open in a new tab** (`rel="noopener noreferrer"`) and don't dismiss.

```
document pointerdown: if open && !panel.contains(t) && !t.closest('.card__disclosure'):
                        record {x,y}; candidate = true
document pointermove: if candidate && moved > 10px: candidate = false      // scroll, not a tap
document pointerup:   if open && candidate && outside as above: closePanel()
Escape / .quote-panel__close click: closePanel()
embla.on('pointerDown', closePanel); arrowPrev/Next click → closePanel() then scroll
```

---

## 5. Styling

- `background: var(--bg)` — **no shadow, no elevation** (it isn't a floating layer). Optional faint `border-top: 1px solid var(--border)` to mark where it begins; omit for fully seamless.
- Body **left-aligned**, comfortable measure (e.g. `max-width: 64ch` inside the panel), generous padding.
- **Close button: prominent, high-contrast** against `var(--bg)`, pinned top-right (reuse `nav-menu-btn`), always visible without scrolling.

```css
.quote-panel { position: relative; background: var(--bg); padding: 2rem; }
.quote-panel[hidden] { display: none; }
.quote-panel__body { max-width: 64ch; text-align: left; }
.quote-panel__close { position: absolute; top: 1rem; right: 1rem; }
@media (prefers-reduced-motion: reduce) { /* no open animation */ }
```

---

## 6. Accessibility

- **Disclosure semantics:** trigger `aria-expanded` + `aria-controls`; panel `role="region"` + `aria-labelledby` (the name).
- **Non-modal:** the page stays interactive; do **not** trap focus.
- Move focus to the close button on open; return focus to the trigger on close; `Escape` closes.
- Respect `prefers-reduced-motion` (instant). The 10px tap-vs-scroll threshold prevents accidental dismissal during scroll.

---

## 7. Acceptance criteria

1. Clicking the **name or quote text** (not the image) opens the panel; clicking it again closes (toggle); clicking another person's text switches.
2. The image is **not** a trigger and remains draggable (Embla).
3. The panel appears **directly below the carousel row**, left-aligned to the active card; desktop width = current + next card span (≤2 image widths); compact = full content width.
4. **In-flow:** opening **pushes content below down** (no overlay, no modal); the panel scrolls with the page and does not reposition on hover.
5. `background: var(--bg)`, no shadow; body **left-aligned**; close button prominent and visible without scrolling.
6. Height fits the **full quote**; a short quote still reaches ~viewport bottom (`min-height`); a long quote extends past it and the page scrolls.
7. Closes **immediately** on: outside tap (next tap on mobile), close button, arrows, carousel drag, `Escape`. Does **not** close on page scroll or on interaction inside the panel.
8. Links inside open in a new tab and don't dismiss.
9. a11y: `aria-expanded`/`aria-controls`, `region`+`aria-labelledby`, focus to close on open and back to trigger on close, `Escape` closes, reduced-motion instant.
10. Opening sets the source card as the active/tinted card.

---

## 8. Open questions (minor; sensible defaults already baked in)

1. **Compact breakpoint** is set at ≤599px (when <2 cards fit). Confirm, or tie it to "fewer than 2 cards visible."
2. **Last-card width** falls back to one card width when there's no next card. Confirm, or wrap to current + previous.
3. **Fill-to-bottom** `min-height` is on by default (matches "take up the rest of the screen to the bottom"). If you'd rather size purely to content, drop the `min-height` line.
4. **Content left-inset** (`getContentLeftPx()`) must come from `Base.astro`'s container — same value used for the carousel's left edge.
