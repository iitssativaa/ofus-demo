"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const BOX_PHASE_DURATION = 1000;
const BOX_DURATION = 700;
const EXIT_DURATION = 500;
const ENTRY_EASING = "cubic-bezier(0.33,0,0.2,1)";

function pageEntryTargets(root: HTMLElement) {
  const header = root.querySelector<HTMLElement>(".page-header");
  const panels = [...root.querySelectorAll<HTMLElement>(".panel")].filter(
    (panel) =>
      !panel.parentElement?.closest(".panel") &&
      !panel.closest('[hidden], [aria-hidden="true"]') &&
      !panel.classList.contains("ofus-detail-panel"),
  );

  return { header, panels };
}

export function PageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const entryAnimations: Animation[] = [];
    const prepared = new Set<string>();
    let cancelled = false;
    let entryAllowed = false;
    let entryStarted = false;
    let holdingAnimation: Animation | null = null;

    const completeEntry = () => {
      if (!cancelled && node.dataset.motionState === "entering") node.dataset.motionState = "complete";
    };

    const startEntry = () => {
      if (reduced.matches) {
        observer.disconnect();
        holdingAnimation?.cancel();
        holdingAnimation = null;
        node.dataset.motionState = "complete";
        return;
      }
      if (cancelled || entryStarted || !entryAllowed || node.querySelector("[data-page-motion-pending]")) return;
      entryStarted = true;
      observer.disconnect();
      holdingAnimation?.cancel();
      holdingAnimation = null;

      const { header, panels } = pageEntryTargets(node);
      const stagger = panels.length > 1 ? (BOX_PHASE_DURATION - BOX_DURATION) / (panels.length - 1) : 0;
      const duration = panels.length > 1 ? BOX_DURATION : BOX_PHASE_DURATION;
      const rise = (36 * document.documentElement.clientWidth) / 1980;
      const frames: Keyframe[] = [
        { opacity: 0, transform: `translate3d(0,${rise}px,0)` },
        { opacity: 1, transform: "translate3d(0,0,0)" },
      ];

      if (header) {
        const animation = header.animate(frames, { duration, easing: ENTRY_EASING, fill: "backwards" });
        entryAnimations.push(animation);
        animations.push(animation);
      }

      panels.forEach((panel, index) => {
        const animation = panel.animate(frames, {
          duration,
          delay: Math.round(index * stagger),
          easing: ENTRY_EASING,
          fill: "backwards",
        });
        entryAnimations.push(animation);
        animations.push(animation);
      });

      node.dataset.motionState = "entering";
      if (!entryAnimations.length) {
        completeEntry();
        return;
      }
      void Promise.allSettled(entryAnimations.map((animation) => animation.finished)).then(completeEntry);
    };

    const observer = new MutationObserver(startEntry);
    observer.observe(node, { childList: true, subtree: true });

    const run = async () => {
      if (reduced.matches) {
        node.dataset.motionState = "complete";
        observer.disconnect();
        return;
      }

      let fromAuthentication = false;
      try {
        const created = Number(sessionStorage.getItem("ofus.workspace-entry"));
        sessionStorage.removeItem("ofus.workspace-entry");
        fromAuthentication = created > 0 && Date.now() - created < 30000;
      } catch {
        // Motion never blocks authentication.
      }

      if (fromAuthentication) {
        const rail = document.querySelector<HTMLElement>(".ofus-rail");
        holdingAnimation = node.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 450, fill: "forwards" });
        animations.push(holdingAnimation);
        if (rail) {
          animations.push(
            rail.animate(
              [
                { opacity: 0, transform: "translateX(-110%)" },
                { opacity: 1, transform: "translateX(0)" },
              ],
              { duration: 450, easing: "cubic-bezier(.22,.61,.36,1)" },
            ),
          );
        }
        await holdingAnimation.finished.catch(() => undefined);
      }

      if (cancelled) return;
      entryAllowed = true;
      requestAnimationFrame(startEntry);
    };

    void run();

    const prefetch = (url: URL) => {
      const href = url.pathname + url.search;
      if (url.origin !== location.origin || url.pathname === pathname || prepared.has(href)) return;
      prepared.add(href);
      router.prefetch(href);
    };
    const prepare = (event: Event) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      prefetch(new URL(link.href));
    };
    let navigating = false;
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname === pathname) return;
      event.preventDefault();
      if (navigating) return;
      navigating = true;
      const href = url.pathname + url.search + url.hash;
      prefetch(url);
      entryAnimations.forEach((animation) => animation.cancel());
      node.dataset.motionState = "exiting";
      const fade = node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_DURATION, easing: "ease-in-out", fill: "forwards" });
      animations.push(fade);
      void fade.finished.catch(() => undefined).then(() => {
        if (!cancelled) router.push(href);
      });
    };
    document.addEventListener("pointerover", prepare, true);
    document.addEventListener("focusin", prepare, true);
    document.addEventListener("click", click, true);

    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      if (reduced.matches) node.dataset.motionState = "complete";
    };
    reduced.addEventListener("change", stop);
    return () => {
      cancelled = true;
      observer.disconnect();
      stop();
      reduced.removeEventListener("change", stop);
      document.removeEventListener("pointerover", prepare, true);
      document.removeEventListener("focusin", prepare, true);
      document.removeEventListener("click", click, true);
    };
  }, [pathname, router]);

  return (
    <div ref={root} key={pathname} className="ofus-page" data-motion-state="preparing">
      {children}
    </div>
  );
}
