"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useDialogFocus } from "./use-dialog-focus";

const subscribe = () => () => undefined;

export function DetailRouteFrame({ background, children, returnHref, label, width = "project" }: { background: ReactNode; children: ReactNode; returnHref: string; label: string; width?: "project" | "company" }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const exitAnimation = useRef<Animation | null>(null);
  const leave = useCallback(async (href: string) => {
    if (closing.current) return;
    closing.current = true;
    const current = dialog.current;
    current?.setAttribute("inert", "");
    current?.setAttribute("aria-busy", "true");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && current) {
      const animation = current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease", fill: "forwards" });
      exitAnimation.current = animation;
      await animation.finished.catch(() => undefined);
      if (exitAnimation.current !== animation) return;
    }
    if (!current?.isConnected) return;
    router.push(href);
  }, [router]);
  const close = () => leave(returnHref);
  useEffect(() => {
    closing.current = false;
    const current = dialog.current;
    exitAnimation.current?.cancel();
    exitAnimation.current = null;
    current?.removeAttribute("inert");
    current?.removeAttribute("aria-busy");
    return () => {
      exitAnimation.current?.cancel();
      exitAnimation.current = null;
      current?.removeAttribute("inert");
      current?.removeAttribute("aria-busy");
    };
  }, [pathname, returnHref]);
  useEffect(() => {
    const current = dialog.current;
    if (!ready || !current) return;
    const navigateInside = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || !current.contains(link) || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      void leave(url.pathname + url.search + url.hash);
    };
    current.addEventListener("click", navigateInside, true);
    return () => current.removeEventListener("click", navigateInside, true);
  }, [leave, ready]);
  useDialogFocus(ready, () => void close());
  return <><div inert aria-hidden="true">{background}</div>{ready ? createPortal(<div ref={dialog} className="ofus-route-dialog" role="dialog" aria-modal="true" aria-label={label}><button type="button" className="ofus-route-backdrop" onClick={() => void close()} aria-label={`${label} kapat`} /><section className="ofus-route-panel" data-detail-width={width}><button data-dialog-initial-focus className="icon-button ofus-route-close" type="button" onClick={() => void close()} aria-label="Kapat"><X size={20} /></button>{children}</section></div>, document.body) : null}</>;
}
