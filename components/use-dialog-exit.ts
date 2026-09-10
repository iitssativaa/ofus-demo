"use client";

import { useEffect, useRef, useState } from "react";

export function useDialogExit() {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const requestClose = (finish: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    setClosing(true);
    timer.current = setTimeout(finish, 200);
  };
  return { closing, requestClose };
}
