import { flushSync } from "react-dom";

const running = new WeakMap<HTMLElement, Animation>();

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
