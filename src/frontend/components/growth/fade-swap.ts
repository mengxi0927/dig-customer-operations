import { flushSync } from "react-dom";

const running = new WeakMap<HTMLElement, Animation>();
const moduleSelector = ".g-heading, .g-tab-bar, .g-error, .asset-filters, .g-card, .g-metrics > article, .og-metrics > div, .og-notice";
let navigationAnimations: Animation[] = [];

export function fadeSwap(surface: HTMLElement | null, update: () => void) {
  if (!surface || !surface.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const previous = running.get(surface);
  if (previous) {
    running.delete(surface);
    previous.cancel();
    update();
    return;
  }
  const outgoing = surface.animate([{ opacity: 1 }, { opacity: .76 }], {
    duration: 80, easing: "ease-in", fill: "forwards",
  });
  running.set(surface, outgoing);
  void outgoing.finished.then(() => {
    if (running.get(surface) !== outgoing) return;
    running.delete(surface);
    outgoing.cancel();
    if (!surface.isConnected) return;
    flushSync(update);
    surface.animate([{ opacity: .76 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
  }, () => {});
}

function workspaceModules(surface: HTMLElement) {
  const bounds = surface.getBoundingClientRect();
  const middle = bounds.left + bounds.width / 2;
  return [...surface.querySelectorAll<HTMLElement>(moduleSelector)]
    .filter(element => element.getClientRects().length && !element.parentElement?.closest(moduleSelector))
    .map(element => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight - 40)
    .map(({ element, rect }) => {
      const offset = rect.left + rect.width / 2 - middle;
      const direction = Math.abs(offset) > 12 ? Math.sign(offset) : 0;
      const available = direction < 0 ? rect.left : window.innerWidth - rect.right;
      const distance = Math.min(38, Math.max(0, available - 2));
      return { element, direction, distance };
    });
}

export function switchWorkspace(surface: HTMLElement | null, update: () => void) {
  for (const animation of navigationAnimations) animation.cancel();
  navigationAnimations = [];
  if (!surface?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }

  const outgoing = workspaceModules(surface).map(({ element, direction, distance }) => element.animate([
    { opacity: 1, translate: "0 0" },
    { opacity: 0, translate: direction ? `${direction * distance}px 0` : "0 -10px" },
  ], { duration: 145, easing: "ease-in", fill: "forwards" }));
  navigationAnimations = outgoing;
  void Promise.all(outgoing.map(animation => animation.finished)).then(() => {
    if (navigationAnimations !== outgoing || !surface.isConnected) return;
    flushSync(update);
    for (const animation of outgoing) animation.cancel();

    const incoming = workspaceModules(surface).map(({ element, direction }) => element.animate([
      { opacity: 0, translate: `${-direction * 22}px 0`, scale: .985 },
      { opacity: 1, translate: "0 0", scale: 1 },
    ], { duration: 355, easing: "ease-out" }));
    navigationAnimations = incoming;
    void Promise.allSettled(incoming.map(animation => animation.finished)).then(() => {
      if (navigationAnimations === incoming) navigationAnimations = [];
    });
  }, () => {});
}
