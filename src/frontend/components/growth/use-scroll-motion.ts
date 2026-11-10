import { useLayoutEffect, type RefObject } from "react";

const targets = [
  ".g-card", ".g-metrics > article", ".og-metrics > div", ".og-card", ".g-panel",
  ".asset-table tbody tr", ".g-table tbody tr", ".asset-bars button", ".asset-legend button",
  ".asset-reps button", ".asset-customer-list button", ".og-empty", ".g-result-score",
  ".g-result-content", ".g-admission-loading", ".asset-trend-plot", ".asset-donut[data-populated]",
].join(", ");

export function useScrollMotion(root: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) return;
    const workspace = root.current;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observed = new Set<Element>();
    const viewport = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (observed.has(target)) target.setAttribute("data-in-view", String(isIntersecting));
      }
    }, { rootMargin: "-4px 0px -40px", threshold: 0 });

    function observe(element: Element) {
      if (!element.matches(targets) || observed.has(element)) return;
      observed.add(element);
      viewport.observe(element);
    }

    const changes = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "attributes") {
          const target = record.target as Element;
          if (target.hasAttribute("data-populated")) observe(target);
          else unobserve(target);
          continue;
        }
        for (const node of record.removedNodes) {
          if (!(node instanceof Element) || workspace.contains(node)) continue;
          unobserve(node);
          node.querySelectorAll(`${targets}, [data-in-view]`).forEach(unobserve);
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          observe(node);
          node.querySelectorAll(targets).forEach(observe);
        }
      }
    });

    function unobserve(target: Element) {
      if (!observed.delete(target)) return;
      viewport.unobserve(target);
      target.removeAttribute("data-in-view");
    }

    function applyPreference() {
      if (preference.matches) {
        changes.disconnect();
        viewport.disconnect();
        workspace.removeAttribute("data-scroll-motion");
        observed.forEach(target => target.removeAttribute("data-in-view"));
        observed.clear();
        return;
      }
      workspace.setAttribute("data-scroll-motion", "");
      workspace.querySelectorAll(targets).forEach(observe);
      changes.observe(workspace, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-populated"] });
    }

    applyPreference();
    preference.addEventListener("change", applyPreference);
    return () => {
      changes.disconnect();
      viewport.disconnect();
      observed.forEach(target => target.removeAttribute("data-in-view"));
      workspace.removeAttribute("data-scroll-motion");
      preference.removeEventListener("change", applyPreference);
    };
  }, [root]);
}
