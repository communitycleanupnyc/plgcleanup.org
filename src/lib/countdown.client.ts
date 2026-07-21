// Keeps the "next cleanup is …" copy honest in the browser. The build bakes in a
// value that reflects the deploy date; on load (and periodically) we recompute it
// from the event's start/end timestamps so it's always right for the visitor's
// clock — no scheduled rebuilds. Imports only the pure logic in ../data/countdown,
// so zod/event.ts never reach the client bundle.
import {
  computeCountdown,
  renderHomeCountdown,
  renderJoinCountdown,
  renderCtaLabel,
} from "../data/countdown";

// Each countdown element carries data-start / data-end (event ISO timestamps) and
// a data-variant selecting which copy to render.
const els = [...document.querySelectorAll<HTMLElement>("[data-countdown]")];

function refresh(el: HTMLElement) {
  const start = el.dataset.start;
  const end = el.dataset.end;
  if (!start || !end || Number.isNaN(new Date(start).getTime())) return;

  const state = computeCountdown(new Date(), start, end);
  switch (el.dataset.variant) {
    case "home":
      el.innerHTML = renderHomeCountdown(state); // contains a link
      break;
    case "cta":
      el.textContent = renderCtaLabel(state);
      break;
    case "join": {
      const line = renderJoinCountdown(state);
      el.textContent = line;
      el.hidden = line === ""; // past → hide the line entirely
      break;
    }
  }
}

function refreshAll() {
  els.forEach(refresh);
}

refreshAll();
// Tick so a long-open tab rolls over midnight and counts down live on the day of.
setInterval(refreshAll, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshAll();
});
