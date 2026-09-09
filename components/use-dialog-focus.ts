"use client";
import { useEffect, useRef } from "react";

/** Shared modal focus boundary; portalled selectors remain keyboard accessible. */
export function useDialogFocus(active: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const dialogs = document.querySelectorAll<HTMLElement>('[aria-modal="true"]');
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector = 'input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),a[href],[tabindex="0"]';
    const visible = () => [...dialog.querySelectorAll<HTMLElement>(selector)].filter((element) => element.getClientRects().length > 0);
    (dialog.querySelector<HTMLElement>('input:not([type="hidden"]),textarea') ?? visible()[0])?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="listbox"]')) return;
      const currentDialogs = document.querySelectorAll('[aria-modal="true"]');
      if (currentDialogs[currentDialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); dialog.querySelector<HTMLFormElement>("form")?.requestSubmit(); }
      if (event.key !== "Tab") return;
      const items = visible();
      const first = items[0], last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown, true);
    return () => { document.removeEventListener("keydown", keydown, true); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus(); };
  }, [active]);
}
