"use client";
import { useEffect, useRef } from "react";

/** Shared modal focus boundary; portalled selectors remain keyboard accessible. */
export function useDialogFocus(active: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const getDialogs = () => [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter((element) => !element.closest('[inert],[hidden],[aria-hidden="true"]') && element.getClientRects().length > 0);
    const dialogs = getDialogs();
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const isolated: { element: HTMLElement; inert: boolean; ariaHidden: string | null }[] = [];
    let branch: HTMLElement = dialog;
    while (branch.parentElement && branch !== document.body) {
      const parent = branch.parentElement;
      [...parent.children].forEach((sibling) => {
        if (!(sibling instanceof HTMLElement) || sibling === branch || sibling.matches("script,style,link,.ofus-toast-viewport")) return;
        isolated.push({ element: sibling, inert: sibling.hasAttribute("inert"), ariaHidden: sibling.getAttribute("aria-hidden") });
        sibling.setAttribute("inert", "");
        sibling.setAttribute("aria-hidden", "true");
      });
      branch = parent;
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector = 'input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),a[href],[tabindex="0"]';
    const visible = () => [...dialog.querySelectorAll<HTMLElement>(selector)].filter((element) => !element.closest('[inert],[hidden],[aria-hidden="true"]') && element.getClientRects().length > 0);
    const ownsOpenListbox = () => {
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!focused) return false;
      const controlling = dialog.contains(focused) && focused.getAttribute("role") === "combobox"
        ? focused
        : [...dialog.querySelectorAll<HTMLElement>('[role="combobox"][aria-expanded="true"][aria-controls]')]
          .find((control) => document.getElementById(control.getAttribute("aria-controls") ?? "")?.contains(focused));
      if (!controlling || controlling.getAttribute("aria-expanded") !== "true") return false;
      const listbox = document.getElementById(controlling.getAttribute("aria-controls") ?? "");
      return Boolean(listbox?.getAttribute("role") === "listbox" && !listbox.closest('[inert],[hidden],[aria-hidden="true"]') && listbox.getClientRects().length > 0);
    };
    (dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? dialog.querySelector<HTMLElement>('input:not([type="hidden"]),textarea') ?? visible()[0])?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (ownsOpenListbox()) return;
      const currentDialogs = getDialogs();
      if (currentDialogs[currentDialogs.length - 1] !== dialog) return;
      if (event.key === "Escape" && event.target instanceof Element && event.target.closest(".ofus-toast")) return;
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
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.body.style.overflow = overflow;
      isolated.forEach(({ element, inert, ariaHidden }) => {
        if (!element.isConnected) return;
        if (!inert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      if (opener?.isConnected && !opener.closest('[inert],[hidden],[aria-hidden="true"]') && opener.getClientRects().length > 0) opener.focus();
      else {
        const remaining = getDialogs().filter((candidate) => candidate !== dialog).at(-1);
        [...(remaining?.querySelectorAll<HTMLElement>(selector) ?? [])]
          .find((element) => !element.closest('[inert],[hidden],[aria-hidden="true"]') && element.getClientRects().length > 0)
          ?.focus();
      }
    };
  }, [active]);
}
