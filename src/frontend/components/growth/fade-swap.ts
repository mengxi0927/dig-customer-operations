import { flushSync } from "react-dom";

const running = new WeakMap<HTMLElement, Animation>();
let workspaceMotion: { surface: HTMLElement; timer: number } | undefined;

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

export function switchWorkspace(surface: HTMLElement | null, update: (() => void) | null) {
  if (workspaceMotion) {
    window.clearTimeout(workspaceMotion.timer);
    workspaceMotion.surface.removeAttribute("data-workspace-motion");
    workspaceMotion = undefined;
  }
  if (!update) return;
  if (!surface || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }

  surface.dataset.workspaceMotion = "leave";
  workspaceMotion = { surface, timer: window.setTimeout(() => {
    if (!surface.isConnected) {
      workspaceMotion = undefined;
      return;
    }
    surface.dataset.workspaceMotion = "enter";
    update();
    workspaceMotion = { surface, timer: window.setTimeout(() => {
      surface.removeAttribute("data-workspace-motion");
      workspaceMotion = undefined;
    }, 280) };
  }, 75) };
}
