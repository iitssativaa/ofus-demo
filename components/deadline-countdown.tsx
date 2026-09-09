"use client";

import { useSyncExternalStore } from "react";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let currentTime = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function publishCurrentTime() {
  currentTime = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    currentTime = Date.now();
    timer = setInterval(publishCurrentTime, SECOND);
    window.addEventListener("focus", publishCurrentTime);
    document.addEventListener("visibilitychange", publishCurrentTime);
  }

  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener("focus", publishCurrentTime);
      document.removeEventListener("visibilitychange", publishCurrentTime);
    }
  };
}

const getSnapshot = () => currentTime;
const getServerSnapshot = () => 0;

export function formatRemainingTime(remainingMilliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMilliseconds / SECOND));
  const values = [
    { value: Math.floor(totalSeconds / 86_400), suffix: "g" },
    { value: Math.floor((totalSeconds % 86_400) / 3_600), suffix: "sa" },
    { value: Math.floor((totalSeconds % 3_600) / 60), suffix: "dk" },
    { value: totalSeconds % 60, suffix: "sn" },
  ];
  const firstVisibleUnit = values.findIndex((unit) => unit.value > 0);
  return values.slice(firstVisibleUnit === -1 ? values.length - 1 : firstVisibleUnit)
    .map((unit) => `${unit.value}${unit.suffix}`)
    .join(" ");
}

export function DeadlineCountdown({ dueAt, className = "" }: { dueAt?: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const deadline = dueAt ? Date.parse(dueAt) : Number.NaN;
  if (!Number.isFinite(deadline) || !now) return null;

  const overdue = deadline <= now;
  const remaining = Math.max(0, deadline - now);
  const tone = overdue || remaining < DAY
    ? "bg-rose-50 text-rose-600"
    : remaining <= 2 * DAY
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return <time
    dateTime={dueAt}
    className={`inline-flex rounded-md px-1.5 py-0.5 font-bold tabular-nums ${tone} ${className}`}
    title={overdue ? "Görevin süresi geçti" : "Görev son tarihine kalan süre"}
  >{overdue ? "SÜRESİ GEÇTİ" : formatRemainingTime(remaining)}</time>;
}

export function FutureCountdown({ dateTime, className = "" }: { dateTime: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = Date.parse(dateTime);
  if (!Number.isFinite(target) || !now || target <= now) return null;

  return <time dateTime={dateTime} className={`font-semibold tabular-nums text-slate-500 ${className}`}>
    {formatRemainingTime(target - now)} sonra
  </time>;
}
