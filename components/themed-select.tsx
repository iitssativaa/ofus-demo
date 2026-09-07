"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function ThemedSelect({ value, options, onValueChange, ariaLabel, className = "input", disabled = false, invalid = false }: {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  const showMenu = () => {
    if (disabled || !options.length) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = Math.min(options.length * 40 + 8, 256);
    const viewportPadding = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const top = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight
      ? rect.top - estimatedHeight - 4
      : rect.bottom + 4;
    setPosition({ top, left, width });
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  const move = (direction: 1 | -1) => {
    if (!options.length) return;
    let next = activeIndex;
    do { next = (next + direction + options.length) % options.length; }
    while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) showMenu();
      else move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else showMenu();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(options.findIndex((option) => !option.disabled));
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.findLastIndex((option) => !option.disabled));
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      onClick={() => open ? setOpen(false) : showMenu()}
      onKeyDown={handleKeyDown}
      className={`${className} themed-select-trigger relative flex items-center justify-between gap-2 text-left`}
    >
      <span className="min-w-0 truncate">{selected?.label ?? "Seçin"}</span>
      <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open ? createPortal(
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        className="themed-select-menu fixed z-[100] max-h-64 overflow-y-auto rounded-lg border p-1 shadow-xl"
        style={{ top: position.top, left: position.left, width: position.width }}
      >
        {options.map((option, index) => <button
          id={`${listboxId}-${index}`}
          key={option.value}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={option.value === value}
          disabled={option.disabled}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(index)}
          className={`themed-select-option flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-2.5 text-left text-xs font-semibold ${activeIndex === index ? "is-active" : ""} ${option.value === value ? "is-selected" : ""}`}
        >
          <span className="truncate">{option.label}</span>
          {option.value === value ? <Check size={14} className="shrink-0" /> : null}
        </button>)}
      </div>,
      document.body,
    ) : null}
  </>;
}
