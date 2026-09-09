"use client";

import { useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";

export function Checkbox({ checked, indeterminate = false, onChange, disabled = false, ariaLabel, tone = "indigo" }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  tone?: "indigo" | "success";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate; }, [indeterminate]);
  const checkedTone = tone === "success"
    ? "border-emerald-500 bg-emerald-500"
    : "border-indigo-600 bg-indigo-600";
  return <span className="group relative inline-flex min-h-8 min-w-8 items-center justify-center rounded-md shrink-0">
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={indeterminate ? "mixed" : checked}
      onChange={(event) => onChange(event.target.checked)}
      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
    <span
      aria-hidden="true"
      className={`checkbox-mark flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition group-hover:border-indigo-400 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:border-slate-200 peer-disabled:bg-slate-100 peer-disabled:text-slate-400 peer-disabled:opacity-60 ${checked || indeterminate ? checkedTone : "border-slate-300 bg-white"}`}
    >{indeterminate ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}</span>
  </span>;
}
